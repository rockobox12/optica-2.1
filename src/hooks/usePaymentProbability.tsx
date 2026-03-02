import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PaymentRiskLevel = 'reliable' | 'moderate' | 'high' | 'critical';

export interface PaymentProbability {
  score: number;
  riskLevel: PaymentRiskLevel;
  totalCredits: number;
  completedCredits: number;
  completedNoDelay: number;
  avgDaysOverdue: number;
  frequentDelays: number;
  activeMoroso: boolean;
  isNew: boolean;
}

const RISK_CONFIG: Record<PaymentRiskLevel, { label: string; icon: string; badgeClass: string }> = {
  reliable: { label: 'Confiable', icon: '🟢', badgeClass: 'bg-green-100 text-green-800 border-green-200' },
  moderate: { label: 'Riesgo moderado', icon: '🟡', badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  high: { label: 'Riesgo alto', icon: '🟠', badgeClass: 'bg-orange-100 text-orange-800 border-orange-200' },
  critical: { label: 'Riesgo crítico', icon: '🔴', badgeClass: 'bg-red-100 text-red-800 border-red-200' },
};

export { RISK_CONFIG };

const EMPTY: PaymentProbability = {
  score: 50, riskLevel: 'moderate', totalCredits: 0, completedCredits: 0,
  completedNoDelay: 0, avgDaysOverdue: 0, frequentDelays: 0, activeMoroso: false, isNew: true,
};

export function usePaymentProbability(patientId: string | null) {
  const [data, setData] = useState<PaymentProbability>(EMPTY);
  const [loading, setLoading] = useState(false);

  const calculate = useCallback(async () => {
    if (!patientId) { setData(EMPTY); return; }
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('calculate_payment_probability', {
        p_patient_id: patientId,
      });
      if (error) throw error;
      const r = result as Record<string, unknown>;
      setData({
        score: Number(r.score) || 50,
        riskLevel: (r.risk_level as PaymentRiskLevel) || 'moderate',
        totalCredits: Number(r.total_credits) || 0,
        completedCredits: Number(r.completed_credits) || 0,
        completedNoDelay: Number(r.completed_no_delay) || 0,
        avgDaysOverdue: Number(r.avg_days_overdue) || 0,
        frequentDelays: Number(r.frequent_delays) || 0,
        activeMoroso: !!r.active_moroso,
        isNew: !!r.is_new,
      });
    } catch (err) {
      console.error('[usePaymentProbability] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { calculate(); }, [calculate]);

  return { ...data, loading, refresh: calculate };
}
