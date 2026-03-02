import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, DollarSign, ShieldCheck, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PaymentProbabilityBadge } from '@/components/patients/PaymentProbabilityBadge';
import { usePaymentProbability } from '@/hooks/usePaymentProbability';
import type { PatientCreditStatus } from '@/hooks/usePatientCreditStatus';

interface MorosoBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  patientId: string;
  creditStatus: PatientCreditStatus;
  isAdmin: boolean;
  adminExceptionOnly: boolean;
  userId: string;
  onExceptionGranted: () => void;
}

export function MorosoBlockModal({
  open,
  onOpenChange,
  patientName,
  patientId,
  creditStatus,
  isAdmin,
  adminExceptionOnly,
  userId,
  onExceptionGranted,
}: MorosoBlockModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const probability = usePaymentProbability(patientId);

  const canAuthorize = adminExceptionOnly ? isAdmin : true;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAuthorize = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('moroso_sale_exceptions').insert({
        patient_id: patientId,
        user_id: userId,
        reason: reason.trim(),
        saldo_pendiente: creditStatus.saldoPendienteTotal,
        dias_atraso: creditStatus.diasAtraso,
      });
      if (error) throw error;

      toast({ title: 'Excepción autorizada', description: 'Se permite esta venta por única vez.' });
      onExceptionGranted();
      onOpenChange(false);
      setReason('');
    } catch (err) {
      console.error('Error saving moroso exception:', err);
      toast({ title: 'Error', description: 'No se pudo registrar la excepción.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Paciente Moroso
          </DialogTitle>
          <DialogDescription>
            No se puede completar la venta porque el paciente tiene pagos vencidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient info */}
          <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{patientName}</span>
              <div className="flex items-center gap-2">
                {!probability.loading && (
                  <PaymentProbabilityBadge score={probability.score} riskLevel={probability.riskLevel} compact showScore />
                )}
                <Badge variant="destructive">MOROSO</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs">Saldo pendiente</span>
                <span className="font-bold text-destructive text-lg">{formatCurrency(creditStatus.saldoPendienteTotal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Días de atraso</span>
                <span className="font-bold text-destructive text-lg">{creditStatus.diasAtraso} días</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground block text-xs">Pago vencido desde</span>
                <span className="font-medium">{formatDate(creditStatus.nextPaymentDate)}</span>
              </div>
            </div>
          </div>

          {/* Admin authorize section */}
          {canAuthorize && (
            <div className="space-y-2 border-t pt-4">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Autorizar venta (solo esta vez)
              </Label>
              <Textarea
                placeholder="Motivo de la excepción (obligatorio)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              navigate(`/cobro-rapido?patientId=${patientId}`);
              onOpenChange(false);
            }}
          >
            <DollarSign className="h-4 w-4" />
            Ir a Cobro Rápido
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {canAuthorize && (
            <Button
              onClick={handleAuthorize}
              disabled={!reason.trim() || saving}
              className="gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              {saving ? 'Autorizando...' : 'Autorizar venta'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
