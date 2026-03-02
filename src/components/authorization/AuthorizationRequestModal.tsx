import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, Send, X } from 'lucide-react';
import {
  useAdminAuthorization,
  ACTION_TYPE_LABELS,
  RESOURCE_TYPE_LABELS,
  type AuthorizationActionType,
} from '@/hooks/useAdminAuthorization';

interface AuthorizationRequestModalProps {
  open: boolean;
  onClose: () => void;
  actionType: AuthorizationActionType;
  resourceType: string;
  resourceDescription?: string;
  onSubmit: (comment?: string) => void;
  isSubmitting?: boolean;
}

export function AuthorizationRequestModal({
  open,
  onClose,
  actionType,
  resourceType,
  resourceDescription,
  onSubmit,
  isSubmitting = false,
}: AuthorizationRequestModalProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    onSubmit(comment.trim() || undefined);
    setComment('');
  };

  const handleClose = () => {
    setComment('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-warning" />
            </div>
            <div>
              <DialogTitle className="text-lg">Autorización Requerida</DialogTitle>
              <DialogDescription className="text-sm">
                Esta acción requiere aprobación del administrador
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Acción:</span>
              <Badge variant="outline" className="font-medium">
                {ACTION_TYPE_LABELS[actionType] || actionType}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recurso:</span>
              <span className="text-sm font-medium">
                {RESOURCE_TYPE_LABELS[resourceType] || resourceType}
              </span>
            </div>
            {resourceDescription && (
              <div className="pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Detalle:</span>
                <p className="text-sm font-medium mt-1">{resourceDescription}</p>
              </div>
            )}
          </div>

          {/* Comment field */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm font-medium">
              Motivo de la solicitud (opcional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Explica brevemente por qué necesitas realizar esta acción..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Info message */}
          <p className="text-xs text-muted-foreground">
            Tu solicitud será revisada por un administrador. Recibirás una notificación 
            cuando sea aprobada o rechazada.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Enviando...' : 'Solicitar Autorización'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Wrapper component that uses the hook
export function AuthorizationModal() {
  const { pendingAction, submitRequest, cancelRequest, isSubmitting } = useAdminAuthorization();

  if (!pendingAction) return null;

  return (
    <AuthorizationRequestModal
      open={!!pendingAction}
      onClose={cancelRequest}
      actionType={pendingAction.actionType}
      resourceType={pendingAction.resourceType}
      resourceDescription={pendingAction.resourceDescription}
      onSubmit={submitRequest}
      isSubmitting={isSubmitting}
    />
  );
}
