import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user wants to stay editing */
  onContinue: () => void;
  /** Called when user confirms exit without saving */
  onDiscard: () => void;
  /** Optional: called when user wants to save draft */
  onSaveDraft?: () => void;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onContinue,
  onDiscard,
  onSaveDraft,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Tienes cambios sin guardar
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Deseas salir? Se perderán los cambios realizados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={() => {
                onSaveDraft();
                onOpenChange(false);
              }}
              className="sm:order-first"
            >
              Guardar borrador
            </Button>
          )}
          <AlertDialogCancel onClick={onContinue}>
            Seguir editando
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDiscard}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Salir sin guardar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
