import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, FileText, ShieldCheck, X, AlertTriangle } from 'lucide-react';

interface PrescriptionRequiredModalProps {
  open: boolean;
  onClose: () => void;
  onOpenExpediente: () => void;
  onSelectPrescription: () => void;
  lensProductNames: string[];
  isAdmin: boolean;
  adminExceptionEnabled: boolean;
  onAdminException: (reason: string) => void;
}

export function PrescriptionRequiredModal({
  open,
  onClose,
  onOpenExpediente,
  onSelectPrescription,
  lensProductNames,
  isAdmin,
  adminExceptionEnabled,
  onAdminException,
}: PrescriptionRequiredModalProps) {
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');

  const handleException = () => {
    if (!exceptionReason.trim()) return;
    onAdminException(exceptionReason.trim());
    setShowExceptionForm(false);
    setExceptionReason('');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-5 w-5" />
            Receta/Examen Requerido
          </DialogTitle>
          <DialogDescription>
            Esta venta incluye lentes graduados y necesita una receta vinculada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Alert className="border-orange-300 bg-orange-50">
            <Eye className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm">
              <p className="font-medium text-orange-800 mb-1">Productos que requieren receta:</p>
              <ul className="list-disc list-inside text-orange-700 space-y-0.5">
                {lensProductNames.map((name, i) => (
                  <li key={i} className="text-sm">{name}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button
              className="w-full justify-start gap-2"
              variant="default"
              onClick={onOpenExpediente}
            >
              <Eye className="h-4 w-4" />
              Abrir expediente y crear graduación
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="secondary"
              onClick={onSelectPrescription}
            >
              <FileText className="h-4 w-4" />
              Seleccionar receta existente
            </Button>
          </div>

          {isAdmin && adminExceptionEnabled && (
            <div className="pt-2 border-t">
              {!showExceptionForm ? (
                <Button
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  size="sm"
                  onClick={() => setShowExceptionForm(true)}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Autorizar sin receta (Admin)
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-800">Motivo de la excepción:</p>
                  <Textarea
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    placeholder="Escriba el motivo obligatorio..."
                    className="min-h-[60px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleException}
                      disabled={!exceptionReason.trim()}
                    >
                      Confirmar Excepción
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowExceptionForm(false); setExceptionReason(''); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
