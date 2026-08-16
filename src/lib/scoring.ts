import type { Client, EmploymentTenure } from '../types';

export interface BusinessSettings {
  min_down_payment_pct: number;
  base_interest_rate: number;
  commission_tier1: number;
  commission_tier2: number;
  commission_tier3: number;
  stock_alert_threshold: number;
  /**
   * OJO — este campo NO es un peso, es un BONO en puntos.
   * En este negocio la mayoría de los clientes no da inicial, así que no tenerla
   * no debe restar (ver ajuste pedido por Lucius, 2026-08). Se suma tal cual al
   * score final cuando el cliente sí da alguna inicial (>0%).
   * Se conserva el nombre de columna para no migrar la base de datos.
   */
  scoring_weight_downpayment: number;
  // Los cinco de abajo sí son pesos: se reparten el score base 0-100.
  // No hace falta que sumen exactamente 100 — el motor normaliza por la suma
  // real, así que bajar todos a la mitad no hunde a todos los clientes.
  scoring_weight_term: number;
  scoring_weight_income: number;
  scoring_weight_history: number;
  scoring_weight_tenure: number;
  scoring_weight_id: number;
}

export const DEFAULT_SETTINGS: BusinessSettings = {
  min_down_payment_pct: 10,
  base_interest_rate: 18,
  commission_tier1: 3,
  commission_tier2: 4,
  commission_tier3: 5,
  stock_alert_threshold: 80,
  scoring_weight_downpayment: 15, // bono, no peso
  scoring_weight_income: 30,
  scoring_weight_tenure: 22,
  scoring_weight_term: 20,
  scoring_weight_history: 20,
  scoring_weight_id: 8,
};

export type RiskProhibition = null | 'no_id' | 'short_tenure';

export interface RiskAssessment {
  score: number; // 0-100, higher = safer
  band: 'bajo' | 'medio' | 'alto';
  recommendation: 'aprobar' | 'revisar' | 'rechazar';
  prohibited: RiskProhibition;
  reasons: string[];
}

export const TENURE_OPTIONS: { value: EmploymentTenure; label: string }[] = [
  { value: 'lt-3m', label: 'Menos de 3 meses' },
  { value: '4-6m', label: '4 a 6 meses' },
  { value: '6m-1y', label: '6 meses a 1 año' },
  { value: '1-2y', label: '1 a 2 años' },
  { value: 'gt-2y', label: 'Más de 2 años' },
];

// ─── Factores 0–1 ────────────────────────────────────────────────────────
// Cada factor devuelve qué tan bien sale el cliente en ese criterio, de 0 (lo
// peor) a 1 (lo mejor). Luego se multiplican por su peso configurable.

function incomeFactor(income: number): number {
  if (income >= 400) return 1;
  if (income >= 300) return 0.85;
  if (income >= 200) return 0.6;
  if (income >= 120) return 0.35;
  return 0.1;
}

function tenureFactor(t: EmploymentTenure): number {
  switch (t) {
    case 'gt-2y': return 1;
    case '1-2y':  return 0.85;
    case '6m-1y': return 0.7;
    case '4-6m':  return 0.35;
    default:      return 0; // lt-3m — prohibido igual
  }
}

/** Carga de la cuota frente al ingreso. Menos carga = mejor. */
function burdenFactor(ratio: number): number {
  if (ratio < 0.1) return 1;
  if (ratio < 0.2) return 0.85;
  if (ratio < 0.3) return 0.6;
  if (ratio < 0.4) return 0.35;
  return 0.1;
}

function historyFactor(status: Client['status'] | undefined): number {
  switch (status) {
    case 'activo':    return 1;
    case 'en_mora':   return 0.15;
    case 'rechazado': return 0.3;
    default:          return 0.75; // prospecto / en_revision / aprobado — sin historial aún
  }
}

/**
 * Motor de scoring crediticio — modelo de factores ponderados.
 *
 * Reescrito el 2026-08: antes los pesos de Configuración se recibían en un
 * parámetro `_settings` que la función nunca leía, así que mover esas perillas
 * no cambiaba absolutamente nada. Ahora sí gobiernan el resultado.
 *
 * Prohibiciones duras (la venta no procede, score 0):
 *   - Sin cédula física
 *   - Menos de 3 meses en la empresa
 *
 * Score base = Σ (factor_i × peso_i) / Σ (peso_i) × 100
 * Se normaliza por la suma real de los pesos, así que no hace falta que sumen
 * exactamente 100 — si el admin los baja todos a la mitad, el score no se hunde.
 *
 * Extra: bono en puntos si el cliente da alguna inicial (>0%). No es un peso;
 * no dar inicial no resta, porque en este negocio es lo habitual.
 */
export function assessRisk(client: Partial<Client>, settings: BusinessSettings): RiskAssessment {
  const reasons: string[] = [];
  let prohibition: RiskProhibition = null;

  const hasId = client.hasPhysicalId !== false;
  const tenure = client.employmentTenure ?? '6m-1y';
  const income = client.monthlyIncome ?? 0;

  // 0. Hard prohibitions
  if (!hasId) {
    prohibition = 'no_id';
    reasons.push('No dispone de cédula física — venta prohibida');
  }
  if (tenure === 'lt-3m') {
    prohibition = 'short_tenure';
    reasons.push('Tiempo de trabajo menor a 3 meses — venta prohibida');
  }

  if (prohibition) {
    return {
      score: 0,
      band: 'alto',
      recommendation: 'rechazar',
      prohibited: prohibition,
      reasons,
    };
  }

  // 1. Carga de la cuota frente al ingreso mensual.
  const downPct = client.downPaymentPct ?? 0;
  const cost = client.productCost ?? 0;
  const financed = cost * (1 - downPct / 100);
  const term = client.termMonths ?? 12;
  const periodsPerYear = client.frequency === 'semanal' ? 52 : client.frequency === 'quincenal' ? 24 : 12;
  const r = (client.interestRate ?? 18) / 100 / periodsPerYear;
  const totalPeriods = Math.max(1, Math.round((term / 12) * periodsPerYear));
  const payment = r === 0 ? financed / totalPeriods : (financed * r) / (1 - Math.pow(1 + r, -totalPeriods));
  const monthlyPayment = payment * (periodsPerYear / 12);
  // Sin ingreso declarado no se puede juzgar la carga — se asume la peor.
  const ratio = income > 0 ? monthlyPayment / income : 1;

  // 2. Score base ponderado. Los pesos vienen de Configuración.
  const w = {
    income:  Math.max(0, settings.scoring_weight_income),
    tenure:  Math.max(0, settings.scoring_weight_tenure),
    term:    Math.max(0, settings.scoring_weight_term),
    history: Math.max(0, settings.scoring_weight_history),
    id:      Math.max(0, settings.scoring_weight_id),
  };
  const totalWeight = w.income + w.tenure + w.term + w.history + w.id;

  const f = {
    income:  incomeFactor(income),
    tenure:  tenureFactor(tenure),
    term:    burdenFactor(ratio),
    history: historyFactor(client.status),
    id:      hasId ? 1 : 0,
  };

  // Si el admin puso todos los pesos en 0, no hay modelo — se cae a un valor
  // neutro en vez de dividir entre cero.
  let score = totalWeight === 0
    ? 50
    : ((f.income * w.income + f.tenure * w.tenure + f.term * w.term +
        f.history * w.history + f.id * w.id) / totalWeight) * 100;

  // 3. Razones legibles — se explican los factores que más pesan en el resultado.
  if (income >= 300) reasons.push(`Ingreso sólido ($${income}/mes)`);
  else if (income >= 200) reasons.push(`Ingreso moderado ($${income}/mes)`);
  else if (income > 0) reasons.push(`Ingreso mensual bajo ($${income}/mes)`);
  else reasons.push('Sin ingreso declarado');

  if (tenure === 'gt-2y') reasons.push('Estabilidad laboral excelente (más de 2 años)');
  else if (tenure === '1-2y') reasons.push('Buena estabilidad laboral (1 a 2 años)');
  else if (tenure === '6m-1y') reasons.push('Antigüedad laboral aceptable (6 meses a 1 año)');
  else reasons.push('Antigüedad laboral corta (menos de 6 meses)');

  if (income > 0) {
    if (ratio >= 0.4) reasons.push(`Cuota representa ${(ratio * 100).toFixed(0)}% del ingreso — riesgo alto de impago`);
    else if (ratio >= 0.3) reasons.push(`Cuota representa ${(ratio * 100).toFixed(0)}% del ingreso`);
    else if (ratio < 0.1) reasons.push('Cuota fácilmente asumible frente al ingreso');
  }

  if (client.status === 'en_mora') reasons.push('Cliente con historial de mora');
  else if (client.status === 'activo') reasons.push('Cliente con buen historial de pago');

  // 4. Bono por inicial — nunca penaliza su ausencia.
  if (downPct > 0) {
    score += settings.scoring_weight_downpayment;
    reasons.push(`Tiene inicial (${downPct}%) — reduce el riesgo`);
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  let band: RiskAssessment['band'];
  let recommendation: RiskAssessment['recommendation'];
  if (score >= 75) {
    band = 'bajo';
    recommendation = 'aprobar';
  } else if (score >= 50) {
    band = 'medio';
    recommendation = 'revisar';
  } else {
    band = 'alto';
    recommendation = 'rechazar';
  }

  return { score, band, recommendation, prohibited: null, reasons };
}

export const RISK_BAND_STYLES: Record<RiskAssessment['band'], { color: string; bg: string; label: string }> = {
  bajo: { color: 'text-success-500', bg: 'bg-success/15', label: 'Riesgo Bajo' },
  medio: { color: 'text-warning-400', bg: 'bg-warning/15', label: 'Riesgo Medio' },
  alto: { color: 'text-danger-400', bg: 'bg-danger/15', label: 'Riesgo Alto' },
};

export const RECOMMENDATION_STYLES: Record<RiskAssessment['recommendation'], string> = {
  aprobar: 'bg-success/15 text-success-500',
  revisar: 'bg-warning/15 text-warning-400',
  rechazar: 'bg-danger/15 text-danger-400',
};
