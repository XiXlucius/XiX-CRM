# Handoff — Cobranza automatizada por WhatsApp

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Financiamiento de productos a cuotas. El objetivo es reducir la mora con recordatorios
automáticos, sin sumar personal.

**Diagnóstico verificado en el código:**

1. Existe `supabase/functions/send-whatsapp/index.ts`. Recibe `{ phone, message }`, registra en
   `audit_log` y envía por la Cloud API de Meta **si** están configuradas las variables
   `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID`. Si no lo están, devuelve un enlace `wa.me`.
2. Se dispara solo a mano, desde un botón por cliente en `CrmTab.tsx:803`.
3. `message_templates` ya existe (`name`, `channel`, `client_status`, `subject`, `body`).
4. Ya existe `applyLateFees()` en `src/store.tsx` y una tabla `late_fees`.
5. Hay tabla `notifications` y un `NotificationBell` funcionando.

---

## Cuatro bloqueos que hay que resolver antes de automatizar nada

Léelos completos antes de escribir código. Cualquiera de ellos, ignorado, hace que la
automatización falle en silencio o que Meta bloquee el número.

### A. El modo `wa.me` no sirve para automatizar

El enlace `wa.me` requiere que una persona lo abra en un navegador. Un cron no tiene navegador.
**La automatización exige `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` configurados.**

Si no están presentes, el trabajo programado no debe intentar enviar: debe crear una
notificación interna con la lista de clientes a contactar, para que alguien lo haga a mano.
Degradar así es correcto; fingir que envió, no.

### B. Meta no permite texto libre en mensajes iniciados por el negocio

La función actual envía `type: "text"`. Eso **solo** funciona dentro de la ventana de 24 horas
posterior a un mensaje del cliente. Un recordatorio de cobranza es un mensaje iniciado por el
negocio: fuera de esa ventana, la API lo rechaza.

Los mensajes automáticos tienen que usar **plantillas aprobadas por Meta** (`type: "template"`),
con nombre, idioma y parámetros:

```json
{
  "messaging_product": "whatsapp",
  "to": "<telefono>",
  "type": "template",
  "template": {
    "name": "recordatorio_cuota",
    "language": { "code": "es" },
    "components": [{
      "type": "body",
      "parameters": [
        { "type": "text", "text": "María" },
        { "type": "text", "text": "$45.00" },
        { "type": "text", "text": "15/08/2026" }
      ]
    }]
  }
}
```

Consecuencia práctica: `message_templates` (la tabla local) **no** es lo mismo que una plantilla
de Meta. Hay que mapear una con otra. Ver Fase 1.2.

**Las plantillas se aprueban en el panel de Meta, no desde el código.** Lucius tiene que crearlas
y esperar la aprobación antes de que esto funcione. Deja esa dependencia escrita en el README de
la función.

### C. El teléfono no se normaliza a formato internacional

La función hace `phone.replace(/[^0-9]/g, "")`. Un número venezolano guardado como `0412-1234567`
queda en `04121234567`, que la API rechaza: falta el código de país y sobra el cero inicial.
Lo correcto es `584121234567`.

Hay que normalizar de verdad: quitar el `0` inicial, anteponer `58` si no está, validar longitud.
Y **validar los números existentes en `clients` antes del primer envío masivo** — si la mitad
están mal formateados, te enteras por el reporte de fallos, no por un lote entero rebotado.

### D. Cada mensaje de plantilla se cobra

Los mensajes iniciados por el negocio tienen costo por conversación. Un bucle mal escrito que
reintente sin control es una factura. Todo envío pasa por el registro de la Fase 1.1, que además
es el que impide duplicados.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **No modifiques la lógica de cobro ni de mora.** Esta tarea solo comunica; no cambia saldos.
- Nada de envíos reales durante el desarrollo: implementa un modo simulación (Fase 4.1).

---

## Fase 1 — Base de datos

Crea `supabase/migrations/<timestamp>_00X_dunning.sql`.

### 1.1 Registro de envíos (el corazón del sistema)

```sql
dunning_log
  id uuid pk default gen_random_uuid()
  org_id uuid            -- o user_id si aún no aplicaste HANDOFF-MULTIUSUARIO
  client_id uuid not null references clients(id) on delete cascade
  invoice_id uuid not null references invoices(id) on delete cascade
  stage text not null    -- 'pre_3d' | 'due_0d' | 'late_1d' | 'late_7d' | 'late_15d'
  channel text not null default 'whatsapp'
  status text not null   -- 'pending' | 'sent' | 'failed' | 'skipped'
  skip_reason text
  template_name text
  message_body text
  provider_message_id text
  error_detail text
  scheduled_for timestamptz not null
  sent_at timestamptz
  created_at timestamptz default now()

  unique (invoice_id, stage)   -- ← la línea que impide enviar dos veces lo mismo
```

Esa restricción `unique` es la pieza más importante del archivo. Con ella, un cron que se
ejecute dos veces por error no molesta al cliente ni te cobra doble.

### 1.2 Mapeo con las plantillas de Meta

Agrega a `message_templates`:

```sql
  meta_template_name text        -- nombre aprobado en Meta
  meta_language text default 'es'
  stage text                     -- a qué etapa corresponde
  variable_order text[]          -- ej: ['first_name','amount','due_date']
  is_active boolean default true
```

`variable_order` define en qué orden se rellenan los parámetros del cuerpo. Sin eso, cambiar la
plantilla en Meta rompe los mensajes de forma silenciosa.

### 1.3 Preferencias de contacto

Agrega a `clients`:

```sql
  whatsapp_opt_out boolean not null default false
  opt_out_at timestamptz
  preferred_contact_hour int     -- 0-23, opcional
```

### 1.4 Configuración

Agrega a `business_settings`:

```sql
  dunning_enabled boolean not null default false   -- ← apagado por defecto, a propósito
  dunning_quiet_start int not null default 20      -- 8 pm
  dunning_quiet_end int not null default 8         -- 8 am
  dunning_max_per_run int not null default 200
  dunning_escalation_amount numeric(20,2) default 500  -- por encima de esto, interviene un humano
```

Que nazca apagado es deliberado: nadie debe descubrir que el sistema empezó a escribirle a sus
clientes sin haberlo activado.

---

## Fase 2 — La secuencia (mejorada respecto al plan original)

El plan inicial eran cuatro mensajes iguales en distintos días. Eso trata igual a quien se
olvidó y a quien no puede pagar, que son dos problemas distintos. La secuencia real:

| Etapa | Cuándo | Tono | Contenido |
|---|---|---|---|
| `pre_3d` | 3 días antes | Servicial | Monto, fecha, cómo pagar. Sin lenguaje de cobranza. |
| `due_0d` | Día de vencimiento | Recordatorio | Vence hoy, medios de pago. |
| `late_1d` | 1 día de mora | Cercano | Asume olvido. Ofrece confirmar si ya pagó. |
| `late_7d` | 7 días de mora | Formal | Menciona la mora acumulada y ofrece renegociar. |
| `late_15d` | 15 días de mora | **No se envía** | Crea tarea para un humano. Escala. |

Agregar `late_15d` como escalamiento humano importa: a los 15 días el problema ya no es que se
le olvidó. Un quinto mensaje automático solo consigue que te bloqueen el número.

### 2.1 Condiciones de exclusión (evaluar siempre antes de encolar)

Salta el envío, con `status = 'skipped'` y su `skip_reason`, cuando:

- La factura está pagada, o hay un `partial_payment` que la cubre por completo.
- El cliente tiene `whatsapp_opt_out = true`.
- El cliente está en estado `rechazado`.
- Existe una renegociación posterior a la emisión de la factura (`renegotiations`).
- Hubo una entrada en `bitacora_entries` con `outcome = 'compromiso'` en los últimos 3 días.
  Si ya se comprometió a pagar, otro mensaje automático sobra.
- El saldo supera `dunning_escalation_amount` **y** la etapa es `late_7d` → en vez de enviar,
  crea una notificación para el agente asignado.

Esa quinta condición es la que separa un sistema que ayuda de uno que molesta.

### 2.2 Segmentación por riesgo

`clients.risk_score` ya existe. Úsalo:

- Score alto (bajo riesgo): omite `pre_3d`. No hace falta perseguir a quien siempre paga.
- Score bajo (alto riesgo): mantén la secuencia completa y adelanta el escalamiento a `late_7d`.

### 2.3 Pagos parciales

Si la factura tiene abonos, el mensaje debe decir **el saldo restante**, no el monto original.
Recibir un recordatorio por el total después de haber abonado es la forma más rápida de perder
la confianza del cliente.

### 2.4 Horario y zona horaria

Venezuela es UTC-4. Supabase corre en UTC. **Convierte explícitamente**: un cron a las 12:00 UTC
son las 8:00 en Caracas.

Nunca envíes dentro de la franja `dunning_quiet_start`–`dunning_quiet_end`, ni domingos. Los
mensajes que caigan ahí se reprograman para la siguiente ventana hábil.

---

## Fase 3 — Edge Functions

### 3.1 Nueva `supabase/functions/dunning-scheduler/index.ts`

Corre una vez al día. Solo **planifica**, no envía:

1. Lee las facturas con estado pendiente o en mora.
2. Calcula qué etapa corresponde a cada una según los días respecto al vencimiento.
3. Evalúa las exclusiones de 2.1.
4. Inserta filas en `dunning_log` con `status = 'pending'` y su `scheduled_for`.
5. La restricción `unique (invoice_id, stage)` absorbe los duplicados. Usa
   `on conflict do nothing`.

Separar planificar de enviar permite revisar la cola antes de que salga, y hace que un fallo
en el envío no pierda la planificación.

### 3.2 Nueva `supabase/functions/dunning-sender/index.ts`

Corre cada hora dentro del horario permitido:

1. Toma hasta `dunning_max_per_run` filas `pending` cuyo `scheduled_for` ya pasó.
2. Vuelve a evaluar las exclusiones — entre la planificación y el envío el cliente pudo pagar.
   **Este segundo chequeo no es opcional.**
3. Resuelve la plantilla y sus variables.
4. Llama a la lógica de envío, marca `sent` o `failed` con su detalle.
5. Reintenta los `failed` una sola vez, al día siguiente. Nunca en bucle.

### 3.3 Modificar `send-whatsapp/index.ts`

Cambios mínimos, sin romper el uso manual actual:

- Acepta un modo plantilla: `{ phone, templateName, language, parameters[] }`, además del
  `{ phone, message }` de hoy.
- Extrae la normalización de teléfono a una función propia y arregla el bug del punto C.
- Devuelve el `provider_message_id` de Meta para poder rastrear el envío.
- Mantén intacto el modo `wa.me` para el botón manual de `CrmTab.tsx`.

### 3.4 Opcional — webhook de respuestas

`supabase/functions/whatsapp-webhook/index.ts` para recibir los callbacks de Meta:

- Estados de entrega (`delivered`, `read`, `failed`) → actualizan `dunning_log`.
- Respuestas del cliente → se registran en `bitacora_entries` con `channel = 'whatsapp'`.
- Si responde `STOP`, `BAJA` o `NO`, marca `whatsapp_opt_out = true`. **Esto no es opcional
  legalmente ni según las políticas de Meta**, aunque el webhook completo sí lo sea.

Saber quién leyó y quién respondió es lo que convierte esto en una herramienta de cobranza y no
en un altavoz.

---

## Fase 4 — Frontend

### 4.1 Modo simulación (impleméntalo primero)

Un interruptor que hace que todo el flujo se ejecute y escriba en `dunning_log` con
`status = 'skipped'`, `skip_reason = 'dry_run'`, **sin llamar a Meta**.

Con esto Lucius revisa exactamente a quién se le iba a escribir y qué decía, antes de que salga
un solo mensaje. Constrúyelo antes que la interfaz de configuración.

### 4.2 Nueva pestaña o sección "Cobranza"

- Cola de los próximos envíos programados, con opción de cancelar filas concretas.
- Historial: enviados, fallidos, omitidos y por qué.
- Métricas: tasa de entrega, tasa de respuesta, y mora antes/después de activar el sistema.

Sin esa última métrica no sabes si el sistema sirve.

### 4.3 `ConfigTab.tsx`

Activar/desactivar, horario permitido, monto de escalamiento, y el mapeo de cada etapa con su
plantilla de Meta.

### 4.4 `CrmTab.tsx`

En la ficha del cliente, muestra su historial de mensajes automáticos y un botón de
opt-out manual. El agente tiene que saber qué se le dijo antes de llamarlo.

---

## Fase 5 — Verificación

1. `npm run build` sin errores de TypeScript.
2. El botón manual de WhatsApp en `CrmTab.tsx` sigue funcionando igual que antes.
3. Normalización: `0412-1234567`, `412-1234567` y `+58 412 1234567` producen los tres
   `584121234567`.
4. Ejecutar el planificador dos veces seguidas **no** duplica filas en `dunning_log`.
5. Una factura pagada entre la planificación y el envío se marca `skipped`, no `sent`.
6. Un cliente con `opt_out` no recibe nada en ninguna etapa.
7. Una factura con abono parcial genera un mensaje con el **saldo restante**.
8. Un envío programado a las 22:00 hora de Caracas se reprograma, no se manda.
9. Con `dunning_enabled = false`, no ocurre absolutamente nada.
10. Sin `WHATSAPP_TOKEN` configurado, el sistema crea la notificación interna y no falla.
11. Modo simulación: la cola se llena y no sale ningún mensaje real.

---

## Orden sugerido

Fase 1 → 3.3 (arreglar normalización y modo plantilla) → 3.1 → 4.1 (simulación) →
verificar la cola con datos reales en simulación → 3.2 → 4.2 y 4.3 → 3.4.

**No actives `dunning_enabled` hasta que la simulación se haya revisado con datos reales.**

---

## Dependencias externas — para Lucius, no para el agente

Nada de esto se resuelve con código:

1. Cuenta de WhatsApp Business API con número verificado.
2. Crear y hacer aprobar en el panel de Meta las 4 plantillas (`pre_3d`, `due_0d`, `late_1d`,
   `late_7d`). La aprobación suele tardar de horas a días y puede ser rechazada.
3. Configurar `WHATSAPP_TOKEN` y `WHATSAPP_PHONE_ID` en Supabase.
4. Revisar los teléfonos de `clients`: los que estén mal formateados no van a recibir nada.
5. Decidir si informas a tus clientes de que van a recibir recordatorios automáticos.
   Recomendado: hacerlo, y ofrecer la baja desde el primer mensaje.

---

## Relación con los otros handoffs

- `HANDOFF-ERRORES-Y-BACKUP.md` es prerrequisito: sin toasts, un fallo de envío pasa
  desapercibido y crees que la cobranza está funcionando cuando no.
- Si ya aplicaste `HANDOFF-MULTIMONEDA.md`, los mensajes deben indicar el monto en USD **y** su
  equivalente en Bs a la tasa del día. Un cliente que recibe "$45" no sabe cuánto transferir.
- `HANDOFF-MULTIUSUARIO.md`: si ya está aplicado, `dunning_log` nace con `org_id` y las
  notificaciones de escalamiento van al agente asignado del cliente.
