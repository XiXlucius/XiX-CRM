import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, TrendingUp } from 'lucide-react';
import { CARACAS_MUNICIPALITIES } from '../data';
import type { CaracasMunicipality } from '../types';
import { fmtPct } from './ui';

export function CaracasHeatmap() {
  const [hovered, setHovered] = useState<CaracasMunicipality | null>(null);
  const max = Math.max(...CARACAS_MUNICIPALITIES.map((m) => m.applications));

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
          {CARACAS_MUNICIPALITIES.reduce((a, m) => a + m.applications, 0)} solicitudes
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        <div className="relative h-[280px] sm:h-[340px] rounded-xl overflow-hidden border border-tint/5 [&_.leaflet-tile-pane]:invert [&_.leaflet-tile-pane]:hue-rotate-180 [&_.leaflet-tile-pane]:brightness-90 [&_.leaflet-tile-pane]:contrast-90 [&_.leaflet-tile-pane]:saturate-75 [&_.leaflet-control-attribution]:!bg-ink-900/70 [&_.leaflet-control-attribution]:!text-slate-500">
          <MapContainer center={[10.475, -66.865]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {CARACAS_MUNICIPALITIES.map((m) => {
              const active = hovered?.id === m.id;
              const color = colorFor(m.applications);
              return (
                <CircleMarker
                  key={m.id}
                  center={[m.lat, m.lng]}
                  radius={12 + 10 * (m.applications / max)}
                  pathOptions={{ color, fillColor: color, fillOpacity: active ? 0.75 : 0.5, weight: active ? 2.5 : 1.2 }}
                  eventHandlers={{ mouseover: () => setHovered(m), mouseout: () => setHovered(null) }}
                >
                  <Popup>
                    <b>{m.name}</b><br />
                    {m.applications} solicitudes · {m.approved} aprobadas
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Legend / list */}
        <div className="space-y-2">
          {CARACAS_MUNICIPALITIES.map((m) => {
            const rate = (m.approved / m.applications) * 100;
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
                  <span>Aprobadas: {m.approved}</span>
                  <span className="text-success-500">{fmtPct(rate)} conv.</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
