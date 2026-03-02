import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CreditSettings {
  id: string;
  blockSalesToMorosos: boolean;
  adminExceptionOnly: boolean;
  minDownPaymentPercent: number;
  minDownPaymentAmount: number | null;
  adminDownPaymentException: boolean;
  blockMoroso30plus: boolean;
  allowOnlyPaymentsWhenBlocked: boolean;
}

const DEFAULT_SETTINGS: CreditSettings = {
  id: '',
  blockSalesToMorosos: false,
  adminExceptionOnly: true,
  minDownPaymentPercent: 20,
  minDownPaymentAmount: null,
  adminDownPaymentException: true,
  blockMoroso30plus: false,
  allowOnlyPaymentsWhenBlocked: true,
};

export function useCreditSettings() {
  const [settings, setSettings] = useState<CreditSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('credit_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          id: data.id,
          blockSalesToMorosos: data.block_sales_to_morosos,
          adminExceptionOnly: data.admin_exception_only,
          minDownPaymentPercent: (data as any).min_down_payment_percent ?? 20,
          minDownPaymentAmount: (data as any).min_down_payment_amount ?? null,
          adminDownPaymentException: (data as any).admin_down_payment_exception ?? true,
          blockMoroso30plus: (data as any).block_moroso_30plus ?? false,
          allowOnlyPaymentsWhenBlocked: (data as any).allow_only_payments_when_blocked ?? true,
        });
      }
    } catch (err) {
      console.error('Error fetching credit settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<Omit<CreditSettings, 'id'>>) => {
    if (!settings.id) return;

    const dbUpdates: Record<string, unknown> = {};
    if (updates.blockSalesToMorosos !== undefined) dbUpdates.block_sales_to_morosos = updates.blockSalesToMorosos;
    if (updates.adminExceptionOnly !== undefined) dbUpdates.admin_exception_only = updates.adminExceptionOnly;
    if (updates.minDownPaymentPercent !== undefined) dbUpdates.min_down_payment_percent = updates.minDownPaymentPercent;
    if (updates.minDownPaymentAmount !== undefined) dbUpdates.min_down_payment_amount = updates.minDownPaymentAmount;
    if (updates.adminDownPaymentException !== undefined) dbUpdates.admin_down_payment_exception = updates.adminDownPaymentException;
    if (updates.blockMoroso30plus !== undefined) dbUpdates.block_moroso_30plus = updates.blockMoroso30plus;
    if (updates.allowOnlyPaymentsWhenBlocked !== undefined) dbUpdates.allow_only_payments_when_blocked = updates.allowOnlyPaymentsWhenBlocked;

    const { error } = await supabase
      .from('credit_settings')
      .update(dbUpdates)
      .eq('id', settings.id);

    if (error) throw error;

    setSettings(prev => ({ ...prev, ...updates }));
  }, [settings.id]);

  return { settings, loading, updateSettings, refresh: fetchSettings };
}
