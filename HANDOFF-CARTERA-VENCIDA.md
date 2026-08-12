# Handoff — Cartera vencida por antigüedad (aging estándar)

## Contexto

CRM `xixtech-crm`. Vite + React 19 + TypeScript + Tailwind + Supabase.
Financiamiento de productos a cuotas. Se pidió el reporte estándar de cualquier financiera:
cuánto hay en 1-30, 31-60, 61-90 y +90 días de atraso.

**Diagnóstico verificado en el código — hay un hallazgo que cambia todo el trabajo, léelo
primero:**

### El hallazgo: `status: 'vencida'` nunca se asigna en ningún lugar del sistema

Ya existe un reporte de "Aging de cartera" en `src/components/ReportesTab.tsx:72-87` y
`188-249`. Se ve terminado y funcional. **Pero está calculando sobre un conjunto que
probablemente siempre está vacío o casi vacío**, por lo siguiente:

- `generateSchedule` (`src/store.tsx:650-699`) crea **todas** las facturas con
  `status: 'pendiente'` (líneas 674 y 688), sin excepción.
- Se rastreó cada aparición de la palabra `'vencida'` en `src/`, en `supabase/migrations/*.sql`
  y en `supabase/functions/`. **En ningún lugar del código hay una asignación que ponga el
  estado de una factura en `'vencida'`.** Todas las apariciones son *lecturas*
  (`status === 'vencida'`) en el aging actual, en `refreshAlerts` (`store.tsx:837`), en el
  filtro "Vencidas" de `FacturacionTab.tsx`, en `CobrosCalendar.tsx`, y — el más grave —
  en `applyLateFees` (`store.tsx:1043`, `if (inv.status !== 'vencida') continue`), que es la
  función que aplica los cargos por mora automáticos.
- Consecuencia directa: si nadie cambia el estado a mano, una factura que venció hace 90 días
  sigue viéndose como `'pendiente'` para siempre. El aging actual, las alertas de vencimiento,
  el filtro de facturas vencidas y **la mora automática de $4/semana que el sistema dice que
  aplica solo (`ReportesTab.tsx:344`) probablemente nunca se ha disparado sobre nada**, porque
  todos filtran por un estado que nunca llega a existir.

**Esto no es un efecto secundario menor del trabajo pedido — es la causa raíz de por qué el
reporte de cartera vencida, aunque ya está construido, no sirve.** Arreglarlo es el primer paso
obligatorio, no un extra.

### Segundo hallazgo: los buckets actuales no son el estándar que se pidió

El aging de hoy usa `0-7 / 8-15 / 16-30 / 31-60 / 61+` (`ReportesTab.tsx:75-79`). El estándar
de la industria — y lo que se pidió explícitamente — es `1-30 / 31-60 / 61-90 / 90+`, con un
bucket adicional de "corriente" (aún no vencido) para dar contexto de qué tan sana está el
resto de la cartera frente a lo vencido.

### Tercer hallazgo: el monto usado es el de la factura completa, no el saldo real

El aging actual suma `inv.amount` completo por factura (`ReportesTab.tsx:84`). Si esa factura
ya tiene abonos parciales registrados en `partial_payments` (la tabla existe y ya se carga en
`ReportesTab.tsx:47`, `totalPartial` se calcula en la línea 69 pero **no se resta por
factura**), el reporte sobreestima cuánto debe cada cliente. Una cartera "enferma" que en
realidad tiene abonos parciales importantes se ve peor de lo que está.

---

## Decisión de arquitectura

**Se corrige el reporte existente, no se construye uno nuevo desde cero.** El componente, los
imports de Recharts, el patrón de `useMemo` y el estilo visual ya están bien encaminados —
el problema es el insumo (estado nunca actualizado) y la definición de los buckets.

**El estado de "vencida" se calcula de forma derivada, no se escribe en la base de datos por un
cron.** En vez de crear un job que actualice `invoices.status` en Supabase (lo que implica
sincronizar estado mutable con el paso del tiempo y arriesga desincronías), se calcula al vuelo:
una factura es "vencida" si su estado guardado es `'pendiente'` **y** su `dueDate` ya pasó. Esto
es más simple, no requiere infraestructura nueva, y es consistente con cómo ya se cargan los
datos en este proyecto (todo en el cliente, `store.tsx:275-289`).

**Alcance de la corrección del estado: solo el reporte de aging usa la función derivada en este
trabajo.** `applyLateFees`, `refreshAlerts` y el filtro de `FacturacionTab.tsx` tienen el mismo
bug de raíz, pero cambiarlos también significa que el sistema empezaría a cobrar moras
automáticas que hoy nunca se disparan — es un cambio de comportamiento financiero real, no solo
de reporte, y no debe colarse dentro de una tarea de "hazme un reporte". Se deja documentado
como hallazgo aparte al final de este archivo, para que Lucius decida cuándo y cómo activarlo.

---

## Reglas de trabajo

- Edita **solo lo necesario**. No reescribas archivos completos — usa ediciones puntuales.
- No leas archivos que no necesites para el cambio.
- **No toques `applyLateFees` en este trabajo.** Actualiza únicamente lo necesario para el
  reporte. Ver la nota de alcance arriba.
- No inventes una migración de base de datos para esto — no hace falta ninguna tabla ni columna
  nueva.

---

## Fase 1 — Función de estado derivado

### 1.1 Nuevo helper en `src/lib/aging.ts`

```ts
export function isOverdue(invoice: Invoice, asOf: Date = new Date()): boolean {
  return invoice.status === 'pendiente' && new Date(invoice.dueDate).getTime() < asOf.getTime();
}

export function effectiveStatus(invoice: Invoice, asOf: Date = new Date()): InvoiceStatus {
  return isOverdue(invoice, asOf) ? 'vencida' : invoice.status;
}

export function daysOverdue(invoice: Invoice, asOf: Date = new Date()): number {
  return Math.max(0, Math.floor((asOf.getTime() - new Date(invoice.dueDate).getTime()) / 86400000));
}
```

No modifica nada en la base de datos ni en el store. Es una función pura de lectura.

---

## Fase 2 — Buckets estándar y saldo real

### 2.1 Reescribir el `useMemo` de `aging` (`ReportesTab.tsx:72-87`)

Nuevos buckets:

```
corriente   -> aún no vence (status pendiente y dueDate >= hoy)
1-30 días
31-60 días
61-90 días
90+ días
```

Incluye "corriente" para que el reporte muestre también cuánto de la cartera está sana, no solo
lo vencido — un lector necesita el denominador completo para entender el porcentaje real de
mora, no solo el numerador.

Para cada factura no pagada (usa `effectiveStatus` / `isOverdue` de la Fase 1, no el `status`
crudo), calcula el **saldo pendiente real**:

```ts
const partialForInvoice = partialPayments
  .filter((p) => p.invoiceId === inv.id)
  .reduce((a, p) => a + p.amount, 0);
const balance = Math.max(0, inv.amount - partialForInvoice);
```

Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, además excluye o resta lo que ya esté
`aprobado` en `payment_proofs` para esa factura, con el mismo criterio.

Agrupa por `daysOverdue`, no por status crudo.

### 2.2 Mantener el desglose actual, ajustado

Cada bucket sigue reportando `count` y `amount` (ahora `amount` es la suma de `balance`, no de
`inv.amount`), más el porcentaje del total que ya existe en la tabla (`ReportesTab.tsx:224`).

---

## Fase 3 — Detalle por cliente (lo que falta para que sea accionable)

Un total por bucket dice qué tan enferma está la cartera; no dice a quién hay que llamar. Ahora
mismo el aging no tiene ningún desglose por cliente — agrégalo.

### 3.1 Tabla expandible o sección nueva bajo el gráfico de aging

Por cada factura vencida (agrupada opcionalmente por cliente si tiene varias facturas
vencidas): nombre del cliente, teléfono, agente asignado, días de atraso, saldo pendiente, y un
enlace para ir directo a su ficha en `CrmTab` (reutiliza el patrón de navegación que ya usa
`onSelectClient` en `FacturacionTab.tsx`, si `ReportesTab` no lo tiene, agrégalo como prop
igual que en ese componente).

Ordena por `daysOverdue` descendente por defecto — lo más urgente arriba.

Si un cliente aparece en el bucket `90+`, márcalo visualmente distinto (color de mayor
severidad) — es la señal de que probablemente no va a pagar sin una acción distinta a un
recordatorio más.

### 3.2 Exportar a CSV

Nueva función en `src/lib/export.ts`, siguiendo el patrón exacto de `invoicesToCSV`
(línea 81-96): `agingToCSV(rows)` con las mismas columnas que la tabla de 3.1. Agrega un botón
de exportación junto al resto de `ExportCard` que ya existen en `ReportesTab.tsx:385-419`.

---

## Fase 4 — Verificación

1. `npm run build` sin errores de TypeScript.
2. Crea (o edita a mano en Supabase) una factura de prueba con `status: 'pendiente'` y
   `due_date` de hace 45 días. Antes de este cambio, no aparecía en ningún lado del aging.
   Después, debe aparecer en el bucket `31-60 días` con su monto correcto.
3. Un cliente con una factura de $100 y un abono parcial de $40 registrado en
   `partial_payments` debe aparecer en el aging con saldo `$60`, no `$100`.
4. El bucket `corriente` refleja el monto total de facturas `pendiente` no vencidas — compáralo
   a mano contra la suma de facturas pendientes con fecha futura.
5. La suma de todos los buckets (incluido `corriente`) debe igualar el total de facturas no
   pagadas de la cartera — ninguna factura se pierde ni se cuenta dos veces.
6. El CSV exportado abre correctamente y sus columnas coinciden con la tabla en pantalla.
7. Confirma que `applyLateFees` **no cambió su comportamiento** — sigue sin aplicar mora a
   nada, exactamente igual que antes de este trabajo (es el bug documentado, no corregido aquí
   a propósito).

---

## Orden sugerido

Fase 1 → Fase 2 → verificar con datos de prueba (paso 2 de la Fase 4) antes de seguir →
Fase 3 → Fase 4 completa.

---

## Hallazgo pendiente para decisión de Lucius (no ejecutar sin confirmación)

`applyLateFees`, `refreshAlerts` y el filtro "Vencidas" de `FacturacionTab.tsx` tienen la misma
causa raíz: dependen de un `status: 'vencida'` que nunca se escribe. Corregirlo ahí significa
que el sistema empezaría, por primera vez, a: aplicar cargos de mora automáticos de verdad,
mostrar alertas de facturas vencidas que hoy no aparecen, y filtrar correctamente en
Facturación. Es probablemente deseable, pero es un cambio de comportamiento financiero con
clientes reales, no un ajuste de reporte — mejor como una conversación aparte y un handoff
propio, con Lucius decidiendo explícitamente cuándo activar la mora automática y a partir de
qué facturas (¿retroactivo a las ya vencidas hoy, o solo hacia adelante?).

---

## Relación con los otros handoffs

- Si `HANDOFF-MULTIMONEDA.md` ya está aplicado, los montos del aging siguen en USD (moneda
  funcional) — no conviertas los totales agregados a Bs, son para uso interno de gestión, no
  para mostrarle a un cliente.
- Si `HANDOFF-COMPROBANTES-PAGO.md` ya está aplicado, sigue el punto 2.1 sobre excluir/restar
  comprobantes `aprobado` del saldo, y en la tabla de detalle (Fase 3.1) marca aparte los
  clientes con un comprobante `por_conciliar` pendiente — no son lo mismo que alguien que
  ignora la deuda.
- Si `HANDOFF-MULTIUSUARIO.md` ya está aplicado, el aging se calcula ya filtrado por
  organización, sin cambios adicionales — los datos que llegan al componente ya vienen scoped.
- `HANDOFF-ROADMAP.md` incluye tests de `scoring.ts` y de amortización en su Fase 4; si ya se
  configuró Vitest, aprovecha para agregar un par de tests puros sobre `isOverdue` y
  `daysOverdue` — son funciones fáciles de probar y de las que más conviene tener cubiertas,
  dado que ahora alimentan un reporte financiero.
