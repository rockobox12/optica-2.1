/**
 * Patient Intelligence Service
 * 
 * Central unified service that consolidates data from all 4 engines:
 * 1. Clinical Engine → Risk score, projections, alerts, diagnosis
 * 2. Commercial Engine → Commercial score, lens level, recommendations
 * 3. Financial Engine → Delinquency status, credit score, balance
 * 4. Automation Engine → Review alerts, WhatsApp suggestions, campaign eligibility
 * 
 * All modules consume this service as the single source of truth.
 */

import { computePredictiveAnalysis, type PredictiveAnalysisResult, type HistoricalExam } from './clinical-predictive';
import { computeCommercialEngine, type CommercialEngineResult, type HistoricalDataPoint } from './clinical-commercial-engine';
import { computeAdvancedDiagnosis, type AdvancedDiagnosisResult, type PreviousExamData } from './clinical-advanced-diagnosis';
import { computeCommercialScore, type CommercialScore, type CommercialScoringInput } from './clinical-commercial-scoring';

// ── Unified Types ───────────────────────────────────────────────

export type PatientFinancialStatus = 'al_corriente' | 'saldo_pendiente' | 'moroso';

export interface PatientFinancialProfile {
  status: PatientFinancialStatus;
  totalDebt: number;
  overdueDays: number;
  creditScore: number | null;
  hasCreditBlock: boolean;
  totalPurchases: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchaseDaysAgo: number | null;
}

export interface PatientClinicalProfile {
  predictive: PredictiveAnalysisResult;
  advanced: AdvancedDiagnosisResult;
  commercial: CommercialEngineResult;
  hasClinicalData: boolean;
}

export interface PatientIntelligence {
  patientId: string;
  patientName: string;
  patientAge: number | null;

  // Engine outputs
  clinical: PatientClinicalProfile;
  commercialScore: CommercialScore;
  financial: PatientFinancialProfile;

  // Unified signals
  signals: PatientSignal[];

  // Computed priorities
  needsFollowup: boolean;
  isHighClinicalRisk: boolean;
  isHighCommercialValue: boolean;
  isDelinquent: boolean;
  hasPendingDelivery: boolean;

  // Cross-engine recommendations
  posRecommendations: POSRecommendation[];
  campaignEligibility: CampaignEligibility;

  // Audit
  computedAt: string;
}

export interface PatientSignal {
  id: string;
  source: 'clinical' | 'commercial' | 'financial' | 'automation';
  level: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionable: boolean;
}

export interface POSRecommendation {
  id: string;
  label: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  source: 'clinical' | 'commercial' | 'financial';
}

export interface CampaignEligibility {
  eligible: boolean;
  suggestedChannels: ('whatsapp' | 'sms' | 'email')[];
  suggestedCampaignTypes: string[];
  blockedReason: string | null;
}

// ── Input Types ─────────────────────────────────────────────────

export interface PatientIntelligenceInput {
  patientId: string;
  patientName: string;
  patientAge: number | null;
  occupation: string | null;

  // Current RX
  odSph: number | null;
  odCyl: number | null;
  odAxis: number | null;
  odAdd: number | null;
  oiSph: number | null;
  oiCyl: number | null;
  oiAxis: number | null;
  oiAdd: number | null;

  // History
  examHistory: HistoricalExam[];
  previousExam: PreviousExamData | null;
  globalDiagnosis: string;

  // Financial data
  financial: PatientFinancialProfile;

  // Commercial inputs
  hasPremiumLens: boolean;
  campaignResponses: number;

  // Delivery
  hasPendingDelivery: boolean;
}

// ── Main Computation ────────────────────────────────────────────

export function computePatientIntelligence(input: PatientIntelligenceInput): PatientIntelligence {
  // 1. Clinical Engine
  const predictive = computePredictiveAnalysis(
    input.odSph, input.odCyl, input.odAdd,
    input.oiSph, input.oiCyl, input.oiAdd,
    input.patientAge, input.examHistory,
  );

  const advanced = computeAdvancedDiagnosis(
    input.odSph, input.odCyl, input.odAxis, input.odAdd,
    input.oiSph, input.oiCyl, input.oiAxis, input.oiAdd,
    input.patientAge, input.previousExam, input.globalDiagnosis,
  );

  const historyData: HistoricalDataPoint[] = input.examHistory.map(e => ({
    examDate: e.examDate,
    odSphere: e.odSphere,
    odCylinder: e.odCylinder,
    oiSphere: e.oiSphere,
    oiCylinder: e.oiCylinder,
  }));

  const commercialEngine = computeCommercialEngine(
    input.odSph, input.odCyl, input.odAdd,
    input.oiSph, input.oiCyl, input.oiAdd,
    input.patientAge, input.patientName, input.globalDiagnosis,
    predictive, advanced, historyData,
  );

  const hasClinicalData = input.odSph !== null || input.oiSph !== null;

  // 2. Commercial Score
  const commercialScoreInput: CommercialScoringInput = {
    totalPurchases: input.financial.totalPurchases,
    totalSpent: input.financial.totalSpent,
    averageTicket: input.financial.averageTicket,
    lastPurchaseDaysAgo: input.financial.lastPurchaseDaysAgo,
    hasPremiumLens: input.hasPremiumLens,
    clinicalRiskScore: predictive.riskScore.score,
    patientAge: input.patientAge,
    hasOccupation: !!input.occupation,
    campaignResponses: input.campaignResponses,
  };

  const commercialScore = computeCommercialScore(commercialScoreInput);

  // 3. Unified Signals
  const signals = buildSignals(
    predictive, advanced, commercialEngine, commercialScore,
    input.financial, input.hasPendingDelivery,
  );

  // 4. Computed flags
  const isHighClinicalRisk = predictive.riskScore.score >= 50;
  const isHighCommercialValue = commercialScore.score >= 61;
  const isDelinquent = input.financial.status === 'moroso';
  const needsFollowup = commercialEngine.reviewAlerts.length > 0 || isHighClinicalRisk;

  // 5. POS Recommendations (cross-engine)
  const posRecommendations = buildPOSRecommendations(
    commercialEngine, commercialScore, input.financial, predictive,
  );

  // 6. Campaign eligibility
  const campaignEligibility = computeCampaignEligibility(
    input.financial, commercialScore, isHighClinicalRisk,
  );

  return {
    patientId: input.patientId,
    patientName: input.patientName,
    patientAge: input.patientAge,
    clinical: { predictive, advanced, commercial: commercialEngine, hasClinicalData },
    commercialScore,
    financial: input.financial,
    signals,
    needsFollowup,
    isHighClinicalRisk,
    isHighCommercialValue,
    isDelinquent,
    hasPendingDelivery: input.hasPendingDelivery,
    posRecommendations,
    campaignEligibility,
    computedAt: new Date().toISOString(),
  };
}

// ── Signal Builder ──────────────────────────────────────────────

function buildSignals(
  predictive: PredictiveAnalysisResult,
  advanced: AdvancedDiagnosisResult,
  commercial: CommercialEngineResult,
  commercialScore: CommercialScore,
  financial: PatientFinancialProfile,
  hasPendingDelivery: boolean,
): PatientSignal[] {
  const signals: PatientSignal[] = [];

  // Clinical signals
  if (predictive.riskScore.score >= 75) {
    signals.push({
      id: 'sig_very_high_risk',
      source: 'clinical',
      level: 'critical',
      title: 'Riesgo visual muy alto',
      description: `Score ${predictive.riskScore.score}/100. Seguimiento prioritario.`,
      actionable: true,
    });
  } else if (predictive.riskScore.score >= 50) {
    signals.push({
      id: 'sig_high_risk',
      source: 'clinical',
      level: 'warning',
      title: 'Riesgo visual elevado',
      description: `Score ${predictive.riskScore.score}/100.`,
      actionable: true,
    });
  }

  if (predictive.projections.some(p => p.isSignificant)) {
    signals.push({
      id: 'sig_progression',
      source: 'clinical',
      level: 'warning',
      title: 'Progresión miópica activa',
      description: 'Tasa de progresión > -0.50D/año.',
      actionable: true,
    });
  }

  if (commercial.anomalies.length > 0) {
    signals.push({
      id: 'sig_anomaly',
      source: 'clinical',
      level: 'warning',
      title: 'Cambio atípico detectado',
      description: `${commercial.anomalies.length} anomalía(s) respecto a tendencia histórica.`,
      actionable: false,
    });
  }

  // Financial signals
  if (financial.status === 'moroso') {
    signals.push({
      id: 'sig_moroso',
      source: 'financial',
      level: 'critical',
      title: 'Paciente moroso',
      description: `Deuda: $${financial.totalDebt.toFixed(2)} — ${financial.overdueDays} días de atraso.`,
      actionable: true,
    });
  } else if (financial.status === 'saldo_pendiente') {
    signals.push({
      id: 'sig_saldo',
      source: 'financial',
      level: 'info',
      title: 'Saldo pendiente',
      description: `Balance: $${financial.totalDebt.toFixed(2)}.`,
      actionable: false,
    });
  }

  if (financial.hasCreditBlock) {
    signals.push({
      id: 'sig_credit_block',
      source: 'financial',
      level: 'critical',
      title: 'Venta bloqueada por morosidad',
      description: 'Se requiere autorización de Administrador para nuevas ventas.',
      actionable: true,
    });
  }

  // Commercial signals
  if (commercialScore.score >= 81) {
    signals.push({
      id: 'sig_premium_alto',
      source: 'commercial',
      level: 'info',
      title: 'Paciente premium alto',
      description: 'Alta probabilidad de compra premium. Priorizar productos de alta gama.',
      actionable: false,
    });
  }

  // Automation signals
  if (commercial.reviewAlerts.some(a => a.urgency === 'urgent')) {
    signals.push({
      id: 'sig_urgent_review',
      source: 'automation',
      level: 'critical',
      title: 'Revisión urgente requerida',
      description: 'Agendar seguimiento clínico prioritario.',
      actionable: true,
    });
  }

  if (hasPendingDelivery) {
    signals.push({
      id: 'sig_pending_delivery',
      source: 'automation',
      level: 'info',
      title: 'Entrega pendiente',
      description: 'El paciente tiene una entrega programada.',
      actionable: false,
    });
  }

  return signals.sort((a, b) => {
    const levelOrder = { critical: 0, warning: 1, info: 2 };
    return levelOrder[a.level] - levelOrder[b.level];
  });
}

// ── POS Recommendations (Cross-Engine) ──────────────────────────

function buildPOSRecommendations(
  commercial: CommercialEngineResult,
  commercialScore: CommercialScore,
  financial: PatientFinancialProfile,
  predictive: PredictiveAnalysisResult,
): POSRecommendation[] {
  const recs: POSRecommendation[] = [];

  // Lens level from clinical-commercial engine
  recs.push({
    id: 'pos_lens_level',
    label: `Nivel sugerido: ${commercial.commercial.lensLevelLabel}`,
    reason: commercial.commercial.clinicalJustification,
    priority: 'high',
    source: 'clinical',
  });

  // Features from commercial engine
  commercial.commercial.features.slice(0, 3).forEach((feat, i) => {
    recs.push({
      id: `pos_feat_${i}`,
      label: feat,
      reason: commercial.commercial.commercialSuggestion,
      priority: 'medium',
      source: 'commercial',
    });
  });

  // Premium upsell if commercial score is high
  if (commercialScore.tier === 'premium_alto' && commercial.commercial.lensLevel !== 'premium') {
    recs.push({
      id: 'pos_upsell',
      label: 'Considerar upgrade a Premium',
      reason: `Score comercial alto (${commercialScore.score}/100). Historial de compras premium.`,
      priority: 'medium',
      source: 'commercial',
    });
  }

  // Financial warning
  if (financial.hasCreditBlock) {
    recs.push({
      id: 'pos_credit_block',
      label: '⚠ Venta bloqueada por morosidad',
      reason: `Deuda: $${financial.totalDebt.toFixed(2)}. Requiere autorización admin.`,
      priority: 'high',
      source: 'financial',
    });
  } else if (financial.status === 'saldo_pendiente') {
    recs.push({
      id: 'pos_saldo',
      label: 'Saldo pendiente activo',
      reason: `Balance: $${financial.totalDebt.toFixed(2)}. Considerar cobro antes de nueva venta.`,
      priority: 'medium',
      source: 'financial',
    });
  }

  // Follow-up from clinical
  if (predictive.riskScore.score >= 60) {
    recs.push({
      id: 'pos_followup',
      label: 'Agendar seguimiento clínico',
      reason: `Score de riesgo ${predictive.riskScore.score}/100. Revisión recomendada en 6 meses.`,
      priority: 'medium',
      source: 'clinical',
    });
  }

  return recs;
}

// ── Campaign Eligibility ────────────────────────────────────────

function computeCampaignEligibility(
  financial: PatientFinancialProfile,
  commercialScore: CommercialScore,
  isHighRisk: boolean,
): CampaignEligibility {
  // Blocked if moroso with high debt
  if (financial.status === 'moroso' && financial.totalDebt > 5000) {
    return {
      eligible: false,
      suggestedChannels: [],
      suggestedCampaignTypes: [],
      blockedReason: 'Paciente moroso con deuda elevada. No elegible para campañas promocionales.',
    };
  }

  const channels: ('whatsapp' | 'sms' | 'email')[] = ['whatsapp'];
  const types: string[] = [];

  // High clinical risk → follow-up campaigns
  if (isHighRisk) {
    types.push('seguimiento_clinico');
    types.push('revision_periodica');
  }

  // Premium potential → premium product campaigns
  if (commercialScore.tier === 'premium_alto' || commercialScore.tier === 'premium') {
    types.push('productos_premium');
    types.push('nuevas_colecciones');
    channels.push('email');
  }

  // Standard engagement
  if (commercialScore.tier === 'intermedio') {
    types.push('promociones_generales');
  }

  // Low engagement → reactivation
  if (financial.lastPurchaseDaysAgo !== null && financial.lastPurchaseDaysAgo > 365) {
    types.push('reactivacion');
  }

  return {
    eligible: true,
    suggestedChannels: channels,
    suggestedCampaignTypes: types.length > 0 ? types : ['general'],
    blockedReason: null,
  };
}

// ── Dashboard Aggregation Helpers ───────────────────────────────

export interface GlobalExecutiveMetrics {
  highClinicalRisk: number;
  highCommercialValue: number;
  activeDelinquency: number;
  pendingDeliveries: number;
  pendingFollowups: number;
  monthlyProjection: number;
  totalActivePatients: number;
}

/**
 * Build empty financial profile for patients without financial data
 */
export function emptyFinancialProfile(): PatientFinancialProfile {
  return {
    status: 'al_corriente',
    totalDebt: 0,
    overdueDays: 0,
    creditScore: null,
    hasCreditBlock: false,
    totalPurchases: 0,
    totalSpent: 0,
    averageTicket: 0,
    lastPurchaseDaysAgo: null,
  };
}
