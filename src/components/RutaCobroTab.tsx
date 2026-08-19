import { useEffect, useMemo, useState } from 'react';
import { MapPin, Navigation, Phone, CheckCircle2, StickyNote, Loader2, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '../store';
import { Card, SectionHeader, EmptyState, fmtMoney, Modal } from './ui';
import { useToast } from '../context/ToastContext';
import { friendlyError } from '../lib/errors';
import { getTodayRouteInvoices, nearestNeighborRoute, wazeUrl, googleMapsUrl, type LatLng } from '../lib/routing';
import { isOverdue } from '../lib/aging';

// Oficina como último respaldo si no hay geolocalización ni origen guardado para el agente.
const OFFICE_ORIGIN: LatLng = { lat: 10.4989, lng: -66.8534 }; // Chacao

export function RutaCobroTab() {
  const { clients, invoices, team, addBitacora } = useStore();
  const toast = useToast();
  const [agent, setAgent] = useState<string>('all');
  const [origin, setOrigin] = useState<LatLng>(OFFICE_ORIGIN);
  const [locating, setLocating] = useState(true);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) { setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => setLocating(false),
      { timeout: 5000 },
    );
  }, []);

  // Prioridad del punto de partida: origen guardado del agente seleccionado > geolocalización
  // del navegador > oficina fija.
  useEffect(() => {
    if (agent === 'all') return;
    const member = team.find((t) => t.name === agent);
    if (member?.originLat != null && member?.originLng != null) {
      setOrigin({ lat: member.originLat, lng: member.originLng });
    }
  }, [agent, team]);

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const agents = useMemo(() => ['all', ...team.map((m) => m.name)], [team]);

  const todayInvoices = useMemo(
    () => getTodayRouteInvoices(invoices, agent, clientById),
    [invoices, agent, clientById],
  );

  const { stops, noCoords } = useMemo(() => {
    const seen = new Set<string>();
    const withCoords: { clientId: string; latitude: number; longitude: number }[] = [];
    const missing: string[] = [];
    todayInvoices.forEach((inv) => {
      if (seen.has(inv.clientId)) return;
      seen.add(inv.clientId);
      const c = clientById.get(inv.clientId);
      if (!c) return;
      if (c.latitude != null && c.longitude != null) {
        withCoords.push({ clientId: c.id, latitude: c.latitude, longitude: c.longitude });
      } else {
        missing.push(c.id);
      }
    });
    return { stops: nearestNeighborRoute(origin, withCoords), noCoords: missing };
  }, [todayInvoices, clientById, origin]);

  const debtByClient = useMemo(() => {
    const m = new Map<string, number>();
    todayInvoices.forEach((inv) => m.set(inv.clientId, (m.get(inv.clientId) ?? 0) + inv.amount));
    return m;
  }, [todayInvoices]);

  // Clientes con al menos una factura vencida hoy en la ruta — se calcula por fecha,
  // no por el estado guardado (ver src/lib/aging.ts).
  const overdueClients = useMemo(() => {
    const s = new Set<string>();
    const now = new Date();
    todayInvoices.forEach((inv) => { if (isOverdue(inv, now)) s.add(inv.clientId); });
    return s;
  }, [todayInvoices]);

  const submitVisit = async () => {
    if (!noteFor) return;
    setSaving(true);
    try {
      await addBitacora(noteFor, { author: agent === 'all' ? 'Cobrador' : agent, channel: 'visita', note: note || 'Visita de cobro registrada desde la ruta del día.', outcome: 'contactado' });
      toast.success('Visita registrada');
      setNoteFor(null);
      setNote('');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Ruta de cobro del día"
        subtitle="Visitas de hoy ordenadas por cercanía — no es navegación turn-by-turn, solo el orden"
        icon={<Navigation size={16} />}
      />

      {agents.length > 2 && (
        <Card className="p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="kicker">Agente:</span>
            <select value={agent} onChange={(e) => setAgent(e.target.value)} className="input w-auto">
              {agents.map((a) => <option key={a} value={a}>{a === 'all' ? 'Todos' : a}</option>)}
            </select>
            {locating && <span className="text-xs text-slate-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Ubicando punto de partida...</span>}
          </div>
        </Card>
      )}

      {stops.length === 0 ? (
        <EmptyState icon={<Navigation size={20} />} title="Sin visitas para hoy" body="No hay cuotas vencidas ni facturas que venzan hoy para este agente." />
      ) : (
        <>
          <Card className="p-3">
            <div className="relative h-[320px] rounded-xl overflow-hidden border border-tint/5 [&_.leaflet-tile-pane]:invert [&_.leaflet-tile-pane]:hue-rotate-180 [&_.leaflet-tile-pane]:brightness-90 [&_.leaflet-tile-pane]:contrast-90 [&_.leaflet-tile-pane]:saturate-75 [&_.leaflet-control-attribution]:!bg-ink-900/70 [&_.leaflet-control-attribution]:!text-slate-500">
              <MapContainer center={[origin.lat, origin.lng]} zoom={12} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline positions={[[origin.lat, origin.lng], ...stops.map((s) => [s.latitude, s.longitude] as [number, number])]} pathOptions={{ color: '#9184d9', weight: 2, dashArray: '4 6' }} />
                <CircleMarker center={[origin.lat, origin.lng]} radius={7} pathOptions={{ color: '#e9e9ed', fillColor: '#e9e9ed', fillOpacity: 0.9 }}>
                  <Tooltip permanent direction="top">Inicio</Tooltip>
                </CircleMarker>
                {stops.map((stop, i) => {
                  const client = clientById.get(stop.clientId);
                  return (
                    <CircleMarker key={stop.clientId} center={[stop.latitude, stop.longitude]} radius={9} pathOptions={{ color: '#9184d9', fillColor: '#9184d9', fillOpacity: 0.75, weight: 1.5 }}>
                      <Tooltip permanent direction="top" className="!text-2xs">{i + 1}</Tooltip>
                      <Popup>{client?.fullName}</Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
            <p className="text-2xs text-slate-500 mt-2">Línea recta entre paradas — no es una ruta real por calles, solo el orden sugerido.</p>
          </Card>

          <div className="space-y-2">
          {stops.map((stop, i) => {
            const client = clientById.get(stop.clientId);
            if (!client) return null;
            const done = visited.has(client.id);
            return (
              <Card key={client.id} className={`p-4 ${done ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-ink-900/80 ring-1 ring-tint/10 grid place-items-center text-xs font-medium text-metal-100">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-metal-100">{client.fullName}</p>
                      {overdueClients.has(client.id) && <span className="chip bg-danger-500/15 text-danger-400 text-2xs">Mora</span>}
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {client.address}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stop.distanceFromPrevKm.toFixed(1)} km desde la parada anterior · {fmtMoney(debtByClient.get(client.id) ?? 0)} adeudado</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <a href={wazeUrl(stop.latitude, stop.longitude)} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                        <Navigation size={12} /> Waze
                      </a>
                      <a href={googleMapsUrl(stop.latitude, stop.longitude)} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                        <MapPin size={12} /> Google Maps
                      </a>
                      {client.phone && (
                        <a href={`tel:${client.phone}`} className="btn-secondary text-xs"><Phone size={12} /> Llamar</a>
                      )}
                      <button onClick={() => setNoteFor(client.id)} className="btn-secondary text-xs"><StickyNote size={12} /> Registrar visita</button>
                      <button
                        onClick={() => setVisited((v) => { const n = new Set(v); done ? n.delete(client.id) : n.add(client.id); return n; })}
                        className={`text-xs ${done ? 'btn-secondary' : 'btn-primary'}`}
                      >
                        <CheckCircle2 size={12} /> {done ? 'Marcada' : 'Marcar visitada'}
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        </>
      )}

      {noCoords.length > 0 && (
        <Card className="p-4">
          <SectionHeader title="Sin ubicación guardada" subtitle="No se pudo calcular su orden en la ruta — visítalos igual" icon={<AlertCircle size={16} />} />
          <div className="space-y-1.5">
            {noCoords.map((id) => {
              const c = clientById.get(id);
              if (!c) return null;
              return (
                <div key={id} className="flex items-center justify-between text-sm py-1.5 border-b border-tint/5 last:border-0">
                  <span className="text-slate-300">{c.fullName}</span>
                  <span className="text-xs text-slate-500">{c.address}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal open={!!noteFor} onClose={() => setNoteFor(null)} title="Registrar visita" size="sm">
        <textarea className="input min-h-[80px] w-full" placeholder="Notas de la visita..." value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => setNoteFor(null)} className="btn-ghost text-xs">Cancelar</button>
          <button onClick={submitVisit} disabled={saving} className="btn-primary text-xs">
            {saving ? <Loader2 size={12} className="animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
