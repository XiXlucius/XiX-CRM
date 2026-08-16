/**
 * Barrido láser neón en los títulos.
 * HANDOFF-COMPLETO-PARA-CLAUDE-CODE.md § 6.5
 *
 * El barrido NO es un bucle CSS infinito. Un `animation: ... infinite` obliga a
 * que el destello vuelva a cruzar inmediatamente después del anterior — se ve
 * repetitivo y cansa. Aquí cada título se programa por separado:
 *
 *     cruza (lento)  ->  descansa un rato al azar  ->  vuelve a cruzar
 *
 * Duración del cruce y longitud del descanso se sortean por título Y en cada
 * repetición, así que ningún título coincide con otro ni consigo mismo.
 *
 * Un MutationObserver engancha los títulos que aparecen después (modales, cambio
 * de pestaña). Cuando un título sale del DOM, su ciclo se detiene solo.
 *
 * Puramente estético: no lee ni escribe datos, no toca estado de la app.
 */

// ─── Perillas ────────────────────────────────────────────────────────────
/** Cuánto tarda el destello en cruzar el título, en segundos. */
const SWEEP_MIN = 3.4;
const SWEEP_RANGE = 2.6;      // resultado: 3.4s – 6.0s

/** Cuánto descansa el título entre un cruce y el siguiente, en segundos. */
const GAP_MIN = 7;
const GAP_RANGE = 16;         // resultado: 7s – 23s

/** Espera inicial antes del primer cruce de cada título. */
const FIRST_MIN = 0.5;
const FIRST_RANGE = 9;
// ─────────────────────────────────────────────────────────────────────────

const seen = new WeakSet<Element>();
const SELECTOR = '.ntNeonBg, .ntNeonAnim, h1, h2, h3';

const rand = (min: number, range: number) => min + Math.random() * range;

function sweepOnce(el: HTMLElement) {
  if (!el.isConnected) return; // salió del DOM: se acaba el ciclo

  const dur = rand(SWEEP_MIN, SWEEP_RANGE);
  el.style.setProperty('--nd', `${dur.toFixed(2)}s`);

  // Reiniciar la animación: quitar la clase, forzar reflow, volver a ponerla.
  el.classList.remove('nt-sweep');
  void el.offsetWidth;
  el.classList.add('nt-sweep');

  const gap = rand(GAP_MIN, GAP_RANGE);
  window.setTimeout(() => {
    if (!el.isConnected) return;
    el.classList.remove('nt-sweep');
    sweepOnce(el);
  }, (dur + gap) * 1000);
}

function assign(el: Element) {
  if (seen.has(el)) return;
  seen.add(el);
  window.setTimeout(() => sweepOnce(el as HTMLElement), rand(FIRST_MIN, FIRST_RANGE) * 1000);
}

function scan(root: ParentNode) {
  if (root instanceof Element && root.matches(SELECTOR)) assign(root);
  root.querySelectorAll?.(SELECTOR).forEach(assign);
}

let observer: MutationObserver | null = null;

export function startNeonSweep() {
  if (typeof document === 'undefined' || observer) return;

  const boot = () => {
    // Se pone AQUI a propósito, con la página ya en pie: si algo revienta antes,
    // los títulos nunca quedan transparentes y la app sigue legible.
    document.documentElement.classList.add('neon-titles');

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
