import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { findDuplicates, type DuplicateMatch, type DuplicateInput } from '@/lib/duplicate-detection';

export function useDuplicateDetection() {
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const { user } = useAuth();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which patient IDs we've already logged as DUPLICATE_SUGGESTED
  const loggedSuggestionsRef = useRef<Set<string>>(new Set());

  const checkDuplicates = useCallback(async (input: DuplicateInput, excludePatientId?: string) => {
    // Need at least a name to check
    if (!input.firstName || input.firstName.length < 2) {
      setMatches([]);
      return;
    }

    // Debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(async () => {
      setChecking(true);
      try {
        // Build query to find potential candidates
        const namePrefix = input.firstName.slice(0, 3).toLowerCase();
        
        const nameQuery = supabase
          .from('patients')
          .select('id, first_name, last_name, phone, mobile, whatsapp, birth_date, branch_id, email')
          .eq('is_active', true)
          .eq('is_deleted', false)
          .ilike('first_name', `${namePrefix}%`)
          .limit(50);

        const results: { data: any[] | null }[] = [await nameQuery];

        // Also query by phone if provided
        const phoneDigits = (input.phone || input.whatsapp || '').replace(/\D/g, '');
        if (phoneDigits.length >= 7) {
          const last7 = phoneDigits.slice(-7);
          const phoneQuery = await supabase
            .from('patients')
            .select('id, first_name, last_name, phone, mobile, whatsapp, birth_date, branch_id, email')
            .eq('is_active', true)
            .eq('is_deleted', false)
            .or(`phone.ilike.%${last7}%,mobile.ilike.%${last7}%,whatsapp.ilike.%${last7}%`)
            .limit(20);
          results.push(phoneQuery);
        }
        
        const candidateMap = new Map<string, any>();
        for (const result of results) {
          if (result.data) {
            for (const p of result.data) {
              if (p.id !== excludePatientId) {
                candidateMap.set(p.id, p);
              }
            }
          }
        }

        const candidates = Array.from(candidateMap.values());
        const duplicateMatches = findDuplicates(input, candidates);
        
        setMatches(duplicateMatches);

        // Log DUPLICATE_SUGGESTED events for new matches
        if (duplicateMatches.length > 0 && user?.id) {
          const newSuggestions = duplicateMatches.filter(
            m => !loggedSuggestionsRef.current.has(m.patient.id)
          );
          
          if (newSuggestions.length > 0) {
            const events = newSuggestions.map(m => ({
              event_type: 'DUPLICATE_SUGGESTED' as const,
              patient_id_matched: m.patient.id,
              score: m.score,
              match_reasons: m.reasons,
              user_id: user.id,
            }));
            
            // Fire and forget
            supabase.from('duplicate_detection_events').insert(events).then(({ error }) => {
              if (error) console.warn('Failed to log duplicate events:', error);
            });
            
            newSuggestions.forEach(m => loggedSuggestionsRef.current.add(m.patient.id));
          }
        }
      } catch (error) {
        console.error('Duplicate detection error:', error);
      } finally {
        setChecking(false);
      }
    }, 500);
  }, [user?.id]);

  const logIgnored = useCallback(async (matchedPatientId: string, score: number, reasons: string[], newPatientId?: string) => {
    if (!user?.id) return;
    
    await supabase.from('duplicate_detection_events').insert({
      event_type: 'DUPLICATE_IGNORED',
      patient_id_new: newPatientId || null,
      patient_id_matched: matchedPatientId,
      score,
      match_reasons: reasons,
      user_id: user.id,
    });
  }, [user?.id]);

  const clearMatches = useCallback(() => {
    setMatches([]);
    loggedSuggestionsRef.current.clear();
  }, []);

  return {
    matches,
    checking,
    checkDuplicates,
    logIgnored,
    clearMatches,
  };
}
