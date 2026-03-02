import { useState, useEffect, useCallback, useRef } from 'react';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';

interface UseUnsavedChangesOptions {
  /** Whether the form has been modified */
  isDirty: boolean;
  /** Called when user wants to save draft before leaving */
  onSaveDraft?: () => void;
  /** Whether this protection is enabled */
  enabled?: boolean;
}

/**
 * Global hook for unsaved-changes protection.
 * - Shows browser-native beforeunload warning on refresh/close.
 * - Provides a confirmation dialog component for in-app navigation.
 * - Exposes `confirmClose` to wrap any close/navigate action.
 */
export function useUnsavedChanges({
  isDirty,
  onSaveDraft,
  enabled = true,
}: UseUnsavedChangesOptions) {
  const [showDialog, setShowDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // ---- beforeunload (browser refresh / tab close) ----
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show a prompt
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, enabled]);

  /**
   * Call this instead of directly closing.
   * If dirty → shows confirmation dialog; otherwise runs `action` immediately.
   */
  const confirmClose = useCallback(
    (action: () => void) => {
      if (!enabled || !isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setShowDialog(true);
    },
    [isDirty, enabled],
  );

  const handleContinue = useCallback(() => {
    setShowDialog(false);
    pendingActionRef.current = null;
  }, []);

  const handleDiscard = useCallback(() => {
    setShowDialog(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  const handleSaveDraft = useCallback(() => {
    onSaveDraft?.();
    setShowDialog(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, [onSaveDraft]);

  /** Render this wherever the dialog should appear */
  const UnsavedDialog = useCallback(
    () => (
      <UnsavedChangesDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onContinue={handleContinue}
        onDiscard={handleDiscard}
        onSaveDraft={onSaveDraft ? handleSaveDraft : undefined}
      />
    ),
    [showDialog, handleContinue, handleDiscard, handleSaveDraft, onSaveDraft],
  );

  return { confirmClose, UnsavedDialog, showDialog };
}
