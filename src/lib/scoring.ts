import type { Client, EmploymentTenure } from '../types';

export interface BusinessSettings {
  min_down_payment_pct: number;
  base_interest_rate: number;
  commission_tier1: number;
  commission_tier2: number;
  commission_tier3: number;
  stock_alert_threshold: number;
  scoring_weight_downpayment: number;
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
  scoring_weight_downpayment: 22,
  scoring_weight_term: 16,
  scoring_weight_income: 20,
  scoring_weight_history: 20,
  scoring_weight_tenure: 14,
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

/** Tenure qualifies for the "6 months or more" threshold the user described. */
function tenureAtLeast6m(t: EmploymentTenure): boolean {
  return t === '6m-1y' || t === '1-2y' || t === 'gt-2y';
}

/**
 * Credit risk scoring engine — rule-based, aligned con criterios del negocio.
 * Ajustado el 2026-08 a pedido de Lucius: el negocio casi nunca recibe inicial,
 * así que ya no se castiga no tenerla — solo se premia cuando sí la hay.
 *
 * Hard prohibitions (sale cannot proceed):
 *   - No physical cédula
 *   - Less than 3 months at company
 *
 * Base score from the three key factors:
 *   - Excellent (80): income >= $300/mo AND tenure >= 6m AND has ID
 *   - Good (60):      income >= $200/mo AND tenure >= 6m AND has ID
 *   - Fair (45):      income >= $120/mo AND tenure >= 6m AND has ID
 *   - Fair (40):      income >= $200/mo AND tenure >= 4m AND has ID
 *   - Poor (25):      everything else
 *
 * Modifiers:
 *   + Down payment bonus flat +15 si hay alguna inicial (>0%) — no hay penalización por no tenerla
 *   + Tenure bonus for >1 year (up to +5)
 *   - Payment-to-income ratio penalty (up to -15)
 *   - History penalty for mora (-10) / bonus for active (+5)
 */
export function assessRisk(client: Partial<Client>, _settings: BusinessSettings): RiskAssessment {
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

  // 1. Base score from the three key factors
  let score: number;
  const sixMonths = tenureAtLeast6m(tenure);

  if (income >= 300 && sixMonths && hasId) {
    score = 80;
    reasons.push('Excelente lead: ingreso >= $300/mo, más de 6 meses trabajando y cédula física');
  } else if (income >= 200 && sixMonths && hasId) {
    score = 60;
    reasons.push('Cliente apto a nivel medio: ingreso >= $200/mo, más de 6 meses y cédula física');
  } else if (income >= 120 && sixMonths && hasId) {
    score = 45;
    reasons.push('Ingreso y estabilidad aceptables pero limitados');
  } else if (income >= 200 && (tenure === '4-6m') && hasId) {
    score = 40;
    reasons.push('Buen ingreso pero antigüedad laboral insuficiente (menos de 6 meses)');
  } else {
    score = 25;
    if (income < 120) reasons.push('Ingreso mensual bajo');
    if (!sixMonths) reasons.push('Antigüedad laboral menor a 6 meses');
  }

  // 2. Down payment modifier — en este negocio casi nunca hay inicial, así que no tenerla
  // no resta puntos. Solo se premia cuando sí hay alguna (>0%).
  const downPct = client.downPaymentPct ?? 0;
  if (downPct > 0) {
    score += 15;
    reasons.push('Tiene inicial — reduce el riesgo');
  }

  // 3. Tenure bonus for >1 year
  if (tenure === '1-2y') {
    score += 3;
  } else if (tenure === 'gt-2y') {
    score += 5;
    reasons.push('Estabilidad laboral excelente (más de 2 años)');
  }

  // 4. Payment-to-income ratio penalty
  const cost = client.productCost ?? 0;
  const financed = cost * (1 - downPct / 100);
  const term = client.termMonths ?? 12;
  const periodsPerYear = client.frequency === 'semanal' ? 52 : client.frequency === 'quincenal' ? 24 : 12;
  const r = (client.interestRate ?? 18) / 100 / periodsPerYear;
  const totalPeriods = Math.max(1, Math.round((term / 12) * periodsPerYear));
  const payment = r === 0 ? financed / totalPeriods : (financed * r) / (1 - Math.pow(1 + r, -totalPeriods));
  const paymentsPerMonth = periodsPerYear / 12;
  const monthlyPayment = payment * paymentsPerMonth;

  if (income > 0) {
    const ratio = monthlyPayment / income;
    if (ratio >= 0.4) {
      score -= 15;
      reasons.push(`Cuota representa ${(ratio * 100).toFixed(0)}% del ingreso — riesgo alto de impago`);
    } else if (ratio >= 0.3) {
      score -= 8;
      reasons.push(`Cuota representa ${(ratio * 100).toFixed(0)}% del ingreso`);
    } else if (ratio < 0.1 && income > 0) {
      reasons.push('Cuota fácilmente asumible frente al ingreso');
    }
  }

  // 5. Payment history
  if (client.status === 'en_mora') {
    score -= 10;
    reasons.push('Cliente con historial de mora');
  } else if (client.status === 'activo') {
    score += 5;
    reasons.push('Cliente con buen historial de pago');
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
