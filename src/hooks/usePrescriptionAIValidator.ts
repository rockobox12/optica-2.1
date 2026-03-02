import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PrescriptionData {
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_add: number | null;
  oi_sphere: number | null;
  oi_cylinder: number | null;
  oi_axis: number | null;
  oi_add: number | null;
}

export interface Finding {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  recommendation: string;
  eye?: 'OD' | 'OI' | 'BOTH';
}

interface AnalysisResult {
  findings: Finding[];
  findingsCount: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  hasHistory: boolean;
  historyCount: number;
}

export function usePrescriptionAIValidator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = useCallback(async (
    patientId: string,
    currentPrescription: PrescriptionData
  ): Promise<AnalysisResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await supabase.functions.invoke('prescription-ai-validator', {
        body: { patientId, currentPrescription },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error al analizar');
      }

      const analysisResult = response.data as AnalysisResult;
      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAudit = useCallback(async (
    patientId: string,
    prescriptionId: string | null,
    userId: string,
    findings: Finding[],
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  ) => {
    try {
      // Use type assertion to work with the table
      const insertData = {
        patient_id: patientId,
        prescription_id: prescriptionId,
        user_id: userId,
        findings_count: findings.length,
        severity: severity,
        findings: JSON.stringify(findings),
      };
      
      await supabase.from('prescription_ai_analysis').insert(insertData as never);
    } catch (err) {
      console.error('Error saving AI audit:', err);
    }
  }, []);

  const markAsReviewed = useCallback(async (analysisId: string) => {
    try {
      await supabase
        .from('prescription_ai_analysis')
        .update({ 
          was_reviewed: true, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', analysisId);
    } catch (err) {
      console.error('Error marking as reviewed:', err);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    analyze,
    saveAudit,
    markAsReviewed,
    reset,
    loading,
    error,
    result,
  };
}
