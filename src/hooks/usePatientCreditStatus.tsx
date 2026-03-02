import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DelinquencyLevel = 'active' | 'mild' | 'moroso30' | 'critical';

export interface PatientCreditStatus {
  saldoPendienteTotal: number;
  isMoroso: boolean;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  diasAtraso: number;
  salesWithBalance: number;
  overdueInstallments: number;
  overdueAmount: number;
  delinquencyLevel: DelinquencyLevel;
}

export function getDelinquencyLevel(diasAtraso: number, isMoroso: boolean): DelinquencyLevel {
  if (!isMoroso || diasAtraso === 0) return 'active';
  if (diasAtraso >= 60) return 'critical';
  if (diasAtraso >= 30) return 'moroso30';
  return 'mild';
}

const EMPTY_STATUS: PatientCreditStatus = {
  saldoPendienteTotal: 0,
  isMoroso: false,
  nextPaymentDate: null,
  nextPaymentAmount: null,
  lastPaymentDate: null,
  lastPaymentAmount: null,
  diasAtraso: 0,
  salesWithBalance: 0,
  overdueInstallments: 0,
  overdueAmount: 0,
  delinquencyLevel: 'active',
};

export function usePatientCreditStatus(patientId: string | null) {
  const [status, setStatus] = useState<PatientCreditStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!patientId) {
      setStatus(EMPTY_STATUS);
      return;
    }

    setLoading(true);
    try {
      // Fetch sales with pending balance (include amount_paid and created_at)
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, balance, next_payment_date, next_payment_amount, status, amount_paid, created_at')
        .eq('patient_id', patientId)
        .in('status', ['pending', 'partial'])
        .gt('balance', 0);

      if (salesError) throw salesError;

      // Fetch last credit_payment across all patient sales
      const allSaleIds = await supabase
        .from('sales')
        .select('id')
        .eq('patient_id', patientId)
        .then(r => (r.data || []).map(s => s.id));

      const { data: allPayments } = await supabase
        .from('credit_payments')
        .select('amount, created_at')
        .eq('is_voided', false)
        .in('sale_id', allSaleIds.length > 0 ? allSaleIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })
        .limit(1);

      const saldoTotal = (sales || []).reduce((sum, s) => sum + (s.balance || 0), 0);
      
      // Find earliest next_payment_date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let earliestNextPayment: string | null = null;
      let earliestNextAmount: number | null = null;
      let maxDiasAtraso = 0;

      for (const sale of (sales || [])) {
        if (sale.next_payment_date) {
          const paymentDate = new Date(sale.next_payment_date);
          
          if (!earliestNextPayment || paymentDate < new Date(earliestNextPayment)) {
            earliestNextPayment = sale.next_payment_date;
            earliestNextAmount = sale.next_payment_amount;
          }

          if (paymentDate < today) {
            const diffTime = today.getTime() - paymentDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > maxDiasAtraso) {
              maxDiasAtraso = diffDays;
            }
          }
        }
      }

      // Check installment-level overdue data from payment_plans
      let overdueInstallments = 0;
      let overdueAmount = 0;
      let maxInstallmentDays = 0;

      const saleIds = (sales || []).map(s => s.id);
      if (saleIds.length > 0) {
        const { data: plans } = await supabase
          .from('payment_plans')
          .select('id')
          .in('sale_id', saleIds);
        
        const planIds = (plans || []).map(p => p.id);
        if (planIds.length > 0) {
          const { data: overdueInst } = await supabase
            .from('payment_plan_installments')
            .select('id, amount, days_overdue')
            .in('payment_plan_id', planIds)
            .eq('status', 'overdue');
          
          overdueInstallments = (overdueInst || []).length;
          overdueAmount = (overdueInst || []).reduce((sum, i) => sum + Number(i.amount || 0), 0);
          maxInstallmentDays = (overdueInst || []).reduce((max, i) => Math.max(max, i.days_overdue || 0), 0);
        }
      }

      // Moroso if has overdue installments OR based on sale payment dates
      const isMoroso = overdueInstallments > 0 || (saldoTotal > 0 && earliestNextPayment !== null && new Date(earliestNextPayment) < today);
      const finalDiasAtraso = Math.max(maxDiasAtraso, maxInstallmentDays);

      // Determine last payment: prefer credit_payments, fallback to sale creation date if enganche was paid
      let lastPaymentDate: string | null = null;
      let lastPaymentAmount: number | null = null;

      if (allPayments && allPayments.length > 0) {
        lastPaymentDate = allPayments[0].created_at;
        lastPaymentAmount = allPayments[0].amount;
      } else {
        // No credit_payments found — check if there was an initial payment (enganche) on any sale
        const salesWithInitialPayment = (sales || []).filter(s => (s.amount_paid || 0) > 0);
        if (salesWithInitialPayment.length > 0) {
          // Use the most recent sale's created_at as last payment date
          const sorted = [...salesWithInitialPayment].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          lastPaymentDate = sorted[0].created_at;
          lastPaymentAmount = sorted[0].amount_paid;
        }
      }

      const delinquencyLevel = getDelinquencyLevel(finalDiasAtraso, isMoroso);

      setStatus({
        saldoPendienteTotal: saldoTotal,
        isMoroso,
        nextPaymentDate: earliestNextPayment,
        nextPaymentAmount: earliestNextAmount,
        lastPaymentDate,
        lastPaymentAmount,
        diasAtraso: finalDiasAtraso,
        salesWithBalance: (sales || []).length,
        overdueInstallments,
        overdueAmount,
        delinquencyLevel,
      });
    } catch (error) {
      console.error('Error fetching patient credit status:', error);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...status, loading, refresh: fetchStatus };
}
