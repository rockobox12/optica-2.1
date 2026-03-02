import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface DeliveryAnalysis {
  deliveryId: string;
  patientId?: string;
  patientName: string;
  patientPhone?: string;
  appointmentDate: string;
  startTime: string;
  riskScore: number;
  riskReasons: string[];
  recommendation: string;
  suggestedWhatsAppMessage: string;
  labOrderId?: string;
  labOrderNumber?: string;
  labOrderStatus?: string;
  labOrderLocation?: string;
  saleId?: string;
}

interface AnalysisResponse {
  success: boolean;
  analyses?: DeliveryAnalysis[];
  analysis?: DeliveryAnalysis;
  analyzedCount?: number;
  highRiskCount?: number;
  error?: string;
}

export function useDeliveryAI() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAnalysis, setSelectedAnalysis] = useState<DeliveryAnalysis | null>(null);

  // Fetch all delivery analyses
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['delivery-ai-analyses', profile?.defaultBranchId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('delivery-ai-assistant', {
        body: {
          action: 'analyze_deliveries',
          branchId: profile?.defaultBranchId,
        },
      });

      if (error) throw error;
      return data as AnalysisResponse;
    },
    enabled: !!profile,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });

  // Log audit event
  const logAuditMutation = useMutation({
    mutationFn: async ({
      deliveryId,
      patientId,
      actionType,
      riskScore,
      riskReasons,
      recommendation,
      actionTaken,
      metadata,
    }: {
      deliveryId: string;
      patientId?: string;
      actionType: 'suggestion_viewed' | 'whatsapp_opened' | 'reschedule_initiated' | 'priority_changed' | 'other';
      riskScore?: number;
      riskReasons?: string[];
      recommendation?: string;
      actionTaken?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id || !profile) throw new Error('User not authenticated');

      // Get user role from the profile (using fullName as fallback for role display)
      const userRole = (profile as unknown as { role?: string }).role || 'user';

      // Use raw SQL through rpc or direct insert bypassing type check
      // The table was just created and types haven't regenerated yet
      const insertData = {
        delivery_id: deliveryId,
        patient_id: patientId,
        user_id: user.id,
        user_role: userRole,
        action_type: actionType,
        risk_score: riskScore,
        risk_reasons: riskReasons,
        recommendation,
        action_taken: actionTaken,
        metadata: metadata || {},
      };
      
      // @ts-expect-error - table exists but types not yet regenerated
      const { error } = await supabase.from('delivery_ai_audit').insert(insertData);

      if (error) throw error;
    },
  });

  // View suggestion (logs audit)
  const viewSuggestion = useCallback(async (analysis: DeliveryAnalysis) => {
    setSelectedAnalysis(analysis);
    
    try {
      await logAuditMutation.mutateAsync({
        deliveryId: analysis.deliveryId,
        actionType: 'suggestion_viewed',
        riskScore: analysis.riskScore,
        riskReasons: analysis.riskReasons,
        recommendation: analysis.recommendation,
      });
    } catch (err) {
      console.error('Error logging suggestion view:', err);
    }
  }, [logAuditMutation]);

  // Open WhatsApp with suggested message
  const openWhatsApp = useCallback(async (analysis: DeliveryAnalysis, phone?: string) => {
    const phoneNumber = phone || analysis.patientPhone;
    if (!phoneNumber) {
      toast.error('No hay número de teléfono disponible');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const message = encodeURIComponent(analysis.suggestedWhatsAppMessage);
    
    window.open(`https://wa.me/52${cleanPhone}?text=${message}`, '_blank');

    try {
      await logAuditMutation.mutateAsync({
        deliveryId: analysis.deliveryId,
        actionType: 'whatsapp_opened',
        riskScore: analysis.riskScore,
        riskReasons: analysis.riskReasons,
        recommendation: analysis.recommendation,
        actionTaken: 'WhatsApp abierto con mensaje sugerido',
        metadata: { phoneUsed: cleanPhone },
      });
      toast.success('WhatsApp abierto con mensaje sugerido');
    } catch (err) {
      console.error('Error logging WhatsApp action:', err);
    }
  }, [logAuditMutation]);

  // Log reschedule action
  const logRescheduleAction = useCallback(async (analysis: DeliveryAnalysis) => {
    try {
      await logAuditMutation.mutateAsync({
        deliveryId: analysis.deliveryId,
        actionType: 'reschedule_initiated',
        riskScore: analysis.riskScore,
        riskReasons: analysis.riskReasons,
        recommendation: analysis.recommendation,
        actionTaken: 'Usuario inició reprogramación',
      });
    } catch (err) {
      console.error('Error logging reschedule action:', err);
    }
  }, [logAuditMutation]);

  // Get high risk deliveries (score >= 50)
  const highRiskDeliveries = data?.analyses?.filter(a => a.riskScore >= 50) || [];
  
  // Get medium risk deliveries (score 20-49)
  const mediumRiskDeliveries = data?.analyses?.filter(a => a.riskScore >= 20 && a.riskScore < 50) || [];
  
  // Get low risk deliveries (score < 20)
  const lowRiskDeliveries = data?.analyses?.filter(a => a.riskScore < 20) || [];

  return {
    analyses: data?.analyses || [],
    highRiskDeliveries,
    mediumRiskDeliveries,
    lowRiskDeliveries,
    analyzedCount: data?.analyzedCount || 0,
    highRiskCount: data?.highRiskCount || 0,
    isLoading,
    error,
    refetch,
    selectedAnalysis,
    setSelectedAnalysis,
    viewSuggestion,
    openWhatsApp,
    logRescheduleAction,
  };
}
