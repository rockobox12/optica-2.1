import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AddClinicalConfig {
  id: string;
  edad_minima_add: number;
  permitir_add_menores: boolean;
  mostrar_sugerencia_add: boolean;
  add_min: number;
  add_max: number;
  add_step: number;
}

export interface AddAgeSuggestion {
  id: string;
  min_age: number;
  max_age: number | null;
  suggested_add: number;
  is_active: boolean;
}

interface UseAddClinicalConfigReturn {
  config: AddClinicalConfig | null;
  suggestions: AddAgeSuggestion[];
  loading: boolean;
  error: string | null;
  updateConfig: (updates: Partial<AddClinicalConfig>) => Promise<boolean>;
  getSuggestionForAge: (age: number) => number | null;
  shouldShowAdd: (age: number | null) => {
    show: boolean;
    disabled: boolean;
    warning?: string;
  };
}

const DEFAULT_CONFIG: AddClinicalConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  edad_minima_add: 40,
  permitir_add_menores: false,
  mostrar_sugerencia_add: true,
  add_min: 0.50,
  add_max: 3.50,
  add_step: 0.25,
};

export function useAddClinicalConfig(): UseAddClinicalConfigReturn {
  const { user, roles } = useAuth();
  const [config, setConfig] = useState<AddClinicalConfig | null>(null);
  const [suggestions, setSuggestions] = useState<AddAgeSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = roles.some(r => r === 'admin');

  // Fetch config and suggestions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch config
        const { data: configData, error: configError } = await supabase
          .from('add_clinical_config')
          .select('*')
          .single();

        if (configError) throw configError;

        // Fetch age suggestions
        const { data: suggestionsData, error: suggestionsError } = await supabase
          .from('add_age_suggestions')
          .select('*')
          .eq('is_active', true)
          .order('min_age', { ascending: true });

        if (suggestionsError) throw suggestionsError;

        setConfig(configData as AddClinicalConfig);
        setSuggestions(suggestionsData as AddAgeSuggestion[]);
      } catch (err) {
        console.error('Error fetching ADD clinical config:', err);
        setError('Error al cargar configuración de ADD');
        // Use defaults if fetch fails
        setConfig(DEFAULT_CONFIG);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Update config (admin only)
  const updateConfig = async (updates: Partial<AddClinicalConfig>): Promise<boolean> => {
    if (!isAdmin || !config) return false;

    try {
      const { error: updateError } = await supabase
        .from('add_clinical_config')
        .update({
          ...updates,
          updated_by: user?.id,
        })
        .eq('id', config.id);

      if (updateError) throw updateError;

      setConfig(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating ADD config:', err);
      return false;
    }
  };

  // Get ADD suggestion for a specific age
  const getSuggestionForAge = (age: number): number | null => {
    if (!config?.mostrar_sugerencia_add) return null;
    if (age < (config?.edad_minima_add ?? 40)) return null;

    const suggestion = suggestions.find(
      s => age >= s.min_age && (s.max_age === null || age <= s.max_age)
    );

    return suggestion?.suggested_add ?? null;
  };

  // Determine if ADD should be shown and how
  const shouldShowAdd = (age: number | null): {
    show: boolean;
    disabled: boolean;
    warning?: string;
  } => {
    const effectiveConfig = config ?? DEFAULT_CONFIG;
    
    // If no birth date, allow capture but no suggestions
    if (age === null) {
      return {
        show: true,
        disabled: false,
        warning: 'Sin fecha de nacimiento - verificar si aplica ADD',
      };
    }

    const minAge = effectiveConfig.edad_minima_add;
    const allowMinors = effectiveConfig.permitir_add_menores;

    // Patient is at or above minimum age
    if (age >= minAge) {
      return { show: true, disabled: false };
    }

    // Patient is below minimum age
    if (allowMinors) {
      return {
        show: true,
        disabled: false,
        warning: `Paciente menor de ${minAge} años. Verifica si aplica ADD.`,
      };
    }

    // Below minimum age and not allowed
    return {
      show: true,
      disabled: true,
      warning: `ADD normalmente aplica a partir de ${minAge} años`,
    };
  };

  return {
    config,
    suggestions,
    loading,
    error,
    updateConfig,
    getSuggestionForAge,
    shouldShowAdd,
  };
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}
