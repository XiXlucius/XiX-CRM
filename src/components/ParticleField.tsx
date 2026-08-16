import { useEffect, useRef } from 'react';

/**
 * Constelación de fondo con gravedad del cursor.
 *
 * Base tomada del prototipo `XiX Tech CRM - Rediseño Nocturne.dc.html`
 * (HANDOFF-COMPLETO-PARA-CLAUDE-CODE.md § 6.1): densidad, velocidad de deriva,
 * distancia de conexión, parpadeo y wrap-around en los bordes.
 *
 * DIFERENCIAS DELIBERADAS con el prototipo:
 *
 *  1. El cursor ATRAE en vez de repeler. El prototipo empujaba las partículas
 *     lejos del puntero; aquí ejercen gravedad hacia él, con caída cuadrática y
 *     una zona muerta para que no colapsen todas en el mismo punto. Al alejar el
 *     cursor, cada partícula relaja de vuelta hacia su deriva original.
 *
 *  2. El shell de la app usa el MISMO preset que el login. El prototipo lo tenía
 *     mucho más tenue (count 34, dotAlpha 0.40) y detrás del contenido no se
 *     apreciaba.
 *
 * Todas las perillas están en las constantes de abajo.
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

// El shell de la app usa el mismo campo que el login: misma densidad, mismo
// brillo. Antes era mucho más tenue y ni se notaba detrás del contenido.
const PRESETS: Record<Variant, Required<Omit<Props, 'variant'>>> = {
  login: { count: 70, speed: 0.16, lineDist: 130, lineAlpha: 0.22, dotAlpha: 0.75 },
  app:   { count: 70, speed: 0.16, lineDist: 130, lineAlpha: 0.22, dotAlpha: 0.75 },
};

const RGB = '181,171,252';

// ─── Gravedad del cursor ─────────────────────────────────────────────────
/** Radio de influencia, en px. Fuera de aquí el cursor no afecta nada. */
const GRAVITY_RADIUS = 230;
/** Fuerza de atracción. Más alto = tirón más fuerte. */
const GRAVITY = 0.05;
/** Zona muerta alrededor del cursor, para que no colapsen todas en el punto. */
const DEAD_ZONE = 26;
/** Con qué rapidez cada partícula recupera su deriva original (0-1 por frame). */
const RELAX = 0.035;
/** Tope de velocidad, para que nada salga disparado. */
const MAX_SPEED = 3.2;

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

    // bvx/bvy = deriva propia de la partícula. vx/vy = velocidad actual, que la
    // gravedad del cursor altera y que luego relaja de vuelta hacia la deriva.
    type P = {
      x: number; y: number;
      vx: number; vy: number;
      bvx: number; bvy: number;
      r: number; tw: number; tws: number;
    };
    let parts: P[] = [];

    const seed = () => {
      parts = Array.from({ length: count }, () => {
        const bvx = (Math.random() - 0.5) * speed;
        const bvy = (Math.random() - 0.5) * speed;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: bvx, vy: bvy,
          bvx, bvy,
          r: 0.9 + Math.random() * 1.4,          // 0.9 – 2.3
          tw: Math.random() * Math.PI * 2,
          tws: 0.02 + Math.random() * 0.03,      // 0.02 – 0.05
        };
      });
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
          // 1. Gravedad del cursor: atrae hacia el puntero, con caída cuadrática.
          //    dx/dy apuntan HACIA el mouse (antes era al revés: repelía).
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < GRAVITY_RADIUS && dist > DEAD_ZONE) {
            const f = Math.pow(1 - dist / GRAVITY_RADIUS, 2) * GRAVITY;
            p.vx += (dx / dist) * f;
            p.vy += (dy / dist) * f;
          }

          // 2. Relajación: siempre tiende a recuperar su deriva original, así
          //    que al alejar el cursor el campo vuelve solo a su estado normal.
          p.vx += (p.bvx - p.vx) * RELAX;
          p.vy += (p.bvy - p.vy) * RELAX;

          // 3. Tope de velocidad.
          const sp = Math.hypot(p.vx, p.vy);
          if (sp > MAX_SPEED) {
            p.vx = (p.vx / sp) * MAX_SPEED;
            p.vy = (p.vy / sp) * MAX_SPEED;
          }

          // 4. Mover + parpadeo.
          p.x += p.vx;
          p.y += p.vy;
          p.tw += p.tws;

          // 5. Wrap-around.
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
