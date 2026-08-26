// ============================================================
// Multimoneda.
//
// Regla de oro: **el dólar es la moneda de la deuda**. Todo lo que se
// guarda en la base — precio, cuota, saldo, mora — está en USD y no se
// toca. El euro y el bolívar son solo formas de VER ese mismo monto.
//
// Así, comparar el mes pasado con este siempre tiene sentido, aunque la
// tasa haya cambiado diez veces en el medio.
// ============================================================

export type Currency = 'USD' | 'EUR' | 'VES';

export interface Rates {
  /** Cuántos bolívares vale un dólar, según el BCV. */
  usdToVes: number | null;
  /** Cuántos bolívares vale un euro, según el BCV. */
  eurToVes: number | null;
  /** Día al que corresponde la tasa (YYYY-MM-DD). */
  rateDate: string | null;
  /** 'bcv' si se leyó automático, 'manual' si se escribió a mano. */
  source: string | null;
}

export const EMPTY_RATES: Rates = {
  usdToVes: null, eurToVes: null, rateDate: null, source: null,
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: 'Dólares',
  EUR: 'Euros',
  VES: 'Bolívares',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  VES: 'Bs',
};

// ── Estado a nivel de módulo ────────────────────────────────
// `fmtMoney` se llama en 76 sitios como función suelta, no como hook.
// Guardar aquí la moneda elegida evita tener que reescribir los 76.
// Quien cambia la moneda es el CurrencyProvider, que además fuerza el
// redibujado para que los montos en pantalla se actualicen.

let displayCurrency: Currency = 'USD';
let currentRates: Rates = EMPTY_RATES;

export function setDisplayCurrency(c: Currency) { displayCurrency = c; }
export function getDisplayCurrency(): Currency { return displayCurrency; }
export function setRates(r: Rates) { currentRates = r; }
export function getRates(): Rates { return currentRates; }

/** Redondeo a 2 decimales en cada paso. Nunca encadenar sin redondear:
 *  los errores de coma flotante se acumulan y descuadran la cartera. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Convierte un monto en dólares a la moneda pedida.
 * Devuelve `null` si falta la tasa — así quien llama puede avisar en vez
 * de mostrar un número inventado.
 */
export function fromUsd(usd: number, to: Currency, rates: Rates = currentRates): number | null {
  if (to === 'USD') return round2(usd);
  if (to === 'VES') {
    if (!rates.usdToVes) return null;
    return round2(usd * rates.usdToVes);
  }
  // EUR: se cruza por el bolívar, que es lo que publica el BCV.
  if (!rates.usdToVes || !rates.eurToVes) return null;
  return round2(usd * (rates.usdToVes / rates.eurToVes));
}

/** Convierte a dólares un monto escrito en otra moneda (al registrar precios). */
export function toUsd(amount: number, from: Currency, rates: Rates = currentRates): number | null {
  if (from === 'USD') return round2(amount);
  if (from === 'VES') {
    if (!rates.usdToVes) return null;
    return round2(amount / rates.usdToVes);
  }
  if (!rates.usdToVes || !rates.eurToVes) return null;
  return round2(amount * (rates.eurToVes / rates.usdToVes));
}

/** Cuántos dólares vale un euro hoy. Útil para mostrar la equivalencia. */
export function eurToUsdRate(rates: Rates = currentRates): number | null {
  if (!rates.usdToVes || !rates.eurToVes) return null;
  return rates.eurToVes / rates.usdToVes;
}

/**
 * Formatea un monto que está en dólares, mostrándolo en la moneda elegida.
 * Si falta la tasa para convertir, cae al dólar y lo marca, en vez de
 * mostrar "Bs 0" que sería mentira.
 */
export function formatMoney(usd: number, opts?: { compact?: boolean }): string {
  const cur = displayCurrency;
  const valor = fromUsd(usd, cur);

  if (valor === null) {
    // Sin tasa: se muestra en dólares con un aviso discreto.
    return formatNumber(usd, 'USD', opts?.compact) + ' *';
  }
  return formatNumber(valor, cur, opts?.compact);
}

function formatNumber(n: number, cur: Currency, compact?: boolean): string {
  const simbolo = CURRENCY_SYMBOLS[cur];
  // En bolívares los números son enormes; con decimales no se leen.
  const decimales = cur === 'VES' ? 0 : 2;

  if (compact && Math.abs(n) >= 1000) {
    const miles = n / 1000;
    return `${simbolo}${miles.toLocaleString('es-VE', { maximumFractionDigits: 1 })}k`;
  }

  const txt = n.toLocaleString('es-VE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimales,
  });
  // "Bs" necesita espacio; "$" y "€" van pegados.
  return cur === 'VES' ? `${simbolo} ${txt}` : `${simbolo}${txt}`;
}

/** ¿Se puede mostrar en esta moneda ahora mismo? */
export function canDisplay(cur: Currency, rates: Rates = currentRates): boolean {
  if (cur === 'USD') return true;
  if (cur === 'VES') return !!rates.usdToVes;
  return !!(rates.usdToVes && rates.eurToVes);
}
