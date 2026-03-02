import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranchContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface CashSession {
  id: string;
  branch_id: string | null;
  opened_by: string;
  opening_date: string;
  opening_amount: number;
  status: string;
}

interface RegisterMovementParams {
  movementType: 'sale' | 'credit_payment' | 'expense' | 'refund' | 'deposit' | 'withdrawal';
  amount: number;
  paymentMethod: string;
  referenceType?: string;
  referenceId?: string;
  saleId?: string;
  description?: string;
}

export function useCashSession() {
  const { user, profile } = useAuth();
  const { branchFilter, branches } = useBranch();
  const queryClient = useQueryClient();

  // Resolve effective branch: never use 'all' — fall back to profile default or first branch
  const effectiveBranch = (branchFilter && branchFilter !== 'all')
    ? branchFilter
    : profile?.defaultBranchId || (branches.length > 0 ? branches[0].id : undefined);

  const { data: currentSession = null, isLoading: loading } = useQuery({
    queryKey: ['cash-session', effectiveBranch],
    queryFn: async (): Promise<CashSession | null> => {
      if (!effectiveBranch) return null;

      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .eq('branch_id', effectiveBranch)
        .order('opening_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching cash session:', error);
        return null;
      }

      if (import.meta.env.DEV) {
        console.log('💰 Cash session query:', { effectiveBranch, found: !!data, sessionId: data?.id });
      }
      return data || null;
    },
    enabled: !!effectiveBranch,
    staleTime: 3_000,
    refetchOnWindowFocus: true,
    refetchInterval: 10_000,
  });

  const isOpen = !!currentSession;

  const registerMovement = useCallback(async (params: RegisterMovementParams): Promise<boolean> => {
    if (!currentSession || !user?.id) return false;

    try {
      const { error } = await supabase.from('cash_movements').insert({
        cash_register_id: currentSession.id,
        movement_type: params.movementType === 'credit_payment' ? 'sale' : params.movementType,
        amount: params.amount,
        payment_method: params.paymentMethod,
        reference_type: params.referenceType || null,
        reference_id: params.referenceId || null,
        sale_id: params.saleId || null,
        description: params.description || null,
        created_by: user.id,
      });

      if (error) {
        if (error.code === '23505') {
          console.log('Movement already registered, skipping duplicate');
          return true;
        }
        console.error('Error registering cash movement:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error registering cash movement:', error);
      return false;
    }
  }, [currentSession, user?.id]);

  const registerSaleMovements = useCallback(async (
    saleId: string,
    payments: Array<{ method: string; amount: number; reference?: string }>,
    saleNumber?: string,
  ): Promise<boolean> => {
    if (!currentSession) return false;

    const results = await Promise.all(
      payments.map(payment =>
        registerMovement({
          movementType: 'sale',
          amount: payment.amount,
          paymentMethod: payment.method,
          referenceType: 'sale',
          referenceId: saleId,
          saleId,
          description: `Venta ${saleNumber || ''} - ${getMethodLabel(payment.method)}${payment.reference ? ` (${payment.reference})` : ''}`.trim(),
        })
      )
    );

    return results.every(r => r);
  }, [currentSession, registerMovement]);

  const registerCreditPaymentMovement = useCallback(async (
    saleId: string,
    paymentId: string,
    amount: number,
    paymentMethod: string,
    saleNumber?: string,
  ): Promise<boolean> => {
    return registerMovement({
      movementType: 'credit_payment',
      amount,
      paymentMethod,
      referenceType: 'credit_payment',
      referenceId: paymentId,
      saleId,
      description: `Abono ${saleNumber || ''} - ${getMethodLabel(paymentMethod)}`,
    });
  }, [registerMovement]);

  const openSession = useCallback(async (branchId: string, openingAmount: number, notes?: string): Promise<CashSession | null> => {
    if (!user?.id) return null;

    try {
      // Check if there's already an open session for this branch to prevent duplicates
      const { data: existing } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .eq('branch_id', branchId)
        .order('opening_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log('✅ Cash session already open:', existing.id, 'branch:', branchId);
        // Just invalidate to refresh the UI
        await queryClient.invalidateQueries({ queryKey: ['cash-session'] });
        return existing;
      }

      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          branch_id: branchId,
          opened_by: user.id,
          opening_amount: openingAmount,
          notes: notes || null,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('cash_movements').insert({
        cash_register_id: data.id,
        movement_type: 'opening',
        amount: openingAmount,
        payment_method: 'cash',
        description: 'Apertura de caja',
        created_by: user.id,
      });

      console.log('✅ Cash session opened:', data.id, 'branch:', branchId);

      // Invalidate and wait for refetch to complete
      await queryClient.invalidateQueries({ queryKey: ['cash-session'] });
      // Also refetch immediately
      await queryClient.refetchQueries({ queryKey: ['cash-session', effectiveBranch] });

      return data;
    } catch (error) {
      console.error('❌ Error opening cash session:', error);
      return null;
    }
  }, [user?.id, queryClient]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['cash-session'] });
  }, [queryClient]);

  return {
    currentSession,
    isOpen,
    loading,
    registerMovement,
    registerSaleMovements,
    registerCreditPaymentMovement,
    openSession,
    refresh,
  };
}

function getMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    check: 'Cheque',
  };
  return labels[method] || method;
}
