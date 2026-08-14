import { useEffect, useRef, useState } from 'react';

/**
 * Contador que cuenta hasta su valor la primera vez que entra en pantalla.
 * Reemplaza el <AnimatedNumber> de ui.tsx (que solo hacía un fade).
 * Sustituye el número por su valor final si el usuario pidió menos
 * movimiento — nunca deja una cifra a medio contar.
 */
export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 900,
  className = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }

    const run = () => {
      const from = done.current ? shown : 0;
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        // easeOutExpo
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        setShown(from + (value - from) * e);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      done.current = true;
    };

    if (done.current) { run(); return; }

    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { run(); io.disconnect(); } },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className={`num ${className}`}>
      {prefix}
      {shown.toLocaleString('es-VE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
