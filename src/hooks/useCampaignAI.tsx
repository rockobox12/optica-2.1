import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface AISegment {
  name: string;
  segment_type: string;
  description: string;
  criteria: Record<string, any>;
  estimated_size: number;
  justification: string;
}

interface AICampaign {
  name: string;
  description: string;
  recommended_segment: string;
  messages: Array<{
    variant: string;
    content: string;
    cta: string;
    subject?: string;
  }>;
  suggested_send_time: string;
  best_days: string[];
  best_hours: string;
  estimated_reach: number;
  tips: string[];
}

interface AIAnalysis {
  summary: string;
  metrics_analysis: Record<string, { value: number; interpretation: string }>;
  roi_analysis: string;
  recommendations: string[];
  next_campaign_suggestion?: {
    objective: string;
    segment: string;
    timing: string;
  };
}

type CampaignAction = 'generate_segments' | 'generate_campaign' | 'generate_messages' | 'analyze_results' | 'suggest_improvements';

export function useCampaignAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [segments, setSegments] = useState<AISegment[]>([]);
  const [campaign, setCampaign] = useState<AICampaign | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  const executeAI = async (
    action: CampaignAction,
    params: {
      objective?: string;
      channel?: string;
      campaignId?: string;
      context?: Record<string, any>;
    } = {}
  ) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('campaign-ai-assistant', {
        body: {
          action,
          branchId: profile?.defaultBranchId,
          ...params,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'AI request failed');

      const result = data.result;

      switch (action) {
        case 'generate_segments':
          setSegments(result.segments || []);
          break;
        case 'generate_campaign':
          setCampaign(result.campaign || null);
          break;
        case 'analyze_results':
        case 'suggest_improvements':
          setAnalysis(result);
          break;
      }

      return result;
    } catch (error: any) {
      console.error('Campaign AI error:', error);
      toast({
        title: 'Error de IA',
        description: error.message || 'No se pudo procesar la solicitud',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generateSegments = (context?: Record<string, any>) => 
    executeAI('generate_segments', { context });

  const generateCampaign = (objective: string, channel: string, context?: Record<string, any>) =>
    executeAI('generate_campaign', { objective, channel, context });

  const generateMessages = (objective: string, channel: string, context?: Record<string, any>) =>
    executeAI('generate_messages', { objective, channel, context });

  const analyzeResults = (campaignId: string, context: Record<string, any>) =>
    executeAI('analyze_results', { campaignId, context });

  const suggestImprovements = (context: Record<string, any>) =>
    executeAI('suggest_improvements', { context });

  const logAudit = async (
    campaignId: string,
    action: string,
    previousStatus: string | null,
    newStatus: string | null,
    notes?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('campaign_audit_log')
        .insert({
          campaign_id: campaignId,
          action,
          previous_status: previousStatus,
          new_status: newStatus,
          performed_by: user.id,
          performed_by_role: 'authenticated',
          notes,
          metadata,
        });

      if (error) console.error('Audit log error:', error);
    } catch (err) {
      console.error('Failed to log audit:', err);
    }
  };

  return {
    isLoading,
    segments,
    campaign,
    analysis,
    generateSegments,
    generateCampaign,
    generateMessages,
    analyzeResults,
    suggestImprovements,
    logAudit,
    clearCampaign: () => setCampaign(null),
    clearSegments: () => setSegments([]),
    clearAnalysis: () => setAnalysis(null),
  };
}
