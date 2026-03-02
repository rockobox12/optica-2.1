/**
 * Commercial Patient Scoring Engine
 * Generates a 0-100 score based on purchase history, clinical profile, and engagement.
 */

export type CommercialTier = 'basico' | 'intermedio' | 'premium' | 'premium_alto';

export interface CommercialScore {
  score: number;
  tier: CommercialTier;
  tierLabel: string;
  breakdown: { label: string; points: number; active: boolean }[];
}

export interface CommercialScoringInput {
  totalPurchases: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchaseDaysAgo: number | null;
  hasPremiumLens: boolean;
  clinicalRiskScore: number;
  patientAge: number | null;
  hasOccupation: boolean;
  campaignResponses: number;
}

export function classifyCommercialTier(score: number): { tier: CommercialTier; label: string } {
  if (score >= 81) return { tier: 'premium_alto', label: 'Alta probabilidad premium' };
  if (score >= 61) return { tier: 'premium', label: 'Premium' };
  if (score >= 31) return { tier: 'intermedio', label: 'Intermedio' };
  return { tier: 'basico', label: 'Básico' };
}

export function computeCommercialScore(input: CommercialScoringInput): CommercialScore {
  const breakdown: { label: string; points: number; active: boolean }[] = [];
  let score = 0;

  // Purchase volume (up to 25 pts)
  const volPoints = input.totalPurchases >= 5 ? 25 : input.totalPurchases >= 3 ? 15 : input.totalPurchases >= 1 ? 8 : 0;
  breakdown.push({ label: `Historial de compras (${input.totalPurchases})`, points: volPoints, active: volPoints > 0 });
  score += volPoints;

  // Ticket promedio (up to 20 pts)
  const ticketPoints = input.averageTicket >= 5000 ? 20 : input.averageTicket >= 3000 ? 15 : input.averageTicket >= 1500 ? 8 : 0;
  breakdown.push({ label: `Ticket promedio ($${input.averageTicket.toFixed(0)})`, points: ticketPoints, active: ticketPoints > 0 });
  score += ticketPoints;

  // Premium lens history (15 pts)
  const premiumPoints = input.hasPremiumLens ? 15 : 0;
  breakdown.push({ label: 'Ha comprado lentes premium', points: premiumPoints, active: input.hasPremiumLens });
  score += premiumPoints;

  // Recency (up to 10 pts)
  const recencyPoints = input.lastPurchaseDaysAgo !== null && input.lastPurchaseDaysAgo < 180 ? 10 : input.lastPurchaseDaysAgo !== null && input.lastPurchaseDaysAgo < 365 ? 5 : 0;
  breakdown.push({ label: 'Compra reciente (<6 meses)', points: recencyPoints, active: recencyPoints > 0 });
  score += recencyPoints;

  // Clinical risk (up to 10 pts) — higher risk = more likely to need premium
  const clinicalPoints = input.clinicalRiskScore >= 60 ? 10 : input.clinicalRiskScore >= 40 ? 5 : 0;
  breakdown.push({ label: `Score clínico alto (${input.clinicalRiskScore})`, points: clinicalPoints, active: clinicalPoints > 0 });
  score += clinicalPoints;

  // Age bracket (up to 10 pts) — 35-60 highest spending
  const agePoints = input.patientAge !== null && input.patientAge >= 35 && input.patientAge <= 60 ? 10 : input.patientAge !== null && input.patientAge > 60 ? 5 : 0;
  breakdown.push({ label: 'Edad con mayor gasto (35-60)', points: agePoints, active: agePoints > 0 });
  score += agePoints;

  // Occupation registered (5 pts)
  const occPoints = input.hasOccupation ? 5 : 0;
  breakdown.push({ label: 'Ocupación registrada', points: occPoints, active: input.hasOccupation });
  score += occPoints;

  // Campaign response (5 pts)
  const campPoints = input.campaignResponses > 0 ? 5 : 0;
  breakdown.push({ label: 'Responde a campañas', points: campPoints, active: campPoints > 0 });
  score += campPoints;

  score = Math.min(100, score);
  const { tier, label } = classifyCommercialTier(score);

  return { score, tier, tierLabel: label, breakdown };
}
