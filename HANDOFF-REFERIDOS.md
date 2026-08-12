# Handoff — Referidos con seguimiento

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
La mayoría de los clientes buenos llegan recomendados por otro cliente bueno. Hoy no hay forma
de registrar quién refirió a quién, ni de darle seguimiento a esa cadena.

**Diagnóstico verificado en el código:** no existe ningún campo, tabla ni concepto de referido
en todo el proyecto. Se buscó `referido`, `referral`, `recomend` y `fuente` en `src/` y en las
migraciones — la única coincidencia fue la palabra "Recomendación" en `CrmTab.tsx:326`, que es
la etiqueta del resultado del scoring de riesgo (`aprobar/revisar/rechazar`), sin ninguna
relación con este trabajo. Es un feature nuevo de verdad, sin infraestructura rota que arreglar
antes — a diferencia de varios de los handoffs anteriores.

---

## Decisión de negocio que requiere confirmación de Lucius (no bloquea el desarrollo, pero sí el uso real)

**¿Hay una recompensa concreta por referir, y de qué tipo?** (descuento en su propia cuota,
efectivo, nada — solo reconocimiento). No se conoce todavía, así que este trabajo construye el
registro y el seguimiento completo, pero **no automatiza ningún pago ni descuento**. Cuando un
referido se convierte en cliente activo, el sistema deja la recompensa marcada como pendiente de
otorgar y notifica a `admin`/`gerente` para que decidan y la apliquen manualmente (Fase 2.2).
Automatizar el otorgamiento es un trabajo aparte, una vez que exista una política definida.

---

## Decisión de arquitectura

**El evento que cuenta como "referido exitoso" es cuando el referido llega a estado `activo`**
(crédito aprobado y financiamiento iniciado, momento en que `generateSchedule` genera sus
facturas) — no cuando se registra como prospecto. Es el mismo criterio que ya se usó en los
handoffs de comisiones y de recompra: se reconoce el resultado real, no el paso intermedio.
Contar cada prospecto que nunca compró como "referido exitoso" infla el número sin que
signifique nada para el negocio.

**El vínculo referente→referido vive en `clients`, como una autorreferencia.** Un cliente puede
haber sido referido por otro cliente ya existente en el sistema, o haber llegado por otra vía
(redes, publicidad, calle) — ambos casos deben poder registrarse, no solo el de referido.

**Las recompensas se registran en un ledger append-only**, igual que en
`HANDOFF-COMISIONES.md` y `HANDOFF-COMPROBANTES-PAGO.md`: cada entrada queda, nunca se borra ni
se sobrescribe; si se otorga la recompensa, se marca el momento y la descripción, sin editar el
registro original del evento.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- No automatices ningún pago, descuento o crédito real sin confirmación explícita — ver la
  sección de decisión de negocio arriba.
- No permitas que un cliente se refiera a sí mismo, ni por selección directa ni por cédulas que
  normalicen igual (reutiliza `normalizeCedula` de `HANDOFF-SCORING-HISTORIAL.md` si ya existe;
  si no, agrega una validación simple de que las cédulas no coincidan).

---

## Fase 1 — Base de datos

Crea `supabase/migrations/<timestamp>_00X_referrals.sql`.

### 1.1 Columnas en `clients`

```sql
alter table clients
  add column referred_by_client_id uuid references clients(id) on delete set null,
  add column referral_source text not null default 'otro'
        check (referral_source in ('cliente','redes_sociales','publicidad','calle','otro'));
```

`referral_source` se llena siempre; `referred_by_client_id` solo cuando `referral_source =
'cliente'`. Si en algún momento se quiere permitir referidos por personas que no son clientes
del sistema (por ejemplo, un empleado o un aliado externo), no lo agregues ahora — no se pidió
y no hay dato para modelarlo bien; queda como posible extensión futura.

`on delete set null`: si el cliente que refirió se borra de la base (caso raro, pero
`deleteClient` existe), el referido no debe perderse ni bloquear el borrado — solo pierde la
trazabilidad de quién lo trajo.

### 1.2 Ledger de recompensas

```sql
referral_rewards
  id uuid pk default gen_random_uuid()
  org_id uuid              -- o user_id si aún no aplicaste HANDOFF-MULTIUSUARIO
  referrer_client_id uuid not null references clients(id) on delete cascade
  referred_client_id uuid not null references clients(id) on delete cascade
  triggered_at timestamptz not null default now()   -- momento en que el referido llegó a 'activo'
  status text not null default 'pending'
        check (status in ('pending','granted','declined'))
  reward_description text
  granted_at timestamptz
  granted_by uuid references auth.users(id)
  notes text
  created_at timestamptz default now()

  unique (referred_client_id)   -- un referido solo genera una entrada, nunca duplicada
```

La restricción `unique` es la que evita que un reintento o una doble ejecución del trigger de
la Fase 2 genere dos recompensas por el mismo referido.

### 1.3 RLS

Mismo patrón que el resto del proyecto: lectura para todos los miembros con acceso a `crm`,
escritura de `status`/`granted_at`/`granted_by` restringida a `admin`/`gerente` — es dinero o
beneficio real, igual que las comisiones.

---

## Fase 2 — Lógica

### 2.1 Registrar el origen al crear un cliente

En `src/store.tsx`, dentro de `addClient`, persiste `referred_by_client_id` y
`referral_source` desde el formulario. Sin cambios de comportamiento adicionales aquí — solo
guardar el dato.

### 2.2 Disparar la recompensa pendiente cuando el referido se activa

En el punto donde un cliente pasa a `status: 'activo'` (dentro de `generateSchedule`,
`store.tsx:696-699`, donde ya se hace `clients: s.clients.map(...status: 'activo')`):

1. Si ese cliente tiene `referred_by_client_id` no nulo, inserta una fila en
   `referral_rewards` con `status: 'pending'` (la restricción `unique` de 1.2 evita duplicados
   si esto se llegara a ejecutar dos veces).
2. Genera una notificación para `admin`/`gerente`: "Referido activado — <referente> trajo a
   <referido>, recompensa pendiente de definir", con `link` a la vista de la Fase 3.2.
3. `logAudit('referral_activated', 'client', clientId, null, { referrerId })`.

Si `HANDOFF-ALERTA-RECOMPRA.md` ya está aplicado, este es el segundo lugar de la app donde se
engancha lógica al mismo evento de activación — revisa que ambos flujos convivan sin pisarse
(uno agrega la fila de recompra si aplica, el otro la de referido; no son excluyentes, un
cliente puede completar su propio préstamo y además haber referido a alguien más).

---

## Fase 3 — Interfaz

### 3.1 Formulario de cliente en `CrmTab.tsx`

Agrega un campo "¿Cómo llegó?" con las opciones de `referral_source`. Cuando se elige
`'cliente'`, muestra un buscador de clientes existentes (por nombre o cédula, con el mismo
patrón de búsqueda que ya use el formulario para otros campos, si existe alguno reutilizable) —
no un campo de texto libre, para no depender de que alguien escriba bien un nombre.

Excluye al propio cliente que se está creando/editando de los resultados de búsqueda (obvio si
es nuevo, pero verifica el caso de edición).

### 3.2 Nueva sección "Referidos" (puede vivir en `CrmTab.tsx` o como pestaña dentro de un
componente ya existente — no crees una pestaña nueva de nivel superior en `Sidebar.tsx` para
esto, es demasiado específico para justificar un ítem propio de navegación)

Muestra, por cada cliente que ha referido al menos a alguien: cuántos refirió, cuántos de esos
llegaron a `activo`, y el estado de la recompensa de cada uno (`pending` / `granted` /
`declined`). Con botones para que `admin`/`gerente` marquen una recompensa como otorgada
(con descripción y fecha) o la descarten con motivo — nunca borran la fila original.

### 3.3 Ranking de mejores referentes

Una lista simple, ordenada por número de referidos activados, siguiendo el mismo estilo visual
que ya usa `teamRanking` en `ReportesTab.tsx`. Es información valiosa por sí sola: identifica a
los clientes que más conviene cuidar, más allá de si generan o no una recompensa monetaria.

### 3.4 Ficha del cliente

En la vista de detalle de un cliente (`CrmTab.tsx`), si fue referido, muestra por quién, con un
enlace a la ficha del referente. Si él mismo ha referido a otros, muéstralo también — es
información de contexto útil para quien lo atiende.

---

## Fase 4 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Crear un cliente con `referral_source: 'cliente'` y un referente válido guarda ambos campos
   correctamente.
3. Intentar seleccionar al propio cliente como su referente (en edición) se bloquea en la
   interfaz.
4. Activar el financiamiento del referido (llega a `status: 'activo'`) genera exactamente una
   fila en `referral_rewards` con `status: 'pending'`, y una notificación para `admin`/`gerente`.
5. Repetir la activación (si el flujo se pudiera disparar dos veces) no duplica la fila —
   confirma que la restricción `unique (referred_client_id)` lo impide.
6. Marcar una recompensa como `granted` con descripción la refleja correctamente en la Fase 3.2,
   sin alterar `triggered_at` ni el resto de la fila original.
7. El ranking de referentes de la Fase 3.3 refleja los conteos correctos con datos de prueba de
   varios referidos, algunos activados y otros aún en `prospecto` (estos últimos no deben
   contar como "activados" en el ranking, aunque ya estén vinculados como referidos).

---

## Orden sugerido

Fase 1 → Fase 2 → verificar con datos de prueba antes de construir la interfaz → Fase 3 →
Fase 4.

---

## Relación con los otros handoffs

- `HANDOFF-ALERTA-RECOMPRA.md`: comparten el mismo punto de enganche (transición a `activo` /
  finalización de pago). Revisa que ambos convivan sin conflicto, como se indicó en la Fase 2.2.
- `HANDOFF-SCORING-HISTORIAL.md`: si ya está aplicado, reutiliza `normalizeCedula` para la
  validación de autorreferencia en vez de escribir una nueva.
- `HANDOFF-COBRANZA-WHATSAPP.md`: si ya está aplicado, la notificación de referido activado
  podría eventualmente disparar un mensaje de agradecimiento automático al referente — no lo
  implementes en este trabajo sin confirmarlo, es una extensión natural pero no lo pedido.
- `HANDOFF-MULTIUSUARIO.md`: si ya está aplicado, `referral_rewards` nace con `org_id`, y la
  restricción de que solo `admin`/`gerente` otorguen recompensas se resuelve por `role` real.
- `HANDOFF-ERRORES-Y-BACKUP.md` es prerrequisito general: si el registro de la recompensa
  pendiente falla en silencio, un referente que trajo un buen cliente puede quedar sin
  reconocimiento sin que nadie lo note.
