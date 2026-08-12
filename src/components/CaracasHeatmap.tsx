import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, TrendingUp } from 'lucide-react';
import { CARACAS_MUNICIPALITIES } from '../data';
import type { CaracasMunicipality } from '../types';
import { fmtPct } from './ui';

export function CaracasHeatmap() {
  const [hovered, setHovered] = useState<CaracasMunicipality | null>(null);
  const max = Math.max(...CARACAS_MUNICIPALITIES.map((m) => m.applications));

  const colorFor = (val: number) => {
    const t = val / max;
    // indigo -> violet gradient by intensity
    if (t > 0.8) return { fill: '#6366f1', stroke: '#818cf8' };
    if (t > 0.55) return { fill: '#4f46e5', stroke: '#6366f1' };
    if (t > 0.35) return { fill: '#4338ca', stroke: '#4f46e5' };
    return { fill: '#312e81', stroke: '#4338ca' };
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent-500/10 text-accent-300">
            <MapPin size={16} />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-white">
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
        {/* SVG map */}
        <div className="relative rounded-xl bg-ink-900/40 bg-grid-faint bg-grid p-3 overflow-hidden">
          <svg viewBox="0 0 500 300" className="w-full h-auto">
            <defs>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="250" cy="150" r="130" fill="url(#glow)" />
            {CARACAS_MUNICIPALITIES.map((m) => {
              const c = colorFor(m.applications);
              const active = hovered?.id === m.id;
              return (
                <motion.path
                  key={m.id}
                  d={m.path}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={active ? 2.5 : 1.2}
                  style={{ cursor: 'pointer' }}
                  initial={false}
                  animate={{
                    opacity: hovered && !active ? 0.45 : 1,
                    scale: active ? 1.03 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  onMouseEnter={() => setHovered(m)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
            {CARACAS_MUNICIPALITIES.map((m) => {
              const cx = m.id === 'libertador' ? 120
                : m.id === 'chacao' ? 265
                : m.id === 'baruta' ? 290
                : m.id === 'sucre' ? 360
                : 400;
              const cy = m.id === 'libertador' ? 145
                : m.id === 'chacao' ? 105
                : m.id === 'baruta' ? 185
                : m.id === 'sucre' ? 105
                : 200;
              return (
                <text
                  key={m.id}
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  className="pointer-events-none fill-slate-200 font-medium"
                  style={{ fontSize: 11 }}
                >
                  {m.name}
                </text>
              );
            })}
          </svg>
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
                    : 'border-white/5 bg-ink-900/40 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    {m.name}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {m.applications}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
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
