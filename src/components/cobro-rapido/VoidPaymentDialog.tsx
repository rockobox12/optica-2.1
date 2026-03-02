import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

interface VoidPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  paymentAmount: number;
  saleNumber: string;
  onVoided: (result: { saleId: string; voidedAmount: number }) => void;
}

const VOID_REASONS = [
  'Monto incorrecto',
  'Paciente equivocado',
  'Método de pago incorrecto',
  'Error de captura',
  'Otro',
];

export function VoidPaymentDialog({
  open,
  onOpenChange,
  paymentId,
  paymentAmount,
  saleNumber,
  onVoided,
}: VoidPaymentDialogProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const { toast } = useToast();
  const { profile } = useAuth();

  const voidPayment = useMutation({
    mutationFn: async () => {
      const finalReason = reason === 'Otro' ? customReason : reason;
      
      if (!finalReason.trim()) {
        throw new Error('El motivo de anulación es obligatorio');
      }

      const { data, error } = await supabase.rpc('void_payment', {
        p_payment_id: paymentId,
        p_voided_by: profile?.userId,
        p_reason: finalReason.trim(),
      });

      if (error) throw error;
      return data as { success: boolean; sale_id: string; voided_amount: number };
    },
    onSuccess: (data) => {
      // Log replacement started
      supabase.from('payment_audit_log').insert({
        event_type: 'PAYMENT_REPLACEMENT_STARTED',
        old_payment_id: paymentId,
        performed_by: profile?.userId || '',
        metadata: { voided_amount: data.voided_amount },
      });

      toast({
        title: 'Pago anulado',
        description: `El pago de $${paymentAmount.toFixed(2)} fue anulado. Registra el pago correcto.`,
      });

      onVoided({
        saleId: data.sale_id,
        voidedAmount: data.voided_amount,
      });
      
      setReason('');
      setCustomReason('');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al anular pago',
        description: error.message || 'No se pudo anular el pago',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    voidPayment.mutate();
  };

  const handleCancel = () => {
    setReason('');
    setCustomReason('');
    onOpenChange(false);
  };

  const isValid = reason && (reason !== 'Otro' || customReason.trim().length > 0);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Anular y reemplazar pago
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Vas a anular el pago de <strong>${paymentAmount.toFixed(2)}</strong> del 
              folio <strong>{saleNumber}</strong> y registrar uno nuevo.
            </p>
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. El pago quedará marcado como ANULADO.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="void-reason">Motivo de anulación *</Label>
            <div className="flex flex-wrap gap-2">
              {VOID_REASONS.map((r) => (
                <Button
                  key={r}
                  type="button"
                  size="sm"
                  variant={reason === r ? 'default' : 'outline'}
                  onClick={() => setReason(r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>

          {reason === 'Otro' && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Especifica el motivo *</Label>
              <Textarea
                id="custom-reason"
                placeholder="Describe el motivo de la anulación..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
              />
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={voidPayment.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || voidPayment.isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {voidPayment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Anulando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Anular y continuar
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
