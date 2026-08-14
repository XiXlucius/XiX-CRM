import { useEffect, useRef, useState } from 'react';

/**
 * Anillo circular de score (0–100). Reemplaza la barra de progreso del
 * panel "Evaluación de riesgo" en CrmTab.tsx.
 *
 * RECONSTRUIDO desde la especificación del README (§2.3) — el archivo
 * original no llegó en el paquete subido. Pista de 2px en neutral-800, arco
 * de progreso de 2px con stroke-linecap redondeado, rotado -90° para
 * arrancar arriba, animado con stroke-dashoffset en 700ms. El color del
 * arco comunica el tramo — es el único lugar del CRM donde el color
 * sustituye a una etiqueta, por eso lleva role="img" + aria-label.
 */
type Props = {
  value: number;
  size?: number;
  label?: string;
  className?: string;
};

function bandColor(value: number): string {
  if (value >= 75) return '#86b298'; // sano
  if (value >= 50) return '#c9ae7d'; // vigilar
  return '#d09090'; // riesgo
}

export function ScoreRing({ value, size = 64, label = 'Score', className = '' }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  const strokeWidth = 2;
  const r = size / 2 - strokeWidth * 2;
  const circumference = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circumference);
  const first = useRef(true);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = circumference * (1 - clamped / 100);

    if (reduced) {
      setOffset(target);
      first.current = false;
      return;
    }

    if (first.current) {
      // arranca en 0% y anima hacia el valor real en el frame siguiente
      setOffset(circumference);
      const raf = requestAnimationFrame(() => setOffset(target));
      first.current = false;
      return () => cancelAnimationFrame(raf);
    }

    setOffset(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, circumference]);

  const color = bandColor(clamped);
  const fontSize = Math.round(size * 0.34);

  return (
    <div
      role="img"
      aria-label={`${label}: ${Math.round(clamped)} de 100`}
      className={`relative inline-grid place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3f424d"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1), stroke 300ms ease' }}
        />
      </svg>
      <span
        className="num absolute"
        style={{ fontSize, color }}
        aria-hidden="true"
      >
        {Math.round(clamped)}
      </span>
    </div>
  );
}
