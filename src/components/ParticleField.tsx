import { useEffect, useRef } from 'react';

/**
 * Constelación de fondo con física de repulsión al mouse.
 *
 * Reimplementación fiel del prototipo `XiX Tech CRM - Rediseño Nocturne.dc.html`,
 * siguiendo HANDOFF-COMPLETO-PARA-CLAUDE-CODE.md § 6.1. Los valores no son
 * inventados: son los del prototipo.
 *
 *   Login     → count 70, speed 0.16, lineDist 130, lineAlpha 0.22, dotAlpha 0.75
 *   App shell → count 34, speed 0.09, lineDist 110, lineAlpha 0.10, dotAlpha 0.40
 *
 * Repulsión: radio 90px, force = (90 - dist) / 90 * 0.9, empuje en dirección
 * contraria al cursor. Fuera de ese radio no hay fuerza — halo local, no gravedad.
 * Bordes con wrap-around (reaparecen del lado opuesto, nunca rebotan).
 */

type Variant = 'login' | 'app';

type Props = {
  variant?: Variant;
  /** Overrides opcionales sobre el preset. */
  count?: number;
  speed?: number;
  lineDist?: number;
  lineAlpha?: number;
  dotAlpha?: number;
};

const PRESETS: Record<Variant, Required<Omit<Props, 'variant'>>> = {
  login: { count: 70, speed: 0.16, lineDist: 130, lineAlpha: 0.22, dotAlpha: 0.75 },
  app:   { count: 34, speed: 0.09, lineDist: 110, lineAlpha: 0.10, dotAlpha: 0.40 },
};

const RGB = '181,171,252';
const REPEL_RADIUS = 90;
const REPEL_STRENGTH = 0.9;

export function ParticleField({ variant = 'app', ...overrides }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const preset = PRESETS[variant];
  const count     = overrides.count     ?? preset.count;
  const speed     = overrides.speed     ?? preset.speed;
  const lineDist  = overrides.lineDist  ?? preset.lineDist;
  const lineAlpha = overrides.lineAlpha ?? preset.lineAlpha;
  const dotAlpha  = overrides.dotAlpha  ?? preset.dotAlpha;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let ctx: CanvasRenderingContext2D | null = null;
    let w = 0, h = 0, raf = 0, resizeTimer = 0;

    // Coordenadas locales al canvas. Muy lejos = sin repulsión al inicio.
    const mouse = { x: -9999, y: -9999 };

    type P = { x: number; y: number; vx: number; vy: number; r: number; tw: number; tws: number };
    let parts: P[] = [];

    const seed = () => {
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: 0.9 + Math.random() * 1.4,          // 0.9 – 2.3
        tw: Math.random() * Math.PI * 2,
        tws: 0.02 + Math.random() * 0.03,      // 0.02 – 0.05
      }));
    };

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!parts.length) seed(); else { seed(); }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!ctx || document.hidden) return;

      ctx.clearRect(0, 0, w, h);

      for (const p of parts) {
        if (!reduced) {
          // 1. Repulsión al mouse.
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < REPEL_RADIUS && dist > 0.01) {
            const force = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * REPEL_STRENGTH;
            p.x += (dx / dist) * force;
            p.y += (dy / dist) * force;
          }

          // 2. Velocidad propia + parpadeo.
          p.x += p.vx;
          p.y += p.vy;
          p.tw += p.tws;

          // 3. Wrap-around.
          if (p.x < -5) p.x = w + 5; else if (p.x > w + 5) p.x = -5;
          if (p.y < -5) p.y = h + 5; else if (p.y > h + 5) p.y = -5;
        }
      }

      // 4. Líneas entre partículas cercanas.
      ctx.lineWidth = 0.6;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= lineDist) continue;
          ctx.strokeStyle = `rgba(${RGB},${(lineAlpha * (1 - d / lineDist)).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // 5. Puntos con glow y parpadeo independiente.
      for (const p of parts) {
        const twinkle = 0.5 + 0.5 * Math.sin(p.tw);
        ctx.shadowColor = `rgba(${RGB},0.9)`;
        ctx.shadowBlur = 5 + 4 * twinkle;
        ctx.fillStyle = `rgba(${RGB},${(dotAlpha * (0.55 + 0.45 * twinkle)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.75 + 0.35 * twinkle), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      if (reduced) cancelAnimationFrame(raf); // una sola pasada
    };

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(size, 120);
    };

    // Listener global: funciona aunque el cursor esté sobre otro elemento encima.
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    size();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', onResize);
    if (!reduced) {
      window.addEventListener('mousemove', onMove, { passive: true });
      document.addEventListener('mouseleave', onLeave);
      window.addEventListener('blur', onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [count, speed, lineDist, lineAlpha, dotAlpha]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
