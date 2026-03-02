import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ClinicalOpportunity {
  id: string;
  patient_id: string;
  branch_id: string | null;
  opportunity_type: string;
  priority: 'high' | 'medium' | 'low';
  clinical_summary: string;
  clinical_details: Record<string, any>;
  detected_at: string;
  status: string;
  marketing_action_id: string | null;
  patients?: {
    full_name: string;
    phone: string | null;
    email: string | null;
  };
}

interface MarketingAction {
  id: string;
  opportunity_id: string;
  patient_id: string;
  action_type: string;
  channel: string;
  suggested_message: string;
  suggested_subject: string | null;
  suggested_send_window: Record<string, any>;
  status: string;
  approved_at: string | null;
  approved_message: string | null;
}

export function useClinicalMarketingBridge() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = roles?.includes('admin');
  const isDoctor = roles?.includes('doctor');

  // Fetch opportunities
  const { data: opportunities = [], isLoading: loadingOpportunities, refetch: refetchOpportunities } = useQuery({
    queryKey: ['clinical-opportunities', profile?.defaultBranchId],
    queryFn: async () => {
      let query = supabase
        .from('clinical_opportunities')
        .select('*, patients(id, first_name, last_name, phone, email)')
        .in('status', ['detected', 'suggested', 'review'])
        .order('priority', { ascending: false })
        .order('detected_at', { ascending: false })
        .limit(100);

      if (profile?.defaultBranchId) {
        query = query.eq('branch_id', profile.defaultBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform data to match expected format
      return (data || []).map(item => ({
        ...item,
        patients: item.patients ? {
          full_name: `${item.patients.first_name || ''} ${item.patients.last_name || ''}`.trim(),
          phone: item.patients.phone,
          email: item.patients.email,
        } : undefined,
      })) as ClinicalOpportunity[];
    },
    enabled: isAdmin || isDoctor,
  });

  // Fetch marketing actions
  const { data: marketingActions = [], refetch: refetchActions } = useQuery({
    queryKey: ['clinical-marketing-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_marketing_actions')
        .select('*, clinical_opportunities(clinical_summary, opportunity_type), patients(id, first_name, last_name)')
        .in('status', ['suggested', 'review', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform to add full_name
      return (data || []).map(item => ({
        ...item,
        patients: item.patients ? {
          full_name: `${item.patients.first_name || ''} ${item.patients.last_name || ''}`.trim(),
        } : undefined,
      }));
    },
    enabled: isAdmin,
  });

  // Detect new opportunities
  const detectOpportunities = useCallback(async () => {
    setIsDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('clinical-marketing-bridge', {
        body: {
          action: 'detect_opportunities',
          branchId: profile?.defaultBranchId,
          limit: 100,
        },
      });

      if (error) throw error;

      toast({
        title: 'Detección completada',
        description: `Se detectaron ${data.opportunities_detected} oportunidades clínicas.`,
      });

      await refetchOpportunities();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDetecting(false);
    }
  }, [profile?.defaultBranchId, toast, refetchOpportunities]);

  // Generate marketing action from opportunity
  const generateMarketingAction = useCallback(async (opportunityId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('clinical-marketing-bridge', {
        body: {
          action: 'generate_marketing_action',
          opportunityId,
        },
      });

      if (error) throw error;

      toast({
        title: 'Acción generada',
        description: 'Se ha creado una sugerencia de marketing.',
      });

      await refetchOpportunities();
      await refetchActions();
      return data;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [toast, refetchOpportunities, refetchActions]);

  // Approve action (admin only)
  const approveAction = useMutation({
    mutationFn: async ({ actionId, approvedMessage }: { actionId: string; approvedMessage?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('clinical_marketing_actions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          approved_message: approvedMessage,
        })
        .eq('id', actionId);

      if (error) throw error;

      // Log audit
      await supabase.from('clinical_marketing_audit').insert({
        action_id: actionId,
        event_type: 'action_approved',
        performed_by: user?.id || '',
        performed_by_role: 'admin',
        previous_status: 'suggested',
        new_status: 'approved',
      });

      // Log for learning
      const { data: action } = await supabase
        .from('clinical_marketing_actions')
        .select('*, clinical_opportunities(opportunity_type)')
        .eq('id', actionId)
        .single();

      if (action) {
        await supabase.from('clinical_ai_learning').insert({
          opportunity_type: action.clinical_opportunities?.opportunity_type || 'unknown',
          action_type: action.action_type,
          was_approved: true,
          original_message: action.suggested_message,
          approved_message: approvedMessage || action.suggested_message,
          suggested_timing: action.suggested_send_window,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-marketing-actions'] });
      queryClient.invalidateQueries({ queryKey: ['clinical-opportunities'] });
      toast({ title: 'Acción aprobada' });
    },
  });

  // Discard opportunity
  const discardOpportunity = useMutation({
    mutationFn: async ({ opportunityId, reason }: { opportunityId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('clinical_opportunities')
        .update({
          status: 'discarded',
          discarded_at: new Date().toISOString(),
          discarded_by: user?.id,
          discard_reason: reason,
        })
        .eq('id', opportunityId);

      if (error) throw error;

      // Log audit
      await supabase.from('clinical_marketing_audit').insert({
        opportunity_id: opportunityId,
        event_type: 'opportunity_discarded',
        performed_by: user?.id || '',
        performed_by_role: isAdmin ? 'admin' : 'doctor',
        previous_status: 'detected',
        new_status: 'discarded',
        details: { reason },
      });

      // Log for learning
      const { data: opp } = await supabase
        .from('clinical_opportunities')
        .select('opportunity_type')
        .eq('id', opportunityId)
        .single();

      if (opp) {
        await supabase.from('clinical_ai_learning').insert({
          opportunity_type: opp.opportunity_type,
          action_type: 'none',
          was_approved: false,
          metadata: { discard_reason: reason },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinical-opportunities'] });
      toast({ title: 'Oportunidad descartada' });
    },
  });

  return {
    opportunities,
    marketingActions,
    loadingOpportunities,
    isDetecting,
    isGenerating,
    isAdmin,
    isDoctor,
    detectOpportunities,
    generateMarketingAction,
    approveAction,
    discardOpportunity,
    refetchOpportunities,
    refetchActions,
  };
}
