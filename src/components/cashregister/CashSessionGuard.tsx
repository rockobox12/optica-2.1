import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Lock, Loader2, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/hooks/useBranchContext';

interface CashSessionGuardProps {
  isOpen: boolean;
  loading: boolean;
  onOpenSession: (branchId: string, openingAmount: number) => Promise<any>;
}

export function CashSessionGuard({ isOpen, loading, onOpenSession }: CashSessionGuardProps) {
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { branches, branchFilter } = useBranch();

  // Use the SAME branch as useCashSession: branchFilter from context (header selector)
  const effectiveBranch = branchFilter || (branches.length > 0 ? branches[0].id : '');
  const branchName = branches.find(b => b.id === effectiveBranch)?.name || 'Sin sucursal';

  if (loading || isOpen) return null;

  const handleOpenRegister = async () => {
    if (!effectiveBranch) {
      toast({ title: 'Error', description: 'Seleccione una sucursal', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await onOpenSession(effectiveBranch, parseFloat(openingAmount) || 0);

      if (result) {
        toast({ title: 'Caja abierta', description: `Ya puedes realizar cobros en ${branchName}` });
        setShowOpenDialog(false);
      } else {
        toast({ title: 'Error', description: 'No se pudo abrir la caja', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Alert className="border-destructive/50 bg-destructive/5">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium text-destructive">
              No tienes caja abierta.
            </span>
            <span className="text-muted-foreground ml-1">
              Debes abrir caja para poder cobrar ({branchName}).
            </span>
          </div>
          <Button size="sm" onClick={() => setShowOpenDialog(true)} className="ml-4">
            <Unlock className="h-4 w-4 mr-1" />
            Abrir Caja
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Abrir Caja — {branchName}
            </DialogTitle>
            <DialogDescription>
              Ingresa el monto de efectivo inicial para iniciar tu turno. Puedes abrir con $0.00.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Monto Inicial de Efectivo</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">Puedes iniciar con $0.00</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>Cancelar</Button>
            <Button onClick={handleOpenRegister} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}