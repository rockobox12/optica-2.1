/**
 * Predictive clinical analytics engine.
 * Provides:
 * - 3-year myopic projection based on historical trend
 * - Visual Risk Score (0-100)
 * - Advanced treatment recommendations
 */

import type { PreviousExamData } from '@/lib/clinical-advanced-diagnosis';

// ── Types ───────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface MyopicProjection {
  eye: 'OD' | 'OI';
  currentSph: number;
  annualRate: number; // D per year (negative = worsening)
  projected3yr: number;
  dataPoints: number;
  isSignificant: boolean; // rate > -0.50/yr
}

export interface VisualRiskScore {
  score: number;
  level: RiskLevel;
  breakdown: RiskFactor[];
}

export interface RiskFactor {
  label: string;
  points: number;
  active: boolean;
}

export interface TreatmentRecommendation {
  id: string;
  label: string;
  reason: string;
  category: 'lens' | 'treatment' | 'followup';
  priority: 'high' | 'medium' | 'low';
}

export interface PredictiveAnalysisResult {
  projections: MyopicProjection[];
  riskScore: VisualRiskScore;
  treatments: TreatmentRecommendation[];
  hasEnoughHistory: boolean;
}

export interface HistoricalExam {
  examDate: string;
  odSphere: number | null;
  odCylinder: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
}

// ── Risk Level helpers ──────────────────────────────────────────

function classifyRisk(score: number): RiskLevel {
  if (score <= 25) return 'low';
  if (score <= 50) return 'moderate';
  if (score <= 75) return 'high';
  return 'very_high';
}

export const riskLevelConfig: Record<RiskLevel, { label: string; color: string; barColor: string }> = {
  low: { label: 'Riesgo Bajo', color: 'text-green-600 dark:text-green-400', barColor: 'bg-green-500' },
  moderate: { label: 'Riesgo Moderado', color: 'text-yellow-600 dark:text-yellow-400', barColor: 'bg-yellow-500' },
  high: { label: 'Riesgo Alto', color: 'text-orange-600 dark:text-orange-400', barColor: 'bg-orange-500' },
  very_high: { label: 'Riesgo Muy Alto', color: 'text-red-600 dark:text-red-400', barColor: 'bg-red-500' },
};

// ── Projection Calculator ───────────────────────────────────────

function computeProjection(
  currentSph: number | null,
  history: { date: string; sph: number }[],
  eye: 'OD' | 'OI',
): MyopicProjection | null {
  if (currentSph === null || history.length < 1) return null;

  // We need at least 1 previous exam + current to calculate rate
  // Sort by date ascending
  const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate annual rate using earliest and most recent
  const earliest = sorted[0];
  const earliestDate = new Date(earliest.date);
  const now = new Date();
  const yearsDiff = (now.getTime() - earliestDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (yearsDiff < 0.1) return null; // Less than ~1 month, not enough time

  const sphChange = currentSph - earliest.sph;
  const annualRate = sphChange / yearsDiff;

  // Only project for myopic progression (negative rate)
  const projected3yr = currentSph + annualRate * 3;
  const isSignificant = annualRate <= -0.50;

  return {
    eye,
    currentSph,
    annualRate,
    projected3yr,
    dataPoints: history.length + 1, // +1 for current
    isSignificant,
  };
}

// ── Risk Score Calculator ───────────────────────────────────────

function computeRiskScore(
  odSph: number | null,
  oiSph: number | null,
  odCyl: number | null,
  oiCyl: number | null,
  patientAge: number | null,
  annualRateOd: number | null,
  annualRateOi: number | null,
  odSE: number | null,
  oiSE: number | null,
): VisualRiskScore {
  const factors: RiskFactor[] = [];
  let score = 0;

  const maxMyopia = Math.min(odSph ?? 0, oiSph ?? 0);
  const maxAbsCyl = Math.max(Math.abs(odCyl ?? 0), Math.abs(oiCyl ?? 0));
  const maxProgRate = Math.min(annualRateOd ?? 0, annualRateOi ?? 0);

  // Myopia ≥ -6.00
  const highMyopia = maxMyopia <= -6.00;
  factors.push({ label: 'Miopía alta (≥ -6.00D)', points: 30, active: highMyopia });
  if (highMyopia) score += 30;

  // Myopia ≥ -3.00
  const modMyopia = !highMyopia && maxMyopia <= -3.00;
  factors.push({ label: 'Miopía moderada (≥ -3.00D)', points: 20, active: modMyopia });
  if (modMyopia) score += 20;

  // Astigmatism ≥ 2.00
  const highAst = maxAbsCyl >= 2.00;
  factors.push({ label: 'Astigmatismo elevado (≥ 2.00D)', points: 15, active: highAst });
  if (highAst) score += 15;

  // Annual progression ≥ -0.50
  const hasProgression = maxProgRate <= -0.50;
  factors.push({ label: 'Progresión anual ≥ -0.50D', points: 10, active: hasProgression });
  if (hasProgression) score += 10;

  // Anisometropia ≥ 2.00
  const seDiff = (odSE !== null && oiSE !== null) ? Math.abs(odSE - oiSE) : 0;
  const hasAniso = seDiff >= 2.00;
  factors.push({ label: 'Anisometropía (≥ 2.00D)', points: 15, active: hasAniso });
  if (hasAniso) score += 15;

  // Age < 16 with progression
  const youngProg = patientAge !== null && patientAge < 16 && hasProgression;
  factors.push({ label: 'Menor de 16 con progresión', points: 10, active: youngProg });
  if (youngProg) score += 10;

  score = Math.min(100, score);

  return {
    score,
    level: classifyRisk(score),
    breakdown: factors,
  };
}

// ── Treatment Recommendations ───────────────────────────────────

function generateTreatments(
  odSph: number | null,
  oiSph: number | null,
  odCyl: number | null,
  oiCyl: number | null,
  odAdd: number | null,
  oiAdd: number | null,
  patientAge: number | null,
  riskLevel: RiskLevel,
  hasProgression: boolean,
): TreatmentRecommendation[] {
  const treatments: TreatmentRecommendation[] = [];
  const maxMyopia = Math.min(odSph ?? 0, oiSph ?? 0);
  const maxAbsCyl = Math.max(Math.abs(odCyl ?? 0), Math.abs(oiCyl ?? 0));
  const hasPresbyopia = (odAdd !== null && odAdd >= 0.75) || (oiAdd !== null && oiAdd >= 0.75);
  const isChild = patientAge !== null && patientAge < 18;

  // MYOPIC PROGRESSIVE
  if (hasProgression) {
    treatments.push({
      id: 'tx_myopia_control',
      label: 'Lentes control de miopía',
      reason: 'Progresión miópica detectada. Lentes especializados pueden reducir la tasa de avance.',
      category: 'lens',
      priority: 'high',
    });
    treatments.push({
      id: 'tx_blue_filter',
      label: 'Filtro de luz azul',
      reason: 'Protección para paciente con miopía progresiva.',
      category: 'treatment',
      priority: 'medium',
    });
    treatments.push({
      id: 'tx_ar_premium_prog',
      label: 'AR Premium',
      reason: 'Máxima calidad óptica para paciente con progresión activa.',
      category: 'treatment',
      priority: 'high',
    });
    treatments.push({
      id: 'tx_followup_6m',
      label: 'Seguimiento cada 6 meses',
      reason: 'Monitoreo cercano de la progresión miópica.',
      category: 'followup',
      priority: 'high',
    });
  }

  // HIGH MYOPIA
  if (maxMyopia <= -6.00) {
    treatments.push({
      id: 'tx_high_index',
      label: 'Lente índice alto (1.67+)',
      reason: `Miopía alta (${maxMyopia.toFixed(2)}D). Reduce grosor y peso del lente.`,
      category: 'lens',
      priority: 'high',
    });
    treatments.push({
      id: 'tx_uv_protection',
      label: 'Protección UV',
      reason: 'Paciente con miopía alta tiene mayor riesgo de daño retiniano.',
      category: 'treatment',
      priority: 'medium',
    });
    if (!hasProgression) {
      treatments.push({
        id: 'tx_annual_review',
        label: 'Revisión anual',
        reason: 'Miopía alta requiere seguimiento regular.',
        category: 'followup',
        priority: 'medium',
      });
    }
  }

  // HIGH ASTIGMATISM
  if (maxAbsCyl >= 2.00) {
    treatments.push({
      id: 'tx_ar_astig',
      label: 'AR obligatorio',
      reason: `Astigmatismo elevado (${maxAbsCyl.toFixed(2)}D). AR es indispensable para nitidez.`,
      category: 'treatment',
      priority: 'high',
    });
    treatments.push({
      id: 'tx_digital_lens',
      label: 'Lente digital',
      reason: 'Mejor calidad óptica periférica para astigmatismo alto.',
      category: 'lens',
      priority: 'medium',
    });
  }

  // PRESBYOPIA
  if (hasPresbyopia) {
    treatments.push({
      id: 'tx_progressive',
      label: 'Lente progresivo',
      reason: 'Presbicia presente. Visión a todas las distancias.',
      category: 'lens',
      priority: 'high',
    });
    treatments.push({
      id: 'tx_ar_presby',
      label: 'Antirreflejante',
      reason: 'Mejora la visión en condiciones de baja luz para paciente présbita.',
      category: 'treatment',
      priority: 'medium',
    });
    treatments.push({
      id: 'tx_photochromic',
      label: 'Fotocromático (opcional)',
      reason: 'Comodidad en exteriores sin necesidad de lentes de sol adicionales.',
      category: 'treatment',
      priority: 'low',
    });
  }

  // OFFICE WORKER suggestion (age > 30 with presbyopia or moderate prescription)
  if (hasPresbyopia || (patientAge !== null && patientAge >= 35)) {
    treatments.push({
      id: 'tx_occupational',
      label: 'Lente ocupacional',
      reason: 'Ideal para trabajo en oficina (visión intermedia y cerca).',
      category: 'lens',
      priority: 'low',
    });
    if (!hasProgression) {
      treatments.push({
        id: 'tx_blue_office',
        label: 'Filtro azul (oficina)',
        reason: 'Protección contra fatiga visual por pantallas.',
        category: 'treatment',
        priority: 'low',
      });
    }
  }

  // CHILD MYOPIA CONTROL
  if (isChild && maxMyopia <= -0.50 && !hasProgression) {
    treatments.push({
      id: 'tx_child_eval',
      label: 'Evaluar control de miopía',
      reason: 'Paciente menor de 18 años con miopía. Seguimiento recomendado.',
      category: 'followup',
      priority: 'medium',
    });
  }

  // Deduplicate by id
  return Array.from(new Map(treatments.map(t => [t.id, t])).values());
}

// ── Main Entry Point ────────────────────────────────────────────

export function computePredictiveAnalysis(
  odSph: number | null,
  odCyl: number | null,
  odAdd: number | null,
  oiSph: number | null,
  oiCyl: number | null,
  oiAdd: number | null,
  patientAge: number | null,
  examHistory: HistoricalExam[],
): PredictiveAnalysisResult {
  const hasEnoughHistory = examHistory.length >= 2;

  // Build history arrays per eye
  const odHistory = examHistory
    .filter(e => e.odSphere !== null)
    .map(e => ({ date: e.examDate, sph: e.odSphere! }));
  const oiHistory = examHistory
    .filter(e => e.oiSphere !== null)
    .map(e => ({ date: e.examDate, sph: e.oiSphere! }));

  // Projections
  const projections: MyopicProjection[] = [];
  const odProj = computeProjection(odSph, odHistory, 'OD');
  if (odProj) projections.push(odProj);
  const oiProj = computeProjection(oiSph, oiHistory, 'OI');
  if (oiProj) projections.push(oiProj);

  // SE for anisometropia
  const odSE = odSph !== null ? odSph + (odCyl ?? 0) / 2 : null;
  const oiSE = oiSph !== null ? oiSph + (oiCyl ?? 0) / 2 : null;

  // Risk score
  const riskScore = computeRiskScore(
    odSph, oiSph, odCyl, oiCyl, patientAge,
    odProj?.annualRate ?? null, oiProj?.annualRate ?? null,
    odSE, oiSE,
  );

  const hasProgression = projections.some(p => p.isSignificant);

  // Treatment recommendations
  const treatments = generateTreatments(
    odSph, oiSph, odCyl, oiCyl, odAdd, oiAdd,
    patientAge, riskScore.level, hasProgression,
  );

  return { projections, riskScore, treatments, hasEnoughHistory };
}
