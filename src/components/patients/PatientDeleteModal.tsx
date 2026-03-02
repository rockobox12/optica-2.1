import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle,
  ShieldAlert,
  Archive,
  Loader2,
  CalendarClock,
  DollarSign,
  CreditCard,
  ShoppingCart,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { PatientTableItem } from './PatientTable';

interface PatientDeleteModalProps {
  patient: PatientTableItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

interface PatientSummary {
  salesCount: number;
  paymentsCount: number;
  appointmentsCount: number;
  labOrdersCount: number;
  saldoPendiente: number;
  salesWithBalance: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
  loading: boolean;
}

const EMPTY_SUMMARY: PatientSummary = {
  salesCount: 0,
  paymentsCount: 0,
  appointmentsCount: 0,
  labOrdersCount: 0,
  saldoPendiente: 0,
  salesWithBalance: 0,
  lastPaymentDate: null,
  lastPaymentAmount: null,
  nextPaymentDate: null,
  nextPaymentAmount: null,
  loading: true,
};

export function PatientDeleteModal({
  patient,
  open,
  onOpenChange,
  onDeleted,
}: PatientDeleteModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [acknowledgedArchive, setAcknowledgedArchive] = useState(false);
  const [acknowledgedDebt, setAcknowledgedDebt] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [summary, setSummary] = useState<PatientSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    if (!open) {
      setReason('');
      setConfirmText('');
      setAcknowledgedArchive(false);
      setAcknowledgedDebt(false);
      setSummary({ ...EMPTY_SUMMARY });
      return;
    }
    if (patient) {
      fetchSummary(patient.id);
    }
  }, [open, patient?.id]);

  const fetchSummary = async (patientId: string) => {
    setSummary(s => ({ ...s, loading: true }));
    try {
      const [salesRes, appointmentsRes, labRes, balanceRes] = await Promise.all([
        supabase.from('sales').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
        supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
        supabase.from('lab_orders').select('id', { count: 'exact', head: true }).eq('patient_id', patientId),
        supabase.from('sales').select('id, balance, next_payment_date, next_payment_amount').eq('patient_id', patientId).in('status', ['pending', 'partial']).gt('balance', 0),
      ]);

      const { data: salesIds } = await supabase.from('sales').select('id').eq('patient_id', patientId);

      let paymentsCount = 0;
      let lastPaymentDate: string | null = null;
      let lastPaymentAmount: number | null = null;

      if (salesIds && salesIds.length > 0) {
        const ids = salesIds.map(s => s.id);
        const { count } = await supabase.from('credit_payments').select('id', { count: 'exact', head: true }).in('sale_id', ids).eq('is_voided', false);
        paymentsCount = count || 0;

        const { data: lastPmt } = await supabase
          .from('credit_payments')
          .select('amount, created_at')
          .in('sale_id', ids)
          .eq('is_voided', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (lastPmt && lastPmt.length > 0) {
          lastPaymentDate = lastPmt[0].created_at;
          lastPaymentAmount = lastPmt[0].amount;
        }
      }

      const salesWithBalance = balanceRes.data || [];
      const saldo = salesWithBalance.reduce((sum, s) => sum + (s.balance || 0), 0);

      // Find earliest next payment
      let nextPaymentDate: string | null = null;
      let nextPaymentAmount: number | null = null;
      for (const sale of salesWithBalance) {
        if (sale.next_payment_date) {
          if (!nextPaymentDate || new Date(sale.next_payment_date) < new Date(nextPaymentDate)) {
            nextPaymentDate = sale.next_payment_date;
            nextPaymentAmount = sale.next_payment_amount;
          }
        }
      }

      setSummary({
        salesCount: salesRes.count || 0,
        paymentsCount,
        appointmentsCount: appointmentsRes.count || 0,
        labOrdersCount: labRes.count || 0,
        saldoPendiente: saldo,
        salesWithBalance: salesWithBalance.length,
        lastPaymentDate,
        lastPaymentAmount,
        nextPaymentDate,
        nextPaymentAmount,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching patient summary:', error);
      setSummary(s => ({ ...s, loading: false }));
    }
  };

  const hasDebt = summary.saldoPendiente > 0;

  const canArchive = (() => {
    if (archiving || summary.loading) return false;
    if (reason.trim().length < 5) return false;
    if (confirmText.toUpperCase() !== 'ARCHIVAR') return false;
    if (!acknowledgedArchive) return false;
    if (hasDebt && !acknowledgedDebt) return false;
    return true;
  })();

  const handleArchive = async () => {
    if (!patient || !canArchive) return;
    setArchiving(true);
    try {
      const { error } = await supabase.rpc('archive_patient', {
        p_patient_id: patient.id,
        p_reason: reason.trim(),
      });

      if (error) {
        toast({
          title: 'Error al archivar',
          description: error.message.includes('Administrador')
            ? 'Solo el Administrador puede archivar pacientes'
            : error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Paciente archivado',
        description: `${patient.first_name} ${patient.last_name} ha sido archivado. Sus registros financieros se conservan intactos.`,
      });
      onOpenChange(false);
      onDeleted();
    } catch (error) {
      console.error('Error archiving patient:', error);
      toast({ title: 'Error', description: 'No se pudo archivar el paciente', variant: 'destructive' });
    } finally {
      setArchiving(false);
    }
  };

  if (!patient) return null;

  const fmt = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const fmtDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            {hasDebt && !summary.loading ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Archive className="h-5 w-5" />
            )}
            Archivar paciente
          </DialogTitle>
          <DialogDescription className="sr-only">
            Confirmación para archivar paciente del sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* DEBT ALERT - only when has pending balance */}
          {!summary.loading && hasDebt && (
            <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4">
              <div className="flex gap-3">
                <ShieldAlert className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-destructive text-sm">
                    ATENCIÓN: Este paciente tiene saldo pendiente de {fmt(summary.saldoPendiente)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Archivarlo NO elimina la deuda ni los registros financieros.
                  </p>
                </div>
              </div>

              {/* Financial summary */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-md bg-background p-2 border">
                  <DollarSign className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                    <p className="font-semibold text-destructive">{fmt(summary.saldoPendiente)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-background p-2 border">
                  <ShoppingCart className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ventas con saldo</p>
                    <p className="font-semibold">{summary.salesWithBalance}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-background p-2 border">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Último pago</p>
                    <p className="font-semibold text-sm">
                      {summary.lastPaymentDate
                        ? `${fmtDate(summary.lastPaymentDate)} · ${fmt(summary.lastPaymentAmount || 0)}`
                        : 'Sin pagos'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-background p-2 border">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Próximo pago</p>
                    <p className="font-semibold text-sm">
                      {summary.nextPaymentDate ? fmtDate(summary.nextPaymentDate) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Standard info banner (no debt) */}
          {!summary.loading && !hasDebt && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-700">
                    El paciente será archivado, no eliminado.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Sus ventas, pagos, créditos y todo historial financiero se conservan intactos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Patient info */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <p className="font-semibold text-foreground">
              {patient.first_name} {patient.last_name}
            </p>
            {summary.loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando resumen...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas:</span>
                  <Badge variant="secondary">{summary.salesCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pagos:</span>
                  <Badge variant="secondary">{summary.paymentsCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Citas:</span>
                  <Badge variant="secondary">{summary.appointmentsCount}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Órdenes lab:</span>
                  <Badge variant="secondary">{summary.labOrdersCount}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="archive-reason" className="text-sm font-medium">
              Motivo de archivado <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="archive-reason"
              placeholder="Ej: Paciente ya no acude, se mudó de ciudad, duplicado..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
            {reason.length > 0 && reason.trim().length < 5 && (
              <p className="text-xs text-destructive">Mínimo 5 caracteres</p>
            )}
          </div>

          {/* Confirm text */}
          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="text-sm font-medium">
              Escribe <span className="font-mono font-bold text-amber-700">ARCHIVAR</span> para confirmar <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm-text"
              placeholder="ARCHIVAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={confirmText.toUpperCase() === 'ARCHIVAR' ? 'border-green-500' : ''}
            />
          </div>

          {/* Acknowledge archive */}
          <div className="flex items-start space-x-3">
            <Checkbox
              id="ack-archive"
              checked={acknowledgedArchive}
              onCheckedChange={(checked) => setAcknowledgedArchive(!!checked)}
            />
            <Label htmlFor="ack-archive" className="text-sm leading-snug cursor-pointer">
              Entiendo que el paciente será archivado y no podrá recibir nuevas ventas ni servicios hasta ser reactivado por un Administrador.
            </Label>
          </div>

          {/* Acknowledge debt - only when has debt */}
          {hasDebt && !summary.loading && (
            <div className="flex items-start space-x-3 rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <Checkbox
                id="ack-debt"
                checked={acknowledgedDebt}
                onCheckedChange={(checked) => setAcknowledgedDebt(!!checked)}
              />
              <Label htmlFor="ack-debt" className="text-sm leading-snug cursor-pointer text-destructive font-medium">
                Entiendo que la deuda de {fmt(summary.saldoPendiente)} NO se elimina al archivar este paciente.
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={archiving}>
            Cancelar
          </Button>
          <Button
            disabled={!canArchive}
            onClick={handleArchive}
            className={`gap-2 text-white ${hasDebt ? 'bg-destructive hover:bg-destructive/90' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {archiving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
            Archivar paciente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
