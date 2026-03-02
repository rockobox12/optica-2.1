import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { 
  Banknote, 
  CreditCard, 
  Wallet, 
  Loader2, 
  CheckCircle, 
  DollarSign,
  AlertTriangle,
  Search,
  X,
  RefreshCw
} from 'lucide-react';
import { PaymentThermalTicket } from './PaymentThermalTicket';

interface ReplacementPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalSaleId: string;
  originalPaymentId: string;
  suggestedAmount: number;
  suggestedMethod: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CreditSale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone?: string | null;
  total: number;
  amount_paid: number;
  balance: number;
  patient_id: string | null;
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

const paymentMethods = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: Wallet },
];

export function ReplacementPaymentModal({
  open,
  onOpenChange,
  originalSaleId,
  originalPaymentId,
  suggestedAmount,
  suggestedMethod,
  onSuccess,
  onCancel,
}: ReplacementPaymentModalProps) {
  const [step, setStep] = useState<'form' | 'ticket'>('form');
  const [selectedSaleId, setSelectedSaleId] = useState(originalSaleId);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(suggestedAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState(suggestedMethod);
  const [comment, setComment] = useState('Pago de reemplazo');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [nextPaymentAmount, setNextPaymentAmount] = useState('');
  const [nextPaymentError, setNextPaymentError] = useState('');
  const [paymentRecord, setPaymentRecord] = useState<any>(null);

  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch original sale
  const { data: currentSale, isLoading: isLoadingSale } = useQuery({
    queryKey: ['replacement-sale', selectedSaleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, sale_number, customer_name, customer_phone, total, amount_paid, balance, patient_id,
          patients(id, first_name, last_name, phone, whatsapp),
          branches(name)
        `)
        .eq('id', selectedSaleId)
        .single();

      if (error) throw error;
      return data as CreditSale;
    },
    enabled: !!selectedSaleId && open,
  });

  // Search for other credit sales (to change patient)
  const { data: searchResults } = useQuery({
    queryKey: ['replacement-search', patientSearch],
    queryFn: async () => {
      if (patientSearch.length < 2) return [];

      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, sale_number, customer_name, customer_phone, total, amount_paid, balance, patient_id,
          patients(id, first_name, last_name, phone, whatsapp),
          branches(name)
        `)
        .eq('is_credit', true)
        .gt('balance', 0)
        .or(`customer_name.ilike.%${patientSearch}%,sale_number.ilike.%${patientSearch}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as CreditSale[];
    },
    enabled: patientSearch.length >= 2 && showPatientSearch,
  });

  // Set default next payment date
  useEffect(() => {
    if (open && !nextPaymentDate) {
      const defaultDate = addDays(new Date(), 7);
      setNextPaymentDate(format(defaultDate, 'yyyy-MM-dd'));
    }
  }, [open]);

  // Validate next payment date
  useEffect(() => {
    if (nextPaymentDate) {
      const selectedDate = new Date(nextPaymentDate);
      const today = startOfDay(new Date());
      if (isBefore(selectedDate, today)) {
        setNextPaymentError('La fecha no puede ser en el pasado');
      } else {
        setNextPaymentError('');
      }
    }
  }, [nextPaymentDate]);

  const getPatientName = (sale: CreditSale) => {
    if (sale.patients) {
      return `${sale.patients.first_name} ${sale.patients.last_name}`;
    }
    return sale.customer_name || 'Cliente';
  };

  const registerPayment = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }
      if (currentSale && amount > currentSale.balance) {
        throw new Error('El monto no puede ser mayor al saldo pendiente');
      }

      // Get next payment number
      const { data: existingPayments } = await supabase
        .from('credit_payments')
        .select('payment_number')
        .eq('sale_id', selectedSaleId)
        .eq('is_voided', false)
        .order('payment_number', { ascending: false })
        .limit(1);

      const nextPaymentNumber = (existingPayments?.[0]?.payment_number || 0) + 1;

      // Register payment
      const { data: payment, error: paymentError } = await supabase
        .from('credit_payments')
        .insert([{
          sale_id: selectedSaleId,
          payment_number: nextPaymentNumber,
          amount,
          payment_method: paymentMethod as 'cash' | 'card' | 'transfer' | 'check' | 'credit',
          notes: comment || 'Pago de reemplazo',
          received_by: profile?.userId,
        }])
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update original voided payment with replaced_by reference
      await supabase
        .from('credit_payments')
        .update({ replaced_by_payment_id: payment.id })
        .eq('id', originalPaymentId);

      // Update sale balance
      const newBalance = (currentSale?.balance || 0) - amount;
      const newAmountPaid = (currentSale?.amount_paid || 0) + amount;

      const shouldSetNextPayment = newBalance > 0 && nextPaymentDate;

      const { error: saleError } = await supabase
        .from('sales')
        .update({
          balance: newBalance,
          amount_paid: newAmountPaid,
          status: newBalance <= 0 ? 'completed' : 'partial',
          next_payment_date: shouldSetNextPayment ? nextPaymentDate : null,
          next_payment_amount: shouldSetNextPayment && nextPaymentAmount ? parseFloat(nextPaymentAmount) : null,
        })
        .eq('id', selectedSaleId);

      if (saleError) throw saleError;

      // Log replacement completed
      await supabase.from('payment_audit_log').insert({
        event_type: 'PAYMENT_REPLACEMENT_COMPLETED',
        old_payment_id: originalPaymentId,
        new_payment_id: payment.id,
        sale_id: selectedSaleId,
        patient_id: currentSale?.patient_id,
        amount,
        performed_by: profile?.userId || '',
        metadata: {
          payment_method: paymentMethod,
          changed_patient: selectedSaleId !== originalSaleId,
        },
      });

      return {
        payment,
        amount,
        newBalance,
        newAmountPaid,
        method: paymentMethod,
        paymentNumber: nextPaymentNumber,
        paymentId: payment.id,
      };
    },
    onSuccess: (data) => {
      setPaymentRecord(data);
      setStep('ticket');
      queryClient.invalidateQueries({ queryKey: ['quick-payment-search'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] });
      toast({
        title: 'Pago de reemplazo registrado',
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

  const handleCancelReplacement = async () => {
    // Log cancellation
    await supabase.from('payment_audit_log').insert({
      event_type: 'PAYMENT_REPLACEMENT_CANCELLED',
      old_payment_id: originalPaymentId,
      performed_by: profile?.userId || '',
      metadata: { reason: 'User cancelled replacement' },
    });

    toast({
      title: 'Reemplazo cancelado',
      description: 'El pago anterior quedó ANULADO. No se registró un nuevo pago.',
      variant: 'destructive',
    });

    onCancel();
  };

  const handleSelectSale = (sale: CreditSale) => {
    setSelectedSaleId(sale.id);
    setShowPatientSearch(false);
    setPatientSearch('');
  };

  const handleClose = () => {
    setStep('form');
    onSuccess();
  };

  const remainingAfterPayment = () => {
    const amount = parseFloat(paymentAmount) || 0;
    return Math.max(0, (currentSale?.balance || 0) - amount);
  };

  if (isLoadingSale) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={step === 'form' ? undefined : onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-600" />
            Pago de Reemplazo
          </DialogTitle>
        </DialogHeader>

        {step === 'form' ? (
          <div className="space-y-6">
            {/* Alert Banner */}
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Estás registrando un pago de reemplazo. El pago anterior fue anulado.
                </span>
              </div>
            </div>

            {/* Patient/Sale Selection */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Paciente y venta</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPatientSearch(!showPatientSearch)}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Cambiar paciente
                  </Button>
                </div>

                {showPatientSearch && (
                  <div className="space-y-2">
                    <Input
                      placeholder="Buscar paciente o folio..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      autoFocus
                    />
                    {searchResults && searchResults.length > 0 && (
                      <div className="border rounded-lg max-h-40 overflow-y-auto">
                        {searchResults.map((sale) => (
                          <button
                            key={sale.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between"
                            onClick={() => handleSelectSale(sale)}
                          >
                            <div>
                              <p className="font-medium">{getPatientName(sale)}</p>
                              <p className="text-xs text-muted-foreground">{sale.sale_number}</p>
                            </div>
                            <span className="text-sm font-medium text-orange-600">
                              ${sale.balance.toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentSale && (
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div>
                      <p className="font-medium">{getPatientName(currentSale)}</p>
                      <p className="text-sm text-muted-foreground">
                        Folio: {currentSale.sale_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Saldo</p>
                      <p className="font-bold text-lg text-orange-600">
                        ${currentSale.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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
                      min="0.01"
                      step="0.01"
                      max={currentSale?.balance}
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="pl-10 h-11 text-lg"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPaymentAmount(currentSale?.balance.toFixed(2) || '0')}
                  >
                    Pago Total
                  </Button>
                </div>
                {paymentAmount && parseFloat(paymentAmount) > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Saldo después del pago: 
                    <span className="font-medium text-foreground ml-1">
                      ${remainingAfterPayment().toFixed(2)}
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
                      className="h-12 flex-col gap-1"
                      onClick={() => setPaymentMethod(method.value)}
                    >
                      <method.icon className="h-4 w-4" />
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label>Comentario</Label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>

            {/* Next Payment Scheduling */}
            {remainingAfterPayment() > 0 && (
              <>
                <Separator />
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
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelReplacement}
                className="flex-1 text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Reemplazo
              </Button>
              <Button
                type="button"
                onClick={() => registerPayment.mutate()}
                disabled={
                  registerPayment.isPending || 
                  !paymentAmount || 
                  parseFloat(paymentAmount) <= 0 ||
                  (currentSale && parseFloat(paymentAmount) > currentSale.balance) ||
                  !!nextPaymentError
                }
                className="flex-1"
              >
                {registerPayment.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          currentSale && paymentRecord && (
            <PaymentThermalTicket
              sale={currentSale}
              payment={paymentRecord}
              collector={profile?.fullName || 'Usuario'}
              nextPaymentDate={nextPaymentDate}
              onClose={handleClose}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
