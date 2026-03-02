import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Smartphone, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { generateManualOTP } from '@/hooks/usePatientPortal';

interface PortalAccessButtonProps {
  patientId: string;
  patientPhone: string | null;
  patientName: string;
}

export function PortalAccessButton({ patientId, patientPhone, patientName }: PortalAccessButtonProps) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSendAccess = async () => {
    if (!patientPhone) {
      toast({ title: 'Sin teléfono', description: 'El paciente no tiene teléfono registrado', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await generateManualOTP(patientPhone, patientId, patientName);
      setResult(res);
      setShowModal(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (result?.fullMessage) {
      navigator.clipboard.writeText(result.fullMessage);
      toast({ title: 'Copiado', description: 'Mensaje con link y código copiado' });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSendAccess}
        disabled={loading || !patientPhone}
        className="gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
        <span className="hidden sm:inline">Portal</span>
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar acceso al Portal</DialogTitle>
            <DialogDescription>
              Envía el link y código OTP a {patientName}
            </DialogDescription>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              {result.dbWarning && (
                <p className="text-xs text-amber-600">⚠️ {result.dbWarning}</p>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Link del portal:</p>
                <div className="p-2 bg-muted rounded text-sm font-mono break-all">{result.portalUrl}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Código OTP:</p>
                <div className="p-2 bg-muted rounded text-2xl font-bold text-center tracking-widest">{result.otp}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Mensaje completo:</p>
                <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">{result.fullMessage}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar todo
                </Button>
                {result.whatsappUrl && (
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" asChild>
                    <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> Abrir WhatsApp
                    </a>
                  </Button>
                )}
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setShowModal(false)}>
                Cerrar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
