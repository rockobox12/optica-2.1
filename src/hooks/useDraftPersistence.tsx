import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, RotateCcw, Cloud, CloudOff } from 'lucide-react';

type FormType = 'POS_SALE' | 'PATIENT' | 'APPOINTMENT' | 'LAB_ORDER';

interface DraftPersistenceOptions<T> {
  formName: string;
  formType: FormType;
  entityId?: string | null;
  debounceMs?: number;
  backendSyncIntervalMs?: number;
  enabled?: boolean;
}

interface DraftData<T> {
  data: T;
  savedAt: string;
  version: number;
}

interface BackendDraft {
  id: string;
  draft_data: Record<string, unknown>;
  updated_at: string;
}

const DRAFT_VERSION = 1;

function getDraftKey(userId: string | undefined, branchId: string | null | undefined, formName: string): string {
  return `draft:${userId || 'anonymous'}:${branchId || 'default'}:${formName}`;
}

export function useDraftPersistence<T extends Record<string, unknown>>({
  formName,
  formType,
  entityId = null,
  debounceMs = 800,
  backendSyncIntervalMs = 20000, // 20 seconds
  enabled = true,
}: DraftPersistenceOptions<T>) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData<T> | null>(null);
  const [backendDraft, setBackendDraft] = useState<BackendDraft | null>(null);
  const [draftSource, setDraftSource] = useState<'local' | 'cloud' | null>(null);
  const [isRestored, setIsRestored] = useState(false);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const backendSyncRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const isDirtyRef = useRef(false);
  const backendDraftIdRef = useRef<string | null>(null);

  const draftKey = getDraftKey(user?.id, profile?.defaultBranchId, formName);

  // Sync to backend
  const syncToBackend = useCallback(async (data: T, force = false) => {
    if (!enabled || !user?.id) return;
    
    // Only sync if dirty or forced
    if (!isDirtyRef.current && !force) return;
    
    setIsSyncingToCloud(true);
    try {
      const { data: result, error } = await supabase.rpc('upsert_draft', {
        p_user_id: user.id,
        p_branch_id: profile?.defaultBranchId || null,
        p_form_type: formType,
        p_entity_id: entityId || null,
        p_draft_data: data as unknown as Record<string, never>,
      });

      if (error) {
        console.error('Error syncing draft to cloud:', error);
        return;
      }

      if (result) {
        backendDraftIdRef.current = result;
        setLastCloudSync(new Date());
        isDirtyRef.current = false;
      }
    } catch (error) {
      console.error('Error syncing draft to cloud:', error);
    } finally {
      setIsSyncingToCloud(false);
    }
  }, [enabled, user?.id, profile?.defaultBranchId, formType, entityId]);

  // Fetch backend draft
  const fetchBackendDraft = useCallback(async (): Promise<BackendDraft | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase.rpc('get_active_draft', {
        p_user_id: user.id,
        p_branch_id: profile?.defaultBranchId || null,
        p_form_type: formType,
        p_entity_id: entityId || null,
      });

      if (error) {
        console.error('Error fetching backend draft:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0] as BackendDraft;
      }
      return null;
    } catch (error) {
      console.error('Error fetching backend draft:', error);
      return null;
    }
  }, [user?.id, profile?.defaultBranchId, formType, entityId]);

  // Load draft on mount - check local first, then backend
  useEffect(() => {
    if (!enabled) return;

    const loadDrafts = async () => {
      let localDraft: DraftData<T> | null = null;
      let cloudDraft: BackendDraft | null = null;

      // Try local first
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed: DraftData<T> = JSON.parse(savedDraft);
          if (parsed.version === DRAFT_VERSION && parsed.data) {
            localDraft = parsed;
          }
        }
      } catch (error) {
        console.error('Error loading local draft:', error);
      }

      // Then try backend
      cloudDraft = await fetchBackendDraft();
      if (cloudDraft) {
        setBackendDraft(cloudDraft);
        backendDraftIdRef.current = cloudDraft.id;
      }

      // Determine which to use based on updated_at
      if (localDraft && cloudDraft) {
        const localTime = new Date(localDraft.savedAt).getTime();
        const cloudTime = new Date(cloudDraft.updated_at).getTime();
        
        if (cloudTime > localTime) {
          // Cloud is newer
          setDraftSource('cloud');
          setPendingDraft({
            data: cloudDraft.draft_data as T,
            savedAt: cloudDraft.updated_at,
            version: DRAFT_VERSION,
          });
        } else {
          // Local is newer
          setDraftSource('local');
          setPendingDraft(localDraft);
        }
        setShowRestoreModal(true);
      } else if (cloudDraft) {
        setDraftSource('cloud');
        setPendingDraft({
          data: cloudDraft.draft_data as T,
          savedAt: cloudDraft.updated_at,
          version: DRAFT_VERSION,
        });
        setShowRestoreModal(true);
      } else if (localDraft) {
        setDraftSource('local');
        setPendingDraft(localDraft);
        setShowRestoreModal(true);
      }
    };

    loadDrafts();
  }, [draftKey, enabled, fetchBackendDraft]);

  // Handle visibility change - save immediately when hiding
  // NOTE: Avoid backend sync here to prevent auth refresh on tab switch.
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && lastSavedRef.current) {
        // Force immediate local save
        try {
          localStorage.setItem(draftKey, lastSavedRef.current);
        } catch (error) {
          console.error('Error saving draft on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [draftKey, enabled]);

  // Periodic backend sync
  useEffect(() => {
    if (!enabled || !user?.id) return;

    backendSyncRef.current = setInterval(() => {
      if (isDirtyRef.current && lastSavedRef.current) {
        try {
          const parsed = JSON.parse(lastSavedRef.current) as DraftData<T>;
          if (parsed.data) {
            syncToBackend(parsed.data);
          }
        } catch (error) {
          console.error('Error in periodic sync:', error);
        }
      }
    }, backendSyncIntervalMs);

    return () => {
      if (backendSyncRef.current) {
        clearInterval(backendSyncRef.current);
      }
    };
  }, [enabled, user?.id, backendSyncIntervalMs, syncToBackend]);

  // Save draft with debounce (local)
  const saveDraft = useCallback((data: T) => {
    if (!enabled) return;

    // Prepare draft data
    const draftData: DraftData<T> = {
      data,
      savedAt: new Date().toISOString(),
      version: DRAFT_VERSION,
    };
    const serialized = JSON.stringify(draftData);
    lastSavedRef.current = serialized;
    isDirtyRef.current = true;

    // Debounced save to localStorage
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, serialized);
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }, debounceMs);
  }, [draftKey, debounceMs, enabled]);

  // Clear draft (on successful save)
  const clearDraft = useCallback(async () => {
    // Clear local
    try {
      localStorage.removeItem(draftKey);
      lastSavedRef.current = '';
      isDirtyRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    } catch (error) {
      console.error('Error clearing local draft:', error);
    }

    // Mark backend draft as submitted
    if (backendDraftIdRef.current) {
      try {
        await supabase.rpc('resolve_draft', {
          p_draft_id: backendDraftIdRef.current,
          p_status: 'SUBMITTED',
        });
        backendDraftIdRef.current = null;
      } catch (error) {
        console.error('Error resolving backend draft:', error);
      }
    }
  }, [draftKey]);

  // Discard draft manually
  const discardDraft = useCallback(async () => {
    // Clear local
    try {
      localStorage.removeItem(draftKey);
      lastSavedRef.current = '';
      isDirtyRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    } catch (error) {
      console.error('Error clearing local draft:', error);
    }

    // Mark backend draft as discarded
    if (backendDraftIdRef.current) {
      try {
        await supabase.rpc('resolve_draft', {
          p_draft_id: backendDraftIdRef.current,
          p_status: 'DISCARDED',
        });
        backendDraftIdRef.current = null;
      } catch (error) {
        console.error('Error discarding backend draft:', error);
      }
    }

    setPendingDraft(null);
    setBackendDraft(null);
    setShowRestoreModal(false);
    setIsRestored(false);
    
    toast({
      title: 'Borrador descartado',
      description: 'Los datos del borrador han sido eliminados',
    });
  }, [draftKey, toast]);

  // Restore draft
  const restoreDraft = useCallback(() => {
    if (pendingDraft) {
      setIsRestored(true);
      setShowRestoreModal(false);
      toast({
        title: 'Borrador restaurado',
        description: draftSource === 'cloud' 
          ? 'Se han recuperado los datos desde la nube'
          : 'Se han recuperado los datos del formulario',
      });
      return pendingDraft.data;
    }
    return null;
  }, [pendingDraft, draftSource, toast]);

  // Skip restore (keep draft for later)
  const skipRestore = useCallback(async () => {
    setShowRestoreModal(false);
    // Clear drafts since user declined
    await discardDraft();
  }, [discardDraft]);

  // Get restored data (call once after mount)
  const getRestoredData = useCallback((): T | null => {
    if (isRestored && pendingDraft) {
      return pendingDraft.data;
    }
    return null;
  }, [isRestored, pendingDraft]);

  // Save draft manually with toast
  const saveManualDraft = useCallback(async (data: T) => {
    if (!enabled) return;

    const draftData: DraftData<T> = {
      data,
      savedAt: new Date().toISOString(),
      version: DRAFT_VERSION,
    };

    try {
      // Save local
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      
      // Sync to backend
      await syncToBackend(data, true);
      
      toast({
        title: 'Borrador guardado',
        description: 'Los datos se han guardado localmente y en la nube',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el borrador',
        variant: 'destructive',
      });
    }
  }, [draftKey, enabled, syncToBackend, toast]);

  // Restore modal component
  const RestoreModal = () => (
    <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {draftSource === 'cloud' ? (
              <Cloud className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            Borrador encontrado
          </DialogTitle>
          <DialogDescription>
            Se encontró un borrador guardado {draftSource === 'cloud' ? 'en la nube' : 'localmente'}.
            {pendingDraft && (
              <span className="block mt-1 text-xs">
                Guardado: {new Date(pendingDraft.savedAt).toLocaleString('es-MX')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={skipRestore}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Descartar
          </Button>
          <Button
            onClick={() => restoreDraft()}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Cloud sync status indicator
  const CloudSyncIndicator = () => {
    if (!user?.id) return null;
    
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {isSyncingToCloud ? (
          <>
            <Cloud className="h-3 w-3 animate-pulse" />
            <span>Sincronizando...</span>
          </>
        ) : lastCloudSync ? (
          <>
            <Cloud className="h-3 w-3 text-primary" />
            <span>Guardado en nube</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3" />
            <span>Sin sincronizar</span>
          </>
        )}
      </div>
    );
  };

  return {
    saveDraft,
    clearDraft,
    discardDraft,
    saveManualDraft,
    getRestoredData,
    isRestored,
    pendingDraft,
    isSyncingToCloud,
    lastCloudSync,
    draftSource,
    RestoreModal,
    CloudSyncIndicator,
  };
}

// Utility to clear all drafts for a user
export function clearAllDrafts(userId?: string, branchId?: string) {
  const prefix = `draft:${userId || ''}:${branchId || ''}`;
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('draft:')) {
      if (!userId || key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
  }

  keysToRemove.forEach(key => localStorage.removeItem(key));
}
