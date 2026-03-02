/**
 * Clinical-Commercial Decision Engine
 * Extends predictive analytics with:
 * 1. Early review alerts (auto-suggest appointments)
 * 2. Commercial lens level recommendations (Básico/Intermedio/Premium)
 * 3. History-based anomaly detection
 * 4. Printable clinical summary data generation
 */

import type { PredictiveAnalysisResult, VisualRiskScore, MyopicProjection, TreatmentRecommendation } from './clinical-predictive';
import type { AdvancedDiagnosisResult, ClinicalAlert } from './clinical-advanced-diagnosis';

// ── Types ───────────────────────────────────────────────────────

export type ReviewUrgency = 'routine' | 'recommended' | 'urgent';
export type LensLevel = 'basico' | 'intermedio' | 'premium';

export interface EarlyReviewAlert {
  id: string;
  urgency: ReviewUrgency;
  title: string;
  description: string;
  suggestedMonths: number;
  whatsappMessage: string;
}

export interface CommercialRecommendation {
  lensLevel: LensLevel;
  lensLevelLabel: string;
  lensLevelDescription: string;
  clinicalJustification: string;
  commercialSuggestion: string;
  features: string[];
}

export interface HistoryAnomaly {
  id: string;
  eye: 'OD' | 'OI' | 'bilateral';
  title: string;
  description: string;
  severity: 'info' | 'warning';
}

export interface ClinicalSummaryData {
  patientName: string;
  patientAge: number | null;
  examDate: string;
  diagnosis: string;
  previousComparison: string | null;
  projections: MyopicProjection[];
  riskScore: VisualRiskScore;
  alerts: ClinicalAlert[];
  treatments: TreatmentRecommendation[];
  commercialRec: CommercialRecommendation;
  reviewAlerts: EarlyReviewAlert[];
  specialistName: string;
  disclaimer: string;
}

export interface CommercialEngineResult {
  reviewAlerts: EarlyReviewAlert[];
  commercial: CommercialRecommendation;
  anomalies: HistoryAnomaly[];
}

// ── Review Alert Generator ──────────────────────────────────────

function generateReviewAlerts(
  predictive: PredictiveAnalysisResult,
  advanced: AdvancedDiagnosisResult,
  patientAge: number | null,
  patientName: string,
  odSph: number | null,
  oiSph: number | null,
  odCyl: number | null,
  oiCyl: number | null,
): EarlyReviewAlert[] {
  const alerts: EarlyReviewAlert[] = [];
  const firstName = patientName.split(' ')[0] || 'Paciente';

  // Myopic progression > -0.50D/yr
  const hasProgression = predictive.projections.some(p => p.isSignificant);
  if (hasProgression) {
    alerts.push({
      id: 'review_progression',
      urgency: 'urgent',
      title: 'Progresión miópica activa',
      description: 'Revisión recomendada en 6 meses para monitorear progresión.',
      suggestedMonths: 6,
      whatsappMessage: `Hola ${firstName}, le recordamos que su revisión visual está programada. Debido a cambios en su graduación, le recomendamos acudir antes de 6 meses. ¿Le gustaría agendar su cita? - Óptica Istmeña`,
    });
  }

  // High astigmatism increase (check from advanced alerts)
  const astigIncrease = advanced.alerts.some(a =>
    a.category === 'keratoconus' && (a.level === 'danger' || a.level === 'warning')
  );
  if (astigIncrease) {
    alerts.push({
      id: 'review_astigmatism',
      urgency: 'urgent',
      title: 'Astigmatismo irregular detectado',
      description: 'Evaluación corneal recomendada. Agendar seguimiento.',
      suggestedMonths: 3,
      whatsappMessage: `Hola ${firstName}, detectamos cambios importantes en su graduación que requieren seguimiento. Le recomendamos una revisión pronto. ¿Le agendamos cita? - Óptica Istmeña`,
    });
  }

  // High myopia
  const maxMyopia = Math.min(odSph ?? 0, oiSph ?? 0);
  if (maxMyopia <= -6.00 && !hasProgression) {
    alerts.push({
      id: 'review_high_myopia',
      urgency: 'recommended',
      title: 'Miopía alta - revisión anual',
      description: 'Paciente con miopía alta requiere seguimiento anual.',
      suggestedMonths: 12,
      whatsappMessage: `Hola ${firstName}, como parte de su seguimiento anual por miopía alta, le recordamos agendar su próxima revisión. - Óptica Istmeña`,
    });
  }

  // Risk score ≥ 60
  if (predictive.riskScore.score >= 60 && !hasProgression && !astigIncrease) {
    alerts.push({
      id: 'review_high_risk',
      urgency: 'recommended',
      title: 'Score de riesgo elevado',
      description: `Score ${predictive.riskScore.score}/100. Seguimiento recomendado antes de 12 meses.`,
      suggestedMonths: 6,
      whatsappMessage: `Hola ${firstName}, basándonos en su historial clínico, le recomendamos una revisión antes de 12 meses. ¿Desea agendar? - Óptica Istmeña`,
    });
  }

  // Child with any prescription
  if (patientAge !== null && patientAge < 18 && (odSph !== null || oiSph !== null)) {
    const hasExisting = alerts.some(a => a.urgency === 'urgent');
    if (!hasExisting) {
      alerts.push({
        id: 'review_pediatric',
        urgency: 'recommended',
        title: 'Paciente pediátrico',
        description: 'Revisión cada 6-12 meses recomendada para menores.',
        suggestedMonths: 6,
        whatsappMessage: `Hola, le recordamos la revisión visual de ${firstName}. En pacientes jóvenes es importante el seguimiento regular. ¿Agendamos cita? - Óptica Istmeña`,
      });
    }
  }

  return alerts;
}

// ── Commercial Recommendation Engine ────────────────────────────

function generateCommercialRec(
  predictive: PredictiveAnalysisResult,
  odSph: number | null,
  oiSph: number | null,
  odCyl: number | null,
  oiCyl: number | null,
  odAdd: number | null,
  oiAdd: number | null,
  patientAge: number | null,
  diagnosis: string,
): CommercialRecommendation {
  const maxAbsSph = Math.max(Math.abs(odSph ?? 0), Math.abs(oiSph ?? 0));
  const maxAbsCyl = Math.max(Math.abs(odCyl ?? 0), Math.abs(oiCyl ?? 0));
  const hasPresbyopia = (odAdd !== null && odAdd >= 0.75) || (oiAdd !== null && oiAdd >= 0.75);
  const hasProgression = predictive.projections.some(p => p.isSignificant);
  const riskHigh = predictive.riskScore.score >= 50;

  // Score-based level determination
  let score = 0;
  if (maxAbsSph >= 6.00) score += 3;
  else if (maxAbsSph >= 3.00) score += 2;
  else if (maxAbsSph >= 1.00) score += 1;

  if (maxAbsCyl >= 2.00) score += 3;
  else if (maxAbsCyl >= 1.00) score += 1;

  if (hasPresbyopia) score += 2;
  if (hasProgression) score += 2;
  if (riskHigh) score += 1;
  if (patientAge !== null && patientAge < 18) score += 1;

  let lensLevel: LensLevel;
  let lensLevelLabel: string;
  let lensLevelDescription: string;
  let features: string[] = [];

  if (score >= 6) {
    lensLevel = 'premium';
    lensLevelLabel = 'Premium';
    lensLevelDescription = 'Máxima calidad óptica y protección';
    features = ['Lente digital free-form', 'AR Premium multicapa', 'Protección UV 100%'];
    if (hasPresbyopia) features.push('Progresivo personalizado');
    if (maxAbsSph >= 6.00) features.push('Índice alto (1.67+)');
    if (hasProgression) features.push('Filtro luz azul premium');
  } else if (score >= 3) {
    lensLevel = 'intermedio';
    lensLevelLabel = 'Intermedio';
    lensLevelDescription = 'Buena calidad con protección estándar';
    features = ['Lente de buena calidad', 'AR estándar', 'Protección UV'];
    if (hasPresbyopia) features.push('Progresivo estándar');
    if (maxAbsSph >= 3.00) features.push('Índice medio (1.60)');
  } else {
    lensLevel = 'basico';
    lensLevelLabel = 'Básico';
    lensLevelDescription = 'Corrección visual funcional';
    features = ['Lente monofocal estándar', 'AR básico'];
    if (hasPresbyopia) features.push('Bifocal flat-top');
  }

  // Build justification
  const justParts: string[] = [];
  if (diagnosis) justParts.push(diagnosis.replace(/\.$/, ''));
  if (hasProgression) justParts.push('con progresión miópica activa');
  if (maxAbsCyl >= 2.00) justParts.push('astigmatismo elevado');
  if (hasPresbyopia) justParts.push('presbicia presente');

  const clinicalJustification = justParts.length > 0
    ? `Paciente ${justParts.join(', ')}.`
    : 'Graduación dentro de parámetros normales.';

  const commercialSuggestion = `Recomendación: Lente nivel ${lensLevelLabel}. ${features.slice(0, 3).join(' + ')}.`;

  return {
    lensLevel,
    lensLevelLabel,
    lensLevelDescription,
    clinicalJustification,
    commercialSuggestion,
    features,
  };
}

// ── History Anomaly Detection ───────────────────────────────────

export interface HistoricalDataPoint {
  examDate: string;
  odSphere: number | null;
  odCylinder: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
}

function detectAnomalies(
  currentOdSph: number | null,
  currentOiSph: number | null,
  currentOdCyl: number | null,
  currentOiCyl: number | null,
  history: HistoricalDataPoint[],
): HistoryAnomaly[] {
  if (history.length < 2) return [];

  const anomalies: HistoryAnomaly[] = [];

  // Calculate historical trend and check for deviations
  const checkAnomaly = (
    current: number | null,
    historicalValues: number[],
    eye: 'OD' | 'OI',
    param: string,
  ) => {
    if (current === null || historicalValues.length < 2) return;

    // Calculate mean and std deviation of historical values
    const mean = historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length;
    const variance = historicalValues.reduce((s, v) => s + (v - mean) ** 2, 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);

    // If std dev is very small, use a minimum threshold
    const threshold = Math.max(stdDev * 2, 0.75);

    const deviation = Math.abs(current - mean);
    if (deviation > threshold) {
      anomalies.push({
        id: `anomaly_${param}_${eye}`,
        eye,
        title: `Cambio inusual en ${param} ${eye}`,
        description: `Valor actual (${current >= 0 ? '+' : ''}${current.toFixed(2)}D) se desvía significativamente de la tendencia histórica (promedio: ${mean >= 0 ? '+' : ''}${mean.toFixed(2)}D). Verificar medición.`,
        severity: deviation > threshold * 1.5 ? 'warning' : 'info',
      });
    }
  };

  const odSphHistory = history.filter(h => h.odSphere !== null).map(h => h.odSphere!);
  const oiSphHistory = history.filter(h => h.oiSphere !== null).map(h => h.oiSphere!);
  const odCylHistory = history.filter(h => h.odCylinder !== null).map(h => h.odCylinder!);
  const oiCylHistory = history.filter(h => h.oiCylinder !== null).map(h => h.oiCylinder!);

  checkAnomaly(currentOdSph, odSphHistory, 'OD', 'SPH');
  checkAnomaly(currentOiSph, oiSphHistory, 'OI', 'SPH');
  checkAnomaly(currentOdCyl, odCylHistory, 'OD', 'CYL');
  checkAnomaly(currentOiCyl, oiCylHistory, 'OI', 'CYL');

  return anomalies;
}

// ── Clinical Summary Data Builder ───────────────────────────────

export function buildClinicalSummaryData(
  patientName: string,
  patientAge: number | null,
  diagnosis: string,
  previousComparison: string | null,
  predictive: PredictiveAnalysisResult,
  advanced: AdvancedDiagnosisResult,
  commercial: CommercialRecommendation,
  reviewAlerts: EarlyReviewAlert[],
  specialistName: string,
): ClinicalSummaryData {
  return {
    patientName,
    patientAge,
    examDate: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
    diagnosis,
    previousComparison,
    projections: predictive.projections,
    riskScore: predictive.riskScore,
    alerts: advanced.alerts,
    treatments: predictive.treatments,
    commercialRec: commercial,
    reviewAlerts,
    specialistName,
    disclaimer: 'Las sugerencias automáticas no sustituyen el criterio clínico del especialista. Este resumen es orientativo y complementario al diagnóstico médico.',
  };
}

// ── Main Entry Point ────────────────────────────────────────────

export function computeCommercialEngine(
  odSph: number | null,
  odCyl: number | null,
  odAdd: number | null,
  oiSph: number | null,
  oiCyl: number | null,
  oiAdd: number | null,
  patientAge: number | null,
  patientName: string,
  diagnosis: string,
  predictive: PredictiveAnalysisResult,
  advanced: AdvancedDiagnosisResult,
  history: HistoricalDataPoint[],
): CommercialEngineResult {
  const reviewAlerts = generateReviewAlerts(
    predictive, advanced, patientAge, patientName,
    odSph, oiSph, odCyl, oiCyl,
  );

  const commercial = generateCommercialRec(
    predictive, odSph, oiSph, odCyl, oiCyl, odAdd, oiAdd,
    patientAge, diagnosis,
  );

  const anomalies = detectAnomalies(odSph, oiSph, odCyl, oiCyl, history);

  return { reviewAlerts, commercial, anomalies };
}
