// Ruta de cobro del día — ordenamiento por cercanía (vecino más cercano), no navegación
// turn-by-turn. Ver HANDOFF-RUTA-COBRO.md para el alcance completo.
import type { Client, Invoice } from '../types';
import { isOverdue, parseLocalDate } from './aging';

export interface LatLng { lat: number; lng: number }

export interface RouteStop {
  clientId: string;
  latitude: number;
  longitude: number;
  distanceFromPrevKm: number;
}

// Distancia en línea recta (no sigue calles) — sirve para ordenar, no es precisión de
// navegación GPS real.
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Vecino más cercano — O(n²), aceptable para las decenas de paradas de un día.
export function nearestNeighborRoute(
  origin: LatLng,
  stops: { clientId: string; latitude: number; longitude: number }[],
): RouteStop[] {
  const remaining = [...stops];
  const route: RouteStop[] = [];
  let current: LatLng = origin;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineKm(current, { lat: s.latitude, lng: s.longitude });
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    const [next] = remaining.splice(bestIdx, 1);
    route.push({ ...next, distanceFromPrevKm: bestDist });
    current = { lat: next.latitude, lng: next.longitude };
  }
  return route;
}

// Visitas del día: facturas pendientes que vencen hoy + toda factura vencida (mora), sin
// importar hace cuánto — el cobrador necesita saber a quién visitar por mora atrasada también.
//
// El vencimiento se calcula con `isOverdue` (fecha), no con `status === 'vencida'`. Ese
// estado no se asigna nunca en el sistema, así que la rama de mora estaba muerta: la ruta
// solo mostraba lo que vencía exactamente hoy y un cliente con tres semanas de atraso
// jamás aparecía. Ver src/lib/aging.ts.
export function getTodayRouteInvoices(invoices: Invoice[], agent: string | 'all', clientById: Map<string, Client>): Invoice[] {
  const now = new Date();
  const todayKey = now.toDateString();
  return invoices.filter((inv) => {
    if (inv.status === 'pagada') return false;
    const client = clientById.get(inv.clientId);
    if (agent !== 'all' && client?.assignedAgent !== agent) return false;
    if (isOverdue(inv, now)) return true;
    if (inv.status === 'pendiente') return parseLocalDate(inv.dueDate).toDateString() === todayKey;
    return false;
  });
}

export function wazeUrl(lat: number, lng: number) {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}
export function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
