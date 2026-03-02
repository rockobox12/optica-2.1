import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemName?: string;
  description?: string;
  showDontAskAgain?: boolean;
  onDontAskAgainChange?: (checked: boolean) => void;
  isLoading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmar eliminación",
  itemName,
  description,
  showDontAskAgain = false,
  onDontAskAgainChange,
  isLoading = false,
}: ConfirmDeleteDialogProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDontAskChange = (checked: boolean) => {
    setDontAskAgain(checked);
    onDontAskAgainChange?.(checked);
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const loading = isLoading || isDeleting;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"
            >
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </motion.div>
            <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 text-base">
            {description || (
              <>
                ¿Estás seguro de eliminar{" "}
                {itemName ? (
                  <span className="font-semibold text-foreground">"{itemName}"</span>
                ) : (
                  "este elemento"
                )}
                ? Esta acción no se puede deshacer.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {showDontAskAgain && (
          <div className="flex items-center space-x-2 py-2">
            <Checkbox
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(checked) => handleDontAskChange(checked as boolean)}
            />
            <Label
              htmlFor="dont-ask-again"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              No volver a preguntar
            </Label>
          </div>
        )}

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading} className="mt-0">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
              />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for managing delete confirmation state
export function useConfirmDelete() {
  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    itemId: string | null;
    itemName: string | null;
  }>({
    open: false,
    itemId: null,
    itemName: null,
  });

  const requestDelete = (itemId: string, itemName?: string) => {
    setDeleteState({
      open: true,
      itemId,
      itemName: itemName || null,
    });
  };

  const cancelDelete = () => {
    setDeleteState({
      open: false,
      itemId: null,
      itemName: null,
    });
  };

  const confirmDelete = async (onDelete: (id: string) => Promise<void> | void) => {
    if (deleteState.itemId) {
      await onDelete(deleteState.itemId);
      cancelDelete();
    }
  };

  return {
    deleteState,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
