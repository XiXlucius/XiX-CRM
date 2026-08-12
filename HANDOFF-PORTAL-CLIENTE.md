# Handoff — Portal del cliente (vista pública por enlace)

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Objetivo: que el cliente consulte su saldo, próxima cuota e historial por un enlace, sin
llamar. Cada consulta autoservida es una llamada que el negocio no tiene que atender.

**Diagnóstico verificado en el código — esto es lo que hace que este sea el handoff de mayor
riesgo de seguridad de todos los que se han hecho hasta ahora, léelo completo antes de tocar
código:**

1. **No hay router en el proyecto.** Cero rastro de `react-router` en `package.json`. La app
   entera vive dentro de un solo estado `activeTab` en `src/App.tsx`. La navegación pública
   debe seguir el mismo patrón que ya usa el proyecto para el reset de contraseña: parseo de
   parámetros de URL antes de decidir qué renderizar (`parseOobCode` en `App.tsx:26-36`). No
   agregues una librería de routing nueva para una sola pantalla pública.
2. **Todas las políticas RLS actuales son `TO authenticated`.** No existe ninguna política para
   el rol `anon`. Un cliente que abre un enlace sin iniciar sesión **no puede** consultar Supabase
   directo con el cliente anónimo — y no debe poder, porque las tablas de `clients` e `invoices`
   traen columnas que jamás deben salir en una vista pública: `cedula`, `monthly_income`,
   `risk_score`, `assigned_agent`, dirección completa, email. **La vista pública tiene que pasar
   obligatoriamente por una Edge Function** que use la service role key y devuelva un objeto
   armado a mano con solo los campos permitidos — nunca `select('*')` reexpuesto.
3. **El enlace no puede llevar el `id` real del cliente ni su cédula.** Ambos son adivinables o
   se filtran fácil (la cédula, por ejemplo, ya circula por WhatsApp con el agente). El acceso
   tiene que basarse en un token aleatorio, largo, no secuencial, generado por el servidor —
   nunca en un identificador que ya existe en otro lugar del sistema.
4. **El enlace se va a reenviar.** Es WhatsApp: el cliente se lo puede pasar a un familiar, o
   quedar en un chat grupal por error. Un token por sí solo no basta para datos financieros —
   hace falta un segundo factor liviano (ver Fase 1.3).

---

## Decisión de arquitectura

**Portal de solo lectura, sin cuenta de usuario para el cliente.** No se le crea un login a
cada cliente — sería sumar autenticación real para gente que en su mayoría no la quiere ni la va
a usar bien. En su lugar: un token de acceso largo y aleatorio por cliente, más un segundo factor
corto (últimos 4 dígitos de la cédula) que el cliente sí recuerda de memoria y que evita que
cualquiera con el enlace reenviado entre sin más.

**Toda la lectura pasa por una Edge Function**, nunca por el cliente de Supabase directo con rol
`anon`. Es la única forma de controlar exactamente qué campos salen.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **Ningún dato sensible sale del backend salvo lo explícitamente listado en la Fase 2.2.**
  Ante la duda de si un campo debe mostrarse, no lo muestres y pregúntale a Lucius.
- No agregues `react-router` ni ninguna librería de routing.
- No expongas la `service_role key` en el frontend bajo ninguna circunstancia — vive solo
  dentro de la Edge Function, como ya ocurre en `send-whatsapp/index.ts`.

---

## Fase 1 — Base de datos

Crea `supabase/migrations/<timestamp>_00X_client_portal.sql`.
Verifica los nombres de columna reales en `supabase/migrations/` antes de escribirla.

### 1.1 Token de acceso

```sql
alter table clients
  add column portal_token text unique,
  add column portal_token_created_at timestamptz,
  add column portal_enabled boolean not null default true;
```

- `portal_token`: generado con `gen_random_uuid()` más un sufijo aleatorio, o mejor,
  `encode(gen_random_bytes(24), 'base64url')` si está disponible — más largo y sin los guiones
  predecibles de un UUID. Nunca lo derives de la cédula, el nombre o el `id` del cliente.
- Poblar el token de los clientes existentes en la misma migración, con un `UPDATE` que use la
  función elegida, para que el backfill no quede pendiente de un segundo paso manual.
- `portal_enabled`: permite desactivar el acceso de un cliente puntual (por ejemplo, si hay
  sospecha de que el enlace se filtró) sin borrar el token ni afectar a los demás.

### 1.2 Registro de accesos

```sql
portal_access_log
  id uuid pk default gen_random_uuid()
  client_id uuid not null references clients(id) on delete cascade
  accessed_at timestamptz not null default now()
  ip_hash text            -- hash, nunca la IP en crudo
  success boolean not null
  failure_reason text     -- 'bad_token' | 'bad_verification' | 'disabled' | 'rate_limited'
```

Sin este registro, si el enlace de alguien se filtra, no hay manera de saberlo ni de reconstruir
quién entró y cuándo. Regístralo tanto en los intentos exitosos como en los fallidos — los
fallidos son la señal de que alguien está probando tokens o el segundo factor a ciegas.

### 1.3 RLS

- `clients.portal_token` y las tablas de solo lectura del portal (facturas, pagos parciales)
  **no** necesitan una política nueva para `anon`, porque el acceso no pasa por ahí — pasa por
  la Edge Function con service role, que ignora RLS por diseño. No abras una rendija de `anon`
  en estas tablas solo para este caso; sería reintroducir el problema del punto 2 del
  diagnóstico.
- `portal_access_log`: `INSERT` únicamente desde la Edge Function (service role). `SELECT` solo
  para `admin`/`gerente` desde la app autenticada — es información de auditoría, no de cliente.

---

## Fase 2 — Edge Function

### 2.1 Nueva `supabase/functions/client-portal/index.ts`

Recibe `{ token, verification }` donde `verification` son los últimos 4 dígitos de la cédula.

Flujo:

1. **Rate limiting.** Antes de tocar la base de datos, limita intentos por token y por IP
   (hashea la IP con un salt fijo del proyecto, no la guardes en crudo — ver 1.2). Sugerido:
   máximo 10 intentos por token cada 15 minutos. Sin esto, el segundo factor de 4 dígitos se
   puede fuerza-bruta en segundos (son solo 10.000 combinaciones).
2. Busca el cliente por `portal_token`. Si no existe o `portal_enabled = false`, responde
   genérico ("enlace no válido") — nunca reveles si el token existe pero el segundo factor
   falló, porque eso le dice a un atacante que va por buen camino.
3. Compara `verification` contra los últimos 4 dígitos reales de `cedula`. Si no coincide,
   registra el intento fallido en `portal_access_log` y responde el mismo mensaje genérico del
   paso anterior.
4. Si todo coincide, arma la respuesta **a mano**, campo por campo (ver 2.2) — nunca reenvíes
   la fila completa de `clients` ni de `invoices`.
5. Registra el acceso exitoso en `portal_access_log`.

### 2.2 Lista blanca de campos — esto es lo único que el portal puede devolver

**Del cliente:**
- Primer nombre (no el nombre completo — para el saludo; nombre completo si Lucius prefiere,
  pero decídelo con él, no por defecto).
- Producto financiado.
- Estado del financiamiento (`activo`, `en_mora`, etc., en lenguaje llano, no el valor crudo
  del enum).

**Explícitamente fuera del portal, salvo que Lucius lo pida después:** cédula completa,
teléfono, email, dirección, `monthlyIncome`, `riskScore`, `assignedAgent`,
`employmentTenure`, cualquier dato de otro cliente.

**De facturas (`invoices`), filtradas por ese `client_id` únicamente:**
- Saldo total pendiente (suma de las no pagadas, ya restando abonos parciales si
  `HANDOFF-COMPROBANTES-PAGO.md` está aplicado).
- Próxima cuota: monto y fecha de vencimiento.
- Historial: lista de cuotas con fecha, monto y estado (pagada / pendiente / vencida), sin
  exponer el `id` interno de la factura si no hace falta para nada en el frontend.

**Nunca:** notas internas (`BitacoraEntry.note`), auditoría, ni nada de otro cliente.

### 2.3 Enlace de contacto

Incluye en la respuesta un teléfono o enlace de WhatsApp del negocio para que el cliente pueda
escribir si algo no cuadra — el portal reemplaza consultas rutinarias, no el soporte real.

---

## Fase 3 — Frontend

### 3.1 Extender el parseo de URL en `src/App.tsx`

Junto a `parseOobCode` (línea 26), agrega una función equivalente para detectar
`?portal=<token>` en la query string. Si está presente, renderiza el portal en vez del flujo de
login/app normal — mismo patrón que ya usa el `oob` de reset de contraseña.

**No mezcles esta rama con `AuthProvider`.** El portal no necesita sesión de Supabase Auth; que
quede fuera de `<AuthProvider>` en el árbol de componentes, o al menos no dependa de `useAuth()`.

### 3.2 Nuevo `src/components/ClientPortalScreen.tsx`

- Pantalla de verificación: pide los últimos 4 dígitos de la cédula antes de mostrar nada. Sin
  eso, el token solo ya alcanzaría con tenerlo, y ya se explicó por qué eso no basta (punto 4
  del diagnóstico).
- Vista de resultado: saldo total, próxima cuota destacada arriba de todo (es lo que el cliente
  viene a buscar en el 90% de los casos), historial de cuotas debajo.
- Mobile-first — el cliente lo va a abrir desde WhatsApp en su teléfono, no desde una
  computadora. Si `HANDOFF-RESPONSIVE.md` ya está aplicado, reutiliza sus mismos componentes de
  tarjeta en vez de crear un estilo nuevo.
- Sin ningún dato del negocio visible más allá de lo estrictamente necesario para que el
  cliente entienda qué está viendo — nada de menús, nada de navegación al resto del CRM.
- Mensaje de error genérico y neutral si el token o la verificación fallan — no reveles cuál de
  los dos fue.

### 3.3 Generar y compartir el enlace, desde `CrmTab.tsx`

En la ficha del cliente, un botón "Copiar enlace del portal" que arme la URL con el
`portal_token` ya existente (no genera uno nuevo cada vez — el token es estable salvo que se
regenere a propósito, ver 3.4). Si `sendWhatsApp` ya existe en el store, ofrece un botón
adicional para enviarlo directo por WhatsApp con un mensaje corto.

### 3.4 Regenerar el token

Un botón, visible solo para `admin`/`gerente`, para invalidar el token actual y generar uno
nuevo — para el caso de que un cliente reporte que el enlace se filtró. Al regenerar, el enlace
viejo debe dejar de funcionar de inmediato.

---

## Fase 4 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Un token válido con el segundo factor correcto muestra exactamente los campos de la lista
   blanca de 2.2 — nada más. Verifícalo inspeccionando la respuesta cruda de la Edge Function,
   no solo lo que renderiza la pantalla.
3. Un token válido con el segundo factor incorrecto no muestra ningún dato, y el mensaje de
   error es idéntico al de un token inválido.
4. Después de 10 intentos fallidos seguidos sobre el mismo token, el siguiente intento se
   bloquea por rate limit, sin importar si el segundo factor esa vez es correcto.
5. Un cliente con `portal_enabled = false` no puede entrar aunque el token y la verificación
   sean correctos.
6. Regenerar el token invalida el enlace anterior de inmediato — pruébalo con el enlace viejo
   abierto en otra pestaña.
7. Inspecciona las llamadas de red del portal en el navegador: **la `service_role key` no debe
   aparecer en ningún lado del bundle ni de las respuestas.**
8. `portal_access_log` registra tanto el intento exitoso como los fallidos previos, con
   `failure_reason` correcto en cada uno.
9. El resto de la app (login normal, reset de contraseña) sigue funcionando sin cambios —
   confirma que el parseo nuevo de `?portal=` no interfiere con `parseOobCode`.

---

## Orden sugerido

Fase 1 → Fase 2 (probar la Edge Function con `curl` antes de tocar el frontend, confirmando a
mano que la lista blanca se respeta) → Fase 3.1 y 3.2 → Fase 3.3 → Fase 3.4.

No conectes el frontend hasta haber verificado la Fase 2 de forma aislada — es la pieza que
decide qué datos pueden salir, y un error ahí es el más caro de los que puede tener este
proyecto.

---

## Relación con los otros handoffs

- `HANDOFF-ERRORES-Y-BACKUP.md` es prerrequisito para el resto de la app, pero el portal en sí
  no depende de él — es una pantalla nueva, aislada, con sus propios mensajes de error.
- Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, el saldo debe descontar los abonos con
  comprobante `aprobado` únicamente — nunca los `pendiente` de conciliar, para no mostrarle al
  cliente un saldo más bajo del que realmente tiene.
- Si `HANDOFF-MULTIMONEDA.md` ya está aplicado, muestra el saldo en USD y, si Lucius lo pide,
  el equivalente en Bs con la tasa y fecha usadas — igual que en el resto del sistema.
- Si `HANDOFF-COBRANZA-WHATSAPP.md` ya está aplicado, el enlace del portal puede incluirse
  directamente en las plantillas de recordatorio, para que el cliente resuelva la duda sin
  responder el mensaje.
- Si `HANDOFF-MULTIUSUARIO.md` ya está aplicado, la Edge Function debe validar que el cliente
  pertenece a la organización correcta antes de responder, aunque el token ya sea único
  globalmente — es una capa adicional, no un reemplazo del token.
