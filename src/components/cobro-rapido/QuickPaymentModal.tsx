import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, isPast, isToday, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Banknote, 
  CreditCard, 
  Wallet, 
  Loader2, 
  CheckCircle, 
  Calendar,
  Receipt,
  User,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { PaymentThermalTicket } from './PaymentThermalTicket';
import { VoidPaymentDialog } from './VoidPaymentDialog';
import { ReplacementPaymentModal } from './ReplacementPaymentModal';
import { useCashSession } from '@/hooks/useCashSession';
import { CashSessionGuard } from '@/components/cashregister/CashSessionGuard';
import { useBranch } from '@/hooks/useBranchContext';
import { ArrowRightLeft } from 'lucide-react';

interface CreditSale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  amount_paid: number;
  balance: number;
  credit_due_date: string | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  created_at: string;
  patient_id: string | null;
  branch_id?: string | null;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
  branches?: {
    name: string;
  } | null;
}

interface QuickPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: CreditSale;
  onSuccess: () => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: Wallet },
];

export function QuickPaymentModal({ open, onOpenChange, sale, onSuccess }: QuickPaymentModalProps) {
  const [step, setStep] = useState<'form' | 'ticket'>('form');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [comment, setComment] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [nextPaymentAmount, setNextPaymentAmount] = useState('');
  const [nextPaymentNote, setNextPaymentNote] = useState('');
  const [skipScheduling, setSkipScheduling] = useState(false);
  const [nextPaymentError, setNextPaymentError] = useState('');
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  
  // Replacement flow states
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [replacementData, setReplacementData] = useState<{
    saleId: string;
    voidedAmount: number;
    paymentId: string;
    method: string;
  } | null>(null);

  const { toast } = useToast();
  const { profile, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const cashSession = useCashSession();
  const { branchFilter, activeBranch, activeBranchId } = useBranch();

  const isCrossBranch = activeBranchId !== 'all' && !!sale.branch_id && !!branchFilter && sale.branch_id !== branchFilter;

  const paymentIsDirty = !!paymentAmount || !!comment;

  const doClose = () => onOpenChange(false);

  const { confirmClose, UnsavedDialog } = useUnsavedChanges({
    isDirty: paymentIsDirty && step === 'form',
    enabled: open,
  });

  // Set default next payment date to +7 days when modal opens
  useEffect(() => {
    if (open && !nextPaymentDate) {
      const defaultDate = addDays(new Date(), 7);
      setNextPaymentDate(format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [open]);

  // Validate next payment date
  useEffect(() => {
    if (nextPaymentDate && !skipScheduling) {
      const selectedDate = new Date(nextPaymentDate);
      const today = startOfDay(new Date());
      if (isBefore(selectedDate, today)) {
        setNextPaymentError('La fecha no puede ser en el pasado');
      } else {
        setNextPaymentError('');
      }
    } else {
      setNextPaymentError('');
    }
  }, [nextPaymentDate, skipScheduling]);

  const getPatientName = () => {
    if (sale.patients) {
      return `${sale.patients.first_name} ${sale.patients.last_name}`;
    }
    return sale.customer_name || 'Cliente';
  };

  const isOverdue = () => {
    const dueDate = sale.next_payment_date || sale.credit_due_date;
    return dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate));
  };

  const registerPayment = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }
      if (amount > sale.balance) {
        throw new Error('El monto no puede ser mayor al saldo pendiente');
      }

      // Get next payment number
      const { data: existingPayments } = await supabase
        .from('credit_payments')
        .select('payment_number')
        .eq('sale_id', sale.id)
        .order('payment_number', { ascending: false })
        .limit(1);

      const nextPaymentNumber = (existingPayments?.[0]?.payment_number || 0) + 1;

      // Register payment with cross-branch fields
      const paymentInsert: any = {
        sale_id: sale.id,
        payment_number: nextPaymentNumber,
        amount,
        payment_method: paymentMethod as 'cash' | 'card' | 'transfer' | 'check' | 'credit',
        notes: comment || null,
        received_by: profile?.userId,
        branch_id: branchFilter || null,
        sale_branch_id: sale.branch_id || null,
        is_cross_branch: isCrossBranch,
      };

      const { data: payment, error: paymentError } = await supabase
        .from('credit_payments')
        .insert([paymentInsert])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update sale balance and next payment info
      const newBalance = sale.balance - amount;
      const newAmountPaid = sale.amount_paid + amount;

      // Determine next payment date - only set if balance remains and not skipped
      const shouldSetNextPayment = newBalance > 0 && !skipScheduling && nextPaymentDate;

      const updateData: any = {
        balance: newBalance,
        amount_paid: newAmountPaid,
        status: newBalance <= 0 ? 'completed' : 'partial',
        next_payment_date: shouldSetNextPayment ? nextPaymentDate : null,
        next_payment_amount: shouldSetNextPayment && nextPaymentAmount ? parseFloat(nextPaymentAmount) : null,
        next_payment_note: shouldSetNextPayment ? nextPaymentNote || null : null,
      };

      const { error: saleError } = await supabase
        .from('sales')
        .update(updateData)
        .eq('id', sale.id);

      if (saleError) throw saleError;

      // Auto-register cash movement
      if (cashSession.isOpen) {
        await cashSession.registerCreditPaymentMovement(
          sale.id,
          payment.id,
          amount,
          paymentMethod,
          sale.sale_number,
        );
      }

      return {
        payment,
        amount,
        newBalance,
        newAmountPaid,
        method: paymentMethod,
        paymentNumber: nextPaymentNumber,
        paymentId: payment.id,
        isCrossBranch,
        saleBranchName: sale.branches?.name || '',
        paymentBranchName: activeBranch?.name || '',
      };
    },
    onSuccess: (data) => {
      setPaymentRecord(data);
      setStep('ticket');
      queryClient.invalidateQueries({ queryKey: ['quick-payment-search'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-credit-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-scheduled-payments'] });
      toast({
        title: 'Pago registrado',
        description: `Se registró un abono de $${data.amount.toFixed(2)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al registrar pago',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handlePayTotal = () => {
    setPaymentAmount(sale.balance.toFixed(2));
  };

  const handleSubmit = () => {
    registerPayment.mutate();
  };

  const resetForm = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setComment('');
    setNextPaymentDate('');
    setNextPaymentAmount('');
    setNextPaymentNote('');
    setSkipScheduling(false);
    setNextPaymentError('');
    setPaymentRecord(null);
  };

  const handleClose = () => {
    setStep('form');
    resetForm();
    onSuccess();
  };

  const handleStartReplace = () => {
    // Open void dialog to collect reason
    setShowVoidDialog(true);
  };

  const handleVoided = (result: { saleId: string; voidedAmount: number }) => {
    // Store data needed for replacement and open replacement modal
    setReplacementData({
      saleId: result.saleId,
      voidedAmount: result.voidedAmount,
      paymentId: paymentRecord?.paymentId || '',
      method: paymentRecord?.method || 'cash',
    });
    setShowVoidDialog(false);
    setShowReplacementModal(true);
  };

  const handleReplacementSuccess = () => {
    setShowReplacementModal(false);
    setReplacementData(null);
    setStep('form');
    resetForm();
    queryClient.invalidateQueries({ queryKey: ['quick-payment-search'] });
    queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-credit-stats'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-scheduled-payments'] });
    onSuccess();
  };

  const handleReplacementCancel = () => {
    setShowReplacementModal(false);
    setReplacementData(null);
    setStep('form');
    resetForm();
    queryClient.invalidateQueries({ queryKey: ['quick-payment-search'] });
    onSuccess();
  };

  const remainingAfterPayment = () => {
    const amount = parseFloat(paymentAmount) || 0;
    return Math.max(0, sale.balance - amount);
  };

  return (
    <>
    <UnsavedDialog />
    <Dialog open={open} onOpenChange={step === 'form' ? (v) => { if (!v) confirmClose(doClose); } : undefined}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto" preventClose={step === 'form'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'form' ? (
              <>
                <Banknote className="h-5 w-5 text-primary" />
                Registrar Cobro
              </>
            ) : (
              <>
                <Receipt className="h-5 w-5 text-primary" />
                Comprobante de Pago
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-6">
            {/* Cash Session Guard */}
            <CashSessionGuard
              isOpen={cashSession.isOpen}
              loading={cashSession.loading}
              onOpenSession={cashSession.openSession}
            />

            {/* Patient & Sale Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Paciente</p>
                      <p className="font-medium">{getPatientName()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Folio</p>
                      <p className="font-mono font-medium">{sale.sale_number}</p>
                    </div>
                  </div>
                </div>
                
                {isOverdue() && (
                  <div className="mt-3 flex items-center gap-2 text-destructive bg-destructive/10 p-2 rounded-lg">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Pago atrasado</span>
                  </div>
                )}

                {isCrossBranch && (
                  <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Pago cruzado:</strong> esta venta es de <Badge variant="outline" className="mx-1">{sale.branches?.name}</Badge> 
                      pero estás cobrando en <Badge variant="outline" className="mx-1">{activeBranch?.name}</Badge>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                <p className="text-[11px] sm:text-sm text-muted-foreground">Total</p>
                <p className="text-base sm:text-xl font-bold text-blue-600">
                  ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                <p className="text-[11px] sm:text-sm text-muted-foreground">Abonado</p>
                <p className="text-base sm:text-xl font-bold text-green-600">
                  ${Number(sale.amount_paid).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 sm:p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-center">
                <p className="text-[11px] sm:text-sm text-muted-foreground">Saldo</p>
                <p className="text-base sm:text-xl font-bold text-orange-600">
                  ${Number(sale.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <Separator />

            {/* Payment Form */}
            <div className="space-y-4">
              <div>
                <Label>Monto a Pagar (MXN)</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      max={sale.balance}
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-10 h-12 text-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handlePayTotal}
                  >
                    Pago Total
                  </Button>
                </div>
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Saldo después del pago: 
                    <span className="font-medium text-foreground ml-1">
                      ${remainingAfterPayment().toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <Label>Método de Pago</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.value}
                      type="button"
                      variant={paymentMethod === method.value ? 'default' : 'outline'}
                      className="h-14 sm:h-12 flex-col gap-1 touch-manipulation"
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <method.icon className="h-5 w-5 sm:h-4 sm:w-4" />
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Comentario (opcional)</Label>
                <Textarea
                  placeholder="Notas adicionales sobre el pago..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Next Payment Scheduling */}
            {remainingAfterPayment() > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <Label className="text-base font-medium">Programar Próximo Pago</Label>
                  </div>
                  {isAdmin() && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="skipScheduling"
                        checked={skipScheduling}
                        onCheckedChange={(checked) => setSkipScheduling(checked === true)}
                      />
                      <Label htmlFor="skipScheduling" className="text-sm text-muted-foreground cursor-pointer">
                        Sin programar
                      </Label>
                    </div>
                  )}
                </div>
                
                {!skipScheduling && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Fecha del próximo pago</Label>
                        <MaskedDateInput
                          value={nextPaymentDate}
                          onChange={setNextPaymentDate}
                          placeholder="dd/MM/aaaa"
                          error={nextPaymentError}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Por defecto: 7 días desde hoy
                        </p>
                      </div>
                      <div>
                        <Label>Monto sugerido (opcional)</Label>
                        <div className="relative mt-1">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={nextPaymentAmount}
                            onChange={(e) => setNextPaymentAmount(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Nota del próximo pago (opcional)</Label>
                      <Input
                        placeholder="Ej: Pago quincenal acordado"
                        value={nextPaymentNote}
                        onChange={(e) => setNextPaymentNote(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={
                  registerPayment.isPending || 
                  !paymentAmount || 
                  parseFloat(paymentAmount) <= 0 ||
                  parseFloat(paymentAmount) > sale.balance ||
                  (!!nextPaymentError && !skipScheduling && remainingAfterPayment() > 0) ||
                  !cashSession.isOpen
                }
              >
                {registerPayment.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Cobro
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <PaymentThermalTicket
            sale={sale}
            payment={paymentRecord}
            collector={profile?.fullName || 'Usuario'}
            nextPaymentDate={nextPaymentDate}
            onClose={handleClose}
            onReplace={handleStartReplace}
          />
        )}

        {/* Void Payment Dialog */}
        {paymentRecord && (
          <VoidPaymentDialog
            open={showVoidDialog}
            onOpenChange={setShowVoidDialog}
            paymentId={paymentRecord.paymentId}
            paymentAmount={paymentRecord.amount}
            saleNumber={sale.sale_number}
            onVoided={handleVoided}
          />
        )}

        {/* Replacement Payment Modal */}
        {replacementData && (
          <ReplacementPaymentModal
            open={showReplacementModal}
            onOpenChange={setShowReplacementModal}
            originalSaleId={replacementData.saleId}
            originalPaymentId={replacementData.paymentId}
            suggestedAmount={replacementData.voidedAmount}
            suggestedMethod={replacementData.method}
            onSuccess={handleReplacementSuccess}
            onCancel={handleReplacementCancel}
          />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
