# Handoff — Multiusuario real + roles en el servidor

## Contexto del proyecto

CRM `xixtech-crm`. Stack: Vite + React 19 + TypeScript + Tailwind + Supabase.
Estado actual: cada usuario es una isla. Todas las tablas tienen `user_id uuid DEFAULT auth.uid()`
y las políticas RLS son `auth.uid() = user_id`. Los "miembros del equipo" son solo filas en
`team_members`, sin login propio. El rol (`admin | gerente | supervisor | vendedor`) vive en el
estado del cliente (`src/store.tsx`) y solo filtra pestañas en `src/components/Sidebar.tsx`;
cualquiera puede cambiarlo desde la consola del navegador.

**Objetivo:** convertirlo en multiusuario por organización, con permisos aplicados en la base de datos.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- No refactorices lo que no forma parte de esta tarea.
- No borres datos existentes: la migración debe ser **retrocompatible**.
- Antes de escribir cada migración, verifica los nombres de columna reales en
  `supabase/migrations/` en vez de asumirlos.

---

## Tablas afectadas (14)

```
clients            bitacora_entries   team_members       invoices
products           course_progress    notifications      audit_log
business_settings  client_documents   message_templates  partial_payments
renegotiations     late_fees
```

---

## Fase 1 — Migración de base de datos

Crea `supabase/migrations/<timestamp>_003_multi_tenant.sql`:

**1.1 Tablas nuevas**

```sql
organizations
  id uuid pk default gen_random_uuid()
  name text not null
  owner_id uuid not null references auth.users(id)
  created_at timestamptz default now()

memberships
  id uuid pk default gen_random_uuid()
  org_id uuid not null references organizations(id) on delete cascade
  user_id uuid not null references auth.users(id) on delete cascade
  role text not null check (role in ('admin','gerente','supervisor','vendedor'))
  active boolean not null default true
  created_at timestamptz default now()
  unique (org_id, user_id)

invitations
  id uuid pk default gen_random_uuid()
  org_id uuid not null references organizations(id) on delete cascade
  email text not null
  role text not null check (role in ('admin','gerente','supervisor','vendedor'))
  token text not null unique
  accepted_at timestamptz
  expires_at timestamptz not null default now() + interval '7 days'
  created_by uuid not null references auth.users(id)
  created_at timestamptz default now()
```

**1.2 Funciones helper** (`security definer`, `set search_path = public`, marcadas `stable`)

```sql
current_org_id() returns uuid
  -- org activa del usuario; si tiene una sola membresía activa, esa

user_role(p_org uuid) returns text
  -- rol del usuario en esa org, null si no es miembro

has_permission(p_org uuid, p_perm text) returns boolean
  -- consulta role_permissions
```

**1.3 Tabla de permisos** — replica lo que hoy está hardcodeado en `src/data.ts`:

```sql
role_permissions (role text, permission text, primary key (role, permission))
```

Valores iniciales (léelos de `src/data.ts` para no inventarlos):
- `admin` → todos
- `gerente` → dashboard, crm, equipo, facturacion, inventario, reportes
- `supervisor` → dashboard, crm, facturacion, playbook, auditoria
- `vendedor` → dashboard, crm, courses, playbook, facturacion

**1.4 Backfill (crítico — no perder datos)**

Para cada `user_id` distinto que exista hoy en `clients`:
1. Crear una `organization` con `owner_id = user_id`, nombre `'Mi organización'`.
2. Crear su `membership` con rol `admin`.
3. Añadir `org_id uuid` a las 14 tablas y poblarlo con la org de su `user_id`.
4. Recién entonces poner `org_id NOT NULL` e indexarlo.

Mantén `user_id` en todas las tablas — pasa a significar "quién creó el registro", útil para
auditoría y para la regla de `vendedor` más abajo.

**1.5 Reemplazar las políticas RLS**

Elimina las políticas `*_own_*` y crea, por tabla, políticas basadas en org + permiso:

- `SELECT`: `org_id = current_org_id() AND has_permission(org_id, '<perm>')`
- `INSERT` / `UPDATE` / `DELETE`: igual, más las restricciones de rol de abajo.

Reglas de negocio adicionales:
- `vendedor` solo ve y edita clientes donde `assigned_agent` corresponde a su membresía;
  no puede `DELETE` clientes.
- `supervisor` puede leer todo, pero no borrar ni tocar `business_settings`.
- `gerente` puede todo excepto gestionar `memberships` e `invitations`.
- Solo `admin` administra `memberships`, `invitations` y `business_settings`.
- `audit_log`: `INSERT` para todos los miembros, `SELECT` solo con permiso `auditoria`,
  sin `UPDATE` ni `DELETE` para nadie.

**1.6 Storage**

`client_documents` usa Supabase Storage. Actualiza las políticas del bucket para que la ruta
sea `<org_id>/<client_id>/<archivo>` y valida pertenencia a la org, no `auth.uid()`.

---

## Fase 2 — Edge Functions

Nueva función `supabase/functions/invite-member/index.ts`:
- Recibe `{ email, role }`, valida con service role que quien llama sea `admin` de la org.
- Genera token, inserta en `invitations`, envía el correo.

Nueva función `supabase/functions/accept-invitation/index.ts`:
- Recibe `{ token }`, valida vigencia, crea la `membership`, marca `accepted_at`.

Ninguna de las dos debe confiar en datos de rol enviados por el cliente.

---

## Fase 3 — Frontend

**3.1 `src/lib/supabase.ts`** — sin cambios salvo que necesites tipos generados.

**3.2 Nuevo `src/context/OrgContext.tsx`**
- Carga las membresías del usuario al iniciar sesión.
- Expone `{ orgId, role, permissions, memberships, switchOrg, loading }`.
- Persiste la org activa en `localStorage`.
- Si el usuario no tiene ninguna org, muestra pantalla de onboarding (crear org o pegar token de invitación).

**3.3 `src/store.tsx`**
- Elimina `setRole` del store: el rol ahora es de solo lectura y viene de `OrgContext`.
- En las 13 queries de carga inicial, cambia `.eq('user_id', uid)` por `.eq('org_id', orgId)`.
- En todos los `insert`, añade `org_id`.
- **Importante:** no confíes en que RLS filtre silenciosamente. Maneja el `error` de cada
  operación y propágalo — hoy hay ~10 `error` que se descartan.

**3.4 `src/components/Sidebar.tsx`**
- Los permisos ahora vienen de `OrgContext`, no de `data.ts`.

**3.5 `src/components/ConfigTab.tsx`**
- El selector de rol deja de ser un cambiador libre. Solo `admin` puede cambiar roles,
  y hacerlo llama a un update de `memberships` (protegido por RLS).

**3.6 `src/components/EquipoTab.tsx`**
- Pasa de gestionar filas de `team_members` a gestionar `memberships` reales:
  invitar por correo, cambiar rol, desactivar.
- Decide qué hacer con `team_members`: o la vinculas a `memberships` vía
  `membership_id` nullable, o la mantienes para agentes sin login. Documenta la decisión.

**3.7 `src/data.ts`**
- `ROLES` se queda solo como metadatos de presentación (nombre, color, iniciales).
- El array `permissions` de cada rol sale de la base de datos.

---

## Fase 4 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Crear dos usuarios en dos orgs distintas y confirmar que ninguno ve datos del otro.
3. Con un usuario `vendedor`, intentar desde la consola del navegador:
   - `supabase.from('clients').delete().eq('id', ...)` → debe fallar por RLS.
   - Leer un cliente asignado a otro agente → debe devolver vacío.
4. Confirmar que un usuario preexistente conserva **todos** sus datos tras la migración.
5. Confirmar que cambiar el rol en el estado de React **no** desbloquea nada en el servidor.

---

## Orden sugerido de ejecución

Fase 1 completa y verificada → Fase 3.2 y 3.3 (para que la app siga funcionando) →
Fase 2 → resto de Fase 3 → Fase 4.

No pases de fase sin que la anterior compile y corra.
