import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRightLeft, AlertTriangle, Loader2 } from 'lucide-react';

interface PatientTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentBranchId: string | null;
  pendingBalance?: number;
  onTransferred: () => void;
}

interface Branch {
  id: string;
  name: string;
}

export function PatientTransferModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentBranchId,
  pendingBalance = 0,
  onTransferred,
}: PatientTransferModalProps) {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [keepCreditOwner, setKeepCreditOwner] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBranches();
      setToBranchId('');
      setReason('');
      setNotes('');
      setKeepCreditOwner(true);
      setConfirmText('');
    }
  }, [open]);

  const fetchBranches = async () => {
    const { data } = await supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setBranches((data || []).filter((b) => b.id !== currentBranchId));
  };

  const canSubmit =
    toBranchId && reason.trim().length >= 3 && confirmText === 'TRANSFERIR' && !loading;

  const handleTransfer = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('transfer_patient', {
        p_patient_id: patientId,
        p_to_branch_id: toBranchId,
        p_reason: reason.trim(),
        p_notes: notes.trim() || null,
        p_keep_credit_owner: keepCreditOwner,
      });

      if (error) throw error;

      const result = data as any;
      toast({
        title: 'Paciente transferido',
        description: `${patientName} fue transferido exitosamente`,
      });
      onOpenChange(false);
      onTransferred();
    } catch (err: any) {
      toast({
        title: 'Error al transferir',
        description: err.message || 'No se pudo completar la transferencia',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Transferir paciente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p>
                Transferir a <strong>{patientName}</strong> a otra sucursal.
              </p>

              {/* Pending balance warning */}
              {pendingBalance > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                  <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-warning">Saldo pendiente: ${pendingBalance.toFixed(2)}</p>
                    <p className="text-muted-foreground mt-1">
                      La cobranza seguirá ligada a la venta original en su sucursal de origen.
                    </p>
                  </div>
                </div>
              )}

              {/* Branch selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nueva sucursal *</label>
                <Select value={toBranchId} onValueChange={setToBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Motivo *</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Paciente se mudó de zona"
                  rows={2}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notas (opcional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                />
              </div>

              {/* Keep credit owner checkbox */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="keep-credit"
                  checked={keepCreditOwner}
                  onCheckedChange={(v) => setKeepCreditOwner(!!v)}
                  className="mt-1"
                />
                <label htmlFor="keep-credit" className="text-sm cursor-pointer">
                  <span className="font-medium">Mantener historial financiero en sucursal original</span>
                  <span className="text-muted-foreground block text-xs mt-0.5">(recomendado)</span>
                </label>
              </div>

              {/* Confirmation */}
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Escribe <Badge variant="outline" className="font-mono mx-1">TRANSFERIR</Badge> para confirmar:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="TRANSFERIR"
                  className="font-mono"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button onClick={handleTransfer} disabled={!canSubmit} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Confirmar transferencia
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
