import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, TrendingUp } from 'lucide-react';
import { useStore } from '../store';
import { CARACAS_MUNICIPALITIES } from '../data';
import type { Municipality } from '../types';
import { fmtPct } from './ui';

/**
 * Mapa de calor por municipio.
 *
 * Antes pintaba cifras fijas escritas a mano en data.ts (Libertador 312
 * solicitudes, etc.) que no tenían ninguna relación con la cartera real. Ahora
 * cuenta los clientes de verdad:
 *   - solicitudes = clientes registrados en ese municipio
 *   - aprobadas   = créditos efectivamente otorgados (aprobado / activo / en mora)
 */

/** Estados que significan "el crédito se otorgó". En mora también cuenta: se le dio. */
const GRANTED = new Set(['aprobado', 'activo', 'en_mora']);

interface MuniStat {
  id: Municipality;
  name: string;
  lat: number;
  lng: number;
  applications: number;
  approved: number;
}

export function CaracasHeatmap() {
  const { clients } = useStore();
  const [hovered, setHovered] = useState<MuniStat | null>(null);

  const stats = useMemo<MuniStat[]>(() => {
    const counts = new Map<string, { applications: number; approved: number }>();
    for (const c of clients) {
      const entry = counts.get(c.municipality) ?? { applications: 0, approved: 0 };
      entry.applications += 1;
      if (GRANTED.has(c.status)) entry.approved += 1;
      counts.set(c.municipality, entry);
    }
    return CARACAS_MUNICIPALITIES.map((m) => ({
      ...m,
      applications: counts.get(m.id)?.applications ?? 0,
      approved: counts.get(m.id)?.approved ?? 0,
    }));
  }, [clients]);

  const total = stats.reduce((a, m) => a + m.applications, 0);
  // Sin clientes, max sería 0 y todas las divisiones darían NaN.
  const max = Math.max(1, ...stats.map((m) => m.applications));

  const colorFor = (val: number) => {
    const t = val / max;
    if (t > 0.8) return '#b5abfc';
    if (t > 0.55) return '#968ae0';
    if (t > 0.35) return '#796cbf';
    return '#5d5294';
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500/10 text-accent-300">
            <MapPin size={16} />
          </div>
          <div>
            <h3 className="font-display text-sm font-medium text-metal-100">
              Distribución de Solicitudes · Caracas
            </h3>
            <p className="text-xs text-slate-500">Municipios · calor por volumen</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
          <TrendingUp size={13} className="text-accent-400" />
          {total} {total === 1 ? 'cliente' : 'clientes'}
        </div>
      </div>

      {total === 0 && (
        <div className="mb-4 rounded-xl border border-tint/5 bg-ink-900/40 px-3 py-2.5 text-xs text-slate-500">
          Todavía no hay clientes registrados. El mapa se irá llenando a medida que
          cargues tu cartera.
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="relative h-[280px] sm:h-[340px] rounded-xl overflow-hidden border border-tint/5 [&_.leaflet-tile-pane]:invert [&_.leaflet-tile-pane]:hue-rotate-180 [&_.leaflet-tile-pane]:brightness-90 [&_.leaflet-tile-pane]:contrast-90 [&_.leaflet-tile-pane]:saturate-75 [&_.leaflet-control-attribution]:!bg-ink-900/70 [&_.leaflet-control-attribution]:!text-slate-500">
          <MapContainer center={[10.475, -66.865]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {stats.map((m) => {
              const active = hovered?.id === m.id;
              const color = colorFor(m.applications);
              // Municipio sin clientes: punto mínimo y tenue, para que se note que está vacío.
              const empty = m.applications === 0;
              return (
                <CircleMarker
                  key={m.id}
                  center={[m.lat, m.lng]}
                  radius={empty ? 5 : 12 + 10 * (m.applications / max)}
                  pathOptions={{
                    color,
                    fillColor: color,
                    fillOpacity: empty ? 0.18 : active ? 0.75 : 0.5,
                    weight: active ? 2.5 : 1.2,
                  }}
                  eventHandlers={{ mouseover: () => setHovered(m), mouseout: () => setHovered(null) }}
                >
                  <Popup>
                    <b>{m.name}</b><br />
                    {m.applications} {m.applications === 1 ? 'cliente' : 'clientes'} · {m.approved} con crédito otorgado
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Legend / list */}
        <div className="space-y-2">
          {stats.map((m) => {
            const rate = m.applications > 0 ? (m.approved / m.applications) * 100 : 0;
            const active = hovered?.id === m.id;
            return (
              <button
                key={m.id}
                onMouseEnter={() => setHovered(m)}
                onMouseLeave={() => setHovered(null)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                  active
                    ? 'border-accent-500/40 bg-accent-500/10'
                    : 'border-tint/5 bg-ink-900/40 hover:border-tint/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    {m.name}
                  </span>
                  <span className="num text-xs text-slate-400">
                    {m.applications}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-tint/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(m.applications / max) * 100}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-accent-600 to-violet-500"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                  <span>Otorgados: {m.approved}</span>
                  {m.applications > 0 && (
                    <span className="text-success-500">{fmtPct(rate)} conv.</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
