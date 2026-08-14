/**
 * Barrido láser neón — aleatorización de fase.
 * HANDOFF-COMPLETO-PARA-CLAUDE-CODE.md § 6.5
 *
 * IMPORTANTE (bug ya corregido en el prototipo, no repetirlo):
 * la duración y el delay de cada elemento se randomizan en JS, NUNCA con CSS
 * `:nth-of-type` — eso solo cuenta hermanos dentro del mismo padre y termina
 * sincronizando casi todo el árbol en el mismo ciclo.
 *
 * Un MutationObserver sobre document.body detecta nodos nuevos con .ntNeonBg
 * o .ntNeonAnim (incluidos los modales que se abren después del load) y les
 * asigna una sola vez:
 *   --nd  duración : 2.4 + random*3.6 segundos
 *   --nl  delay    : negativo, -(random * duración) — así cada elemento arranca
 *                    a mitad de su propio ciclo en vez de todos a la vez en 0s.
 *
 * Un WeakSet evita reasignar al mismo nodo.
 *
 * Puramente estético: no lee ni escribe datos, no toca estado de la app.
 */

const seen = new WeakSet<Element>();
// h1/h2 llevan el barrido por CSS global, así que también entran aquí para que
// cada uno arranque en una fase distinta.
const SELECTOR = '.ntNeonBg, .ntNeonAnim, h1, h2';

function assign(el: Element) {
  if (seen.has(el)) return;
  seen.add(el);
  const dur = 2.4 + Math.random() * 3.6;
  const delay = -(Math.random() * dur);
  (el as HTMLElement).style.setProperty('--nd', `${dur.toFixed(2)}s`);
  (el as HTMLElement).style.setProperty('--nl', `${delay.toFixed(2)}s`);
}

function scan(root: ParentNode) {
  if (root instanceof Element && root.matches(SELECTOR)) assign(root);
  root.querySelectorAll?.(SELECTOR).forEach(assign);
}

let observer: MutationObserver | null = null;

export function startNeonSweep() {
  if (typeof document === 'undefined' || observer) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const boot = () => {
    scan(document.body);
    observer = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n.nodeType === 1) scan(n as Element);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.body) boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });
}

export function stopNeonSweep() {
  observer?.disconnect();
  observer = null;
}
