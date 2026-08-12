# Handoff — Registro de pagos con comprobante y conciliación

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Financiamiento de productos a cuotas, con cobro por pago móvil.

**Diagnóstico verificado en el código:**

1. `src/store.tsx:618-628` — `markInvoicePaid(id)` hace esto y nada más:
   ```ts
   await supabase.from('invoices').update({ status: 'pagada', paid_date: paidDate }).eq('id', id);
   ```
   Cualquiera con acceso al botón marca una cuota como pagada sin ninguna evidencia. Se dispara
   desde `src/components/FacturacionTab.tsx:128`, un botón `onPay` sin confirmación ni adjunto.
2. Ya existe infraestructura de archivos reutilizable: tabla `client_documents`
   (`storage_path`, `mime_type`, `size_bytes`) y el bucket de Storage `client-documents`
   (`src/store.tsx:928-945`, función `uploadDocument`). No hay que inventar el manejo de
   archivos, solo extenderlo a comprobantes de pago.
3. Ya existe `partial_payments` (`amount`, `payment_date`, `note`) para abonos parciales, sin
   ningún adjunto tampoco — mismo hueco.
4. `Invoice.status` es un enum cerrado: `'pagada' | 'pendiente' | 'vencida'`
   (`src/types.ts:249`). No hay estado intermedio.
5. `audit_log` ya registra acciones (`logAudit`), así que la trazabilidad de quién hizo qué
   ya tiene dónde apoyarse — falta que "marcar pagada" deje de ser una sola escritura.

**El problema real:** hoy no hay diferencia entre "el cliente pagó y lo confirmé" y "alguien
tocó un botón". Eso es tanto un hueco de auditoría (no puedes reconstruir qué pasó) como una
puerta abierta a fraude interno (un vendedor puede marcar cuotas como pagadas sin que el
dinero haya entrado).

---

## Decisión de arquitectura

**`markInvoicePaid` deja de existir tal como está.** Se reemplaza el flujo de un solo paso por
uno de dos pasos:

1. **Reportar pago** (cualquier rol con acceso a facturación) — el cliente o el agente suben un
   comprobante, la cuota pasa a un estado nuevo `por_conciliar`. El saldo sigue apareciendo como
   pendiente en los reportes: reportar no es cobrar.
2. **Conciliar** (rol `admin` o `gerente` únicamente) — alguien revisa el comprobante contra el
   estado de cuenta real y confirma o rechaza. Solo ahí la cuota pasa a `pagada`.

Esto separa a quien registra del que confirma. Es el control que hoy no existe.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **No rompas el flujo actual de `client_documents` / `uploadDocument`.** Reutilízalo o
  extiéndelo; no lo dupliques con una segunda implementación de subida de archivos.
- `markInvoicePaid` como función que cambia el estado directo a `pagada` sin evidencia debe
  desaparecer del store. Si algún componente la sigue llamando tras tu cambio, es una señal de
  que falta actualizarlo, no de que haya que dejar el atajo disponible "por si acaso".

---

## Fase 1 — Base de datos

Crea `supabase/migrations/<timestamp>_00X_payment_proof.sql`.
Verifica los nombres de columna reales en `supabase/migrations/` antes de escribirla.

### 1.1 Ampliar el enum de estado

```sql
alter table invoices
  drop constraint if exists invoices_status_check;
alter table invoices
  add constraint invoices_status_check
  check (status in ('pendiente','vencida','por_conciliar','pagada','rechazada'));
```

`rechazada` es necesario: si un comprobante resulta falso o inválido, la cuota vuelve a estar
pendiente pero con el registro de que hubo un intento fallido, no se pierde silenciosamente.

### 1.2 Tabla de comprobantes

```sql
payment_proofs
  id uuid pk default gen_random_uuid()
  org_id uuid             -- o user_id si aún no aplicaste HANDOFF-MULTIUSUARIO
  invoice_id uuid not null references invoices(id) on delete cascade
  partial_payment_id uuid references partial_payments(id) on delete cascade
  storage_path text not null
  mime_type text not null default ''
  size_bytes bigint not null default 0
  reported_amount numeric(20,2) not null
  reported_currency text default 'USD'   -- alinéalo con HANDOFF-MULTIMONEDA si ya se aplicó
  reported_at timestamptz not null default now()
  reported_by uuid not null references auth.users(id)
  status text not null default 'pendiente'
        check (status in ('pendiente','aprobado','rechazado'))
  reviewed_by uuid references auth.users(id)
  reviewed_at timestamptz
  review_note text
  created_at timestamptz default now()

  check (invoice_id is not null or partial_payment_id is not null)
```

Un comprobante siempre pertenece a una factura completa o a un abono parcial, nunca a ninguno
de los dos sueltos.

### 1.3 RLS

- `INSERT`: cualquier miembro autenticado de la org puede reportar un comprobante para una
  factura que le corresponda ver (mismo criterio que ya aplica sobre `invoices`).
- `UPDATE` de `status`, `reviewed_by`, `reviewed_at`, `review_note`: **solo** `admin` y
  `gerente`. Escríbelo como política separada de la de `SELECT`, no como una excepción dentro
  del mismo `UPDATE` genérico — si se cuela en la política general, cualquiera podría
  autoaprobarse su propio comprobante.
- `DELETE`: nadie. Si un comprobante se subió por error, se rechaza con nota, no se borra.
  Es evidencia.

### 1.4 Bucket de Storage

Reutiliza el bucket `client-documents` con una carpeta separada, o crea `payment-proofs` si
prefieres políticas de acceso distintas (por ejemplo, que un `vendedor` pueda subir pero no
listar los comprobantes de otros agentes). Decide y documenta la elección en un comentario al
inicio de la migración — no la dejes implícita en el código.

Ruta sugerida: `<org_id>/<client_id>/<invoice_id>/<timestamp>-<archivo>`.

### 1.5 Notificación automática

Trigger o lógica de aplicación (tu elección, documenta cuál) que, al insertar un
`payment_proof`, cree una fila en `notifications` dirigida a los roles `admin`/`gerente`:
"Nuevo comprobante por conciliar — <cliente>, $<monto>". Sin esto, un comprobante puede quedar
sin revisar días enteros porque nadie se entera de que llegó.

---

## Fase 2 — Store

### 2.1 Reemplazar `markInvoicePaid`

En `src/store.tsx`, donde hoy está `markInvoicePaid` (línea 618), divídela en:

```ts
reportPayment: (invoiceId: string, file: File, reportedAmount: number, currency?: 'USD'|'VES') => Promise<void>;
reviewPaymentProof: (proofId: string, decision: 'aprobado'|'rechazado', note?: string) => Promise<void>;
```

`reportPayment`:
- Sube el archivo al bucket (reutiliza el patrón de `uploadDocument`, línea 928-945: mismo
  manejo de `ext`, mismo `path` con timestamp para evitar colisiones).
- Inserta en `payment_proofs`.
- Actualiza `invoices.status` a `'por_conciliar'` — **no** a `'pagada'`.
- `logAudit('report_payment', 'invoice', invoiceId, null, { reportedAmount, status: 'por_conciliar' })`.

`reviewPaymentProof`:
- Solo debe poder ejecutarla `admin`/`gerente` — la UI lo restringe, pero la garantía real es
  la política RLS de 1.3. No confíes solo en ocultar el botón.
- Si `'aprobado'`: actualiza `payment_proofs.status`, pone `invoices.status = 'pagada'` y
  `paid_date`. Si el comprobante corresponde a un abono parcial, en vez de cerrar la factura,
  llama a la lógica existente de `addPartialPayment` con el monto reportado.
- Si `'rechazado'`: actualiza `payment_proofs.status`, `invoices.status = 'rechazada'`, y exige
  `review_note` con el motivo — no lo dejes opcional en este caso.
- `logAudit('review_payment', 'invoice', invoiceId, null, { decision, note })`.

### 2.2 Manejo de errores

Ambas funciones deben respetar el patrón ya establecido en el resto del store: `if (error)
throw error`, y dejar que el componente que llama muestre el toast. No agregues manejo de
errores nuevo aquí si `HANDOFF-ERRORES-Y-BACKUP.md` ya está aplicado — reutiliza `friendlyError`.

### 2.3 Mapper

Agrega `mapPaymentProof` junto a los demás mappers del store (`mapClient`, `mapDocument`, etc.,
cerca de la línea 140), siguiendo el mismo estilo de conversión `snake_case` → `camelCase`.

### 2.4 Estado y carga

Agrega `paymentProofs: PaymentProof[]` a `PersistState` y a la carga inicial (el bloque de las
13 queries en paralelo, ~línea 277), filtrado por `org_id`/`user_id` igual que las demás.

---

## Fase 3 — Frontend

### 3.1 `src/types.ts`

```ts
export type PaymentProofStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface PaymentProof {
  id: string;
  invoiceId: string;
  partialPaymentId: string | null;
  storagePath: string;
  mimeType: string;
  reportedAmount: number;
  reportedCurrency: 'USD' | 'VES';
  reportedAt: string;
  reportedBy: string;
  status: PaymentProofStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}
```

Actualiza `InvoiceStatus` (línea 249) para incluir `'por_conciliar'` y `'rechazada'`.

### 3.2 `src/components/FacturacionTab.tsx`

- El botón `onPay` de `InvoiceCard` (línea 166) deja de llamar directo a marcar pagada. Abre un
  modal: selector de archivo (usa el mismo componente/patrón que ya exista para subir
  documentos del cliente, si lo hay en `CrmTab.tsx`), campo de monto reportado, y moneda si
  `HANDOFF-MULTIMONEDA.md` ya está aplicado.
- Antes de subir, valida tipo de archivo (`image/*` o `application/pdf`) y tamaño máximo
  (sugerido: 10 MB). Rechaza en el cliente antes de gastar ancho de banda subiendo algo inválido.
- Estado visual nuevo para `'por_conciliar'`: un color distinto al de `'pendiente'` y al de
  `'pagada'` — no reutilices el mismo estilo o se vuelve invisible en la lista.
- Estado `'rechazada'` visible con el motivo del rechazo a la vista, sin tener que abrir nada más.

### 3.3 Nueva vista de conciliación

Solo visible para `admin`/`gerente` (usa el mismo mecanismo de permisos por rol que ya filtra
las pestañas en `Sidebar.tsx`). Puede ser una sección dentro de `FacturacionTab.tsx` o una
pestaña nueva — decide según cuánto volumen esperas; si va a ser de uso diario, mejor pestaña
propia.

Debe mostrar:
- Cola de comprobantes `pendiente`, con imagen/PDF visible sin tener que descargar.
- Datos de la factura junto al comprobante: cliente, monto esperado, monto reportado — para que
  el revisor note discrepancias sin ir a buscarlas.
- Botones aprobar / rechazar, con campo de nota obligatorio en el rechazo.

### 3.4 `src/components/CrmTab.tsx`

En la ficha del cliente, junto al historial de pagos, muestra el estado de sus comprobantes
pendientes. Alguien que atiende al cliente por teléfono necesita ver esto sin cambiar de pestaña.

### 3.5 Visor de comprobante

Un componente pequeño que abra el archivo desde `storage_path` (URL firmada de Supabase
Storage, igual que ya se debe hacer para `client_documents`) en un modal, con zoom para
capturas de pago móvil que suelen venir con letra chica.

---

## Fase 4 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Reportar un pago sube el archivo, crea la fila en `payment_proofs`, y la factura queda en
   `'por_conciliar'` — **no** en `'pagada'`.
3. Con un usuario de rol `vendedor`: puede reportar, pero un intento de aprobar/rechazar desde
   la consola del navegador (`supabase.from('payment_proofs').update(...)`) falla por RLS, no
   solo por estar oculto en la UI.
4. Aprobar un comprobante deja la factura en `'pagada'` con `paid_date` poblado y el registro
   en `audit_log`.
5. Rechazar sin `review_note` falla — el campo es obligatorio en ese camino.
6. Un intento de borrar un `payment_proof` (cualquier rol) falla por RLS.
7. Subir un archivo de tipo no permitido (por ejemplo `.exe`) se rechaza antes de llegar a
   Storage.
8. La notificación de "nuevo comprobante" le llega a `admin`/`gerente` al reportar un pago.
9. El reporte de cartera vencida sigue contando como pendiente una factura en `'por_conciliar'`
   — confirma que ningún reporte la trata como cobrada antes de tiempo.

---

## Orden sugerido

Fase 1 → 2.1 a 2.3 → 2.4 → 3.1 y 3.2 (reportar) → verificar el flujo de reporte de punta a
punta → 3.3 (conciliar) → 3.4 y 3.5.

No implementes la vista de conciliación (3.3) antes de haber probado que reportar (3.2) deja el
estado correcto — si el primer paso está mal, construir la revisión encima solo esconde el error.

---

## Relación con los otros handoffs

- `HANDOFF-ERRORES-Y-BACKUP.md` es prerrequisito: sin toasts, una subida fallida de comprobante
  pasa desapercibida y el cliente cree que reportó su pago cuando no.
- Si `HANDOFF-MULTIMONEDA.md` ya está aplicado, `reported_currency` y `reported_amount` deben
  seguir la misma convención (USD como moneda funcional) y el modal de reporte debe mostrar el
  equivalente en Bs a la tasa del día, igual que el resto de los formularios de pago.
- Si `HANDOFF-MULTIUSUARIO.md` ya está aplicado, la restricción de "solo admin/gerente concilia"
  se define por `role` de la `membership`, y `payment_proofs` nace con `org_id`.
- Si `HANDOFF-COBRANZA-WHATSAPP.md` ya está aplicado, un pago aprobado debe cancelar cualquier
  recordatorio pendiente en `dunning_log` para esa factura — revisa esa tabla al aprobar.
