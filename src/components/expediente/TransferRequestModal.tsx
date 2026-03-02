import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRightLeft, AlertTriangle, Loader2, Send } from 'lucide-react';

interface TransferRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  currentBranchId: string | null;
  pendingBalance?: number;
  onRequested: () => void;
}

interface Branch {
  id: string;
  name: string;
}

export function TransferRequestModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  currentBranchId,
  pendingBalance = 0,
  onRequested,
}: TransferRequestModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [toBranchId, setToBranchId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBranches();
      setToBranchId('');
      setReason('');
      setNotes('');
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

  const canSubmit = toBranchId && reason.trim().length >= 3 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit || !user?.id || !currentBranchId) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('patient_transfer_requests')
        .insert({
          patient_id: patientId,
          from_branch_id: currentBranchId,
          to_branch_id: toBranchId,
          reason: reason.trim(),
          notes: notes.trim() || null,
          requested_by: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Solicitud enviada',
        description: 'El administrador revisará tu solicitud de transferencia.',
      });
      onOpenChange(false);
      onRequested();
    } catch (err: any) {
      toast({
        title: 'Error al enviar solicitud',
        description: err.message || 'No se pudo enviar la solicitud',
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
            Solicitar transferencia
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p>
                Solicitar transferencia de <strong>{patientName}</strong> a otra sucursal.
                Un administrador deberá aprobar la solicitud.
              </p>

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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nueva sucursal *</label>
                <Select value={toBranchId} onValueChange={setToBranchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sucursal destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Motivo *</label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej: Paciente se mudó de zona"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notas (opcional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar solicitud
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
