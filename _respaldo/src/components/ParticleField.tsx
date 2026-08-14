import { useEffect, useRef } from 'react';

/**
 * Campo de partículas de Nocturne.
 * Reemplaza el gradiente + rejilla que pintaba body::before.
 * Monta UNA sola vez, arriba del árbol, dentro de <App />:
 *
 *   <ParticleField />
 *   <div className="flex h-screen overflow-hidden"> ... </div>
 *
 * Generación por área (no cantidad fija), así la densidad se mantiene
 * constante en móvil y en un monitor de 4K.
 */

type Props = {
  /** Multiplicador de densidad. 1 = ~1 nodo por 10.500 px². */
  density?: number;
  /** Opacidad global 0-100. */
  intensity?: number;
  /** Dibujar líneas entre nodos cercanos. */
  connections?: boolean;
  /** rgb del acento. Por defecto el blurple de Nocturne. */
  color?: [number, number, number];
};

export function ParticleField({
  density = 1,
  intensity = 30,
  connections = true,
  color = [145, 132, 217],
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const I = (intensity / 100) * 1.6;
    const rgb = color.join(',');

    let ctx: CanvasRenderingContext2D | null = null;
    let w = 0, h = 0, raf = 0, lastT = 0, resizeTimer = 0;

    type Node = {
      x: number; y: number; vx: number; vy: number;
      r: number; base: number; ph: number; sp: number; depth: number;
    };
    let nodes: Node[] = [];

    const seed = () => {
      const n = Math.max(24, Math.round(((w * h) / 10500) * density));
      nodes = Array.from({ length: n }, () => {
        const depth = 0.12 + Math.pow(Math.random(), 1.6) * 0.88;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 11,
          vy: (Math.random() - 0.5) * 11,
          r: 0.6 + depth * 1.5,
          base: 0.2 + depth * 0.62,
          ph: Math.random() * Math.PI * 2,
          sp: 0.5 + Math.random() * 1.1,
          depth,
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
      seed();
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!ctx || document.hidden) return;

      const dt = Math.min(0.05, (now - (lastT || now)) / 1000);
      lastT = now;
      const t = now / 1000;

      ctx.clearRect(0, 0, w, h);

      const pts: { x: number; y: number; r: number; a: number; d: number }[] = [];
      for (const n of nodes) {
        if (!reduced) {
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          if (n.x < -40) n.x += w + 80; else if (n.x > w + 40) n.x -= w + 80;
          if (n.y < -40) n.y += h + 80; else if (n.y > h + 40) n.y -= h + 80;
        }
        const breath = reduced ? 1 : 0.6 + 0.4 * Math.sin(t * n.sp + n.ph);
        const a = Math.min(0.92, n.base * I) * breath;
        if (a <= 0.006) continue;
        pts.push({ x: n.x, y: n.y, r: n.r, a, d: n.depth });
      }

      // Conexiones — rejilla espacial, no comparación todos-contra-todos.
      if (connections) {
        const R = 132, cell = R;
        const cols = Math.ceil(w / cell) + 1;
        const rows = Math.ceil(h / cell) + 1;
        const grid: (number[] | undefined)[] = new Array(cols * rows);
        pts.forEach((p, i) => {
          const cx = Math.max(0, Math.min(cols - 1, Math.floor(p.x / cell)));
          const cy = Math.max(0, Math.min(rows - 1, Math.floor(p.y / cell)));
          const k = cy * cols + cx;
          (grid[k] || (grid[k] = [])).push(i);
        });
        ctx.lineWidth = 0.6;
        for (let cy = 0; cy < rows; cy++) {
          for (let cx = 0; cx < cols; cx++) {
            const a = grid[cy * cols + cx];
            if (!a) continue;
            for (let oy = 0; oy <= 1; oy++) {
              for (let ox = -1; ox <= 1; ox++) {
                if (oy === 0 && ox < 0) continue;
                const nx = cx + ox, ny = cy + oy;
                if (nx < 0 || nx >= cols || ny >= rows) continue;
                const bb = grid[ny * cols + nx];
                if (!bb) continue;
                for (const i of a) {
                  for (const j of bb) {
                    if (oy === 0 && ox === 0 && j <= i) continue;
                    const p = pts[i], q = pts[j];
                    const dx = p.x - q.x, dy = p.y - q.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 > R * R) continue;
                    const al = (1 - Math.sqrt(d2) / R) * 0.3 * I * Math.max(p.d, q.d);
                    if (al <= 0.004) continue;
                    ctx.strokeStyle = `rgba(${rgb},${al.toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.stroke();
                  }
                }
              }
            }
          }
        }
      }

      ctx.lineCap = 'round';
      for (const p of pts) {
        ctx.strokeStyle = `rgba(${rgb},${p.a.toFixed(3)})`;
        ctx.lineWidth = p.r * 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      if (reduced) cancelAnimationFrame(raf); // una sola pasada
    };

    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(size, 120);
    };

    size();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [density, intensity, connections, color]);

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
