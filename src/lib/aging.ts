// Estado de vencimiento derivado del calendario.
//
// EL PROBLEMA QUE ESTO RESUELVE
// -----------------------------
// El sistema tenía un estado `'vencida'` para las facturas que NADIE asignaba
// nunca. `generateSchedule` las crea todas como `'pendiente'` y no había código,
// trigger ni migración que las moviera. Solo aparecía en los datos de ejemplo.
//
// Mientras tanto, diez lugares LEÍAN ese estado: la ruta de cobro del día, el
// filtro "Vencidas", el reporte de antigüedad de cartera, las alertas, el
// calendario y las multas por atraso. Todos filtraban por algo que jamás
// existía, así que estaban muertos en silencio: una factura vencida hace 90
// días seguía figurando como "pendiente" para siempre.
//
// LA SOLUCIÓN
// -----------
// No se escribe el estado en la base de datos con un cron. Se calcula al vuelo:
// una factura está vencida si quedó en `'pendiente'` y su fecha ya pasó. No hace
// falta infraestructura nueva y no hay riesgo de que la base se desincronice con
// el paso del tiempo — el calendario avanza solo.

import type { Invoice, InvoiceStatus, Client } from '../types';

/** Compara solo la fecha (no la hora): una factura que vence hoy NO está vencida. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Convierte la fecha guardada a medianoche LOCAL.
 *
 * `new Date('2026-08-16')` se interpreta como medianoche UTC por norma del
 * lenguaje. En Venezuela (UTC-4) eso cae a las 20:00 del día ANTERIOR, así que
 * todas las facturas se veían un día más vencidas de lo que estaban y una que
 * vencía hoy aparecía como vencida. El cobrador saldría a visitar un día antes.
 */
/**
 * Convierte una fecha guardada a un `Date` en hora LOCAL.
 *
 * `new Date('2026-09-10')` devuelve medianoche **UTC**, que en Venezuela
 * (UTC−4) es el 9 de septiembre a las 20:00. Por eso las cuotas aparecían
 * un día antes en el calendario. Aquí se construye la fecha componente a
 * componente, que sí respeta el día que el usuario eligió.
 */
export function parseLocalDate(s: string): Date {
  return parseDueDate(s);
}

/**
 * Ancla una fecha a las 12:00 locales antes de guardarla.
 * A mediodía ningún huso horario (±12h) ni cambio de horario de verano puede
 * correrla de día, que es exactamente lo que pasaba anclando a medianoche.
 */
export function toStoredDueDate(fecha: Date): string {
  return new Date(
    fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0,
  ).toISOString();
}

/** Clave estable de día para agrupar cuotas en el calendario. */
export function dayKey(iso: string): string {
  const d = parseDueDate(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function parseDueDate(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(s);
}

/** Forma mínima que necesita el cálculo. Se acepta `status: string` para poder
 *  usarlo también desde la impresión de facturas, que trabaja con un tipo más suelto. */
type DatedInvoice = { status: string; dueDate: string };

export function isOverdue(invoice: DatedInvoice, asOf: Date = new Date()): boolean {
  if (invoice.status !== 'pendiente') return false;
  return startOfDay(parseDueDate(invoice.dueDate)) < startOfDay(asOf);
}

/**
 * El estado que hay que MOSTRAR, que no siempre es el guardado.
 * Usa esto en vez de `invoice.status` en cualquier pantalla.
 */
export function effectiveStatus(invoice: Pick<Invoice, 'status' | 'dueDate'>, asOf: Date = new Date()): InvoiceStatus {
  return isOverdue(invoice, asOf) ? 'vencida' : invoice.status;
}

/** Días completos de atraso. 0 si no está vencida. */
export function daysOverdue(invoice: DatedInvoice, asOf: Date = new Date()): number {
  if (!isOverdue(invoice, asOf)) return 0;
  return Math.round((startOfDay(asOf) - startOfDay(parseDueDate(invoice.dueDate))) / 86400000);
}

/** Saldo real de una factura, descontando los abonos parciales ya registrados. */
export function invoiceBalance(
  invoice: Pick<Invoice, 'id' | 'amount'>,
  partialPayments: { invoiceId: string; amount: number }[],
): number {
  const paid = partialPayments
    .filter((p) => p.invoiceId === invoice.id)
    .reduce((a, p) => a + p.amount, 0);
  return Math.max(0, invoice.amount - paid);
}

/**
 * Estado del CLIENTE, también derivado.
 *
 * Un cliente con alguna factura vencida se considera en mora, sin que nadie
 * tenga que marcarlo a mano. Importa más de lo que parece: el motor de scoring
 * pondera el historial de pago, y como `'en_mora'` no se asignaba nunca, ese
 * factor estaba inerte y todos puntuaban como si jamás hubieran fallado un pago.
 *
 * Los estados que no describen la salud del crédito (prospecto, en revisión,
 * aprobado, rechazado) se respetan tal cual: alguien todavía en evaluación no
 * está "en mora" aunque arrastre una factura vieja.
 */
export function effectiveClientStatus(
  client: Pick<Client, 'id' | 'status'>,
  invoices: Pick<Invoice, 'clientId' | 'status' | 'dueDate'>[],
  asOf: Date = new Date(),
): Client['status'] {
  if (client.status !== 'activo' && client.status !== 'en_mora') return client.status;
  const hasOverdue = invoices.some((i) => i.clientId === client.id && isOverdue(i, asOf));
  return hasOverdue ? 'en_mora' : 'activo';
}
