import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Banknote, CreditCard, Building, FileText, Wallet, Trash2, Loader2, CalendarIcon, ShieldCheck, AlertCircle } from 'lucide-react';
import type { PaymentInfo } from '@/hooks/useOfflineSync';
import { format, addDays, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface DownPaymentConfig {
  minPercent: number;
  minAmount: number | null;
  adminExceptionEnabled: boolean;
}

interface PaymentPanelProps {
  total: number;
  payments: PaymentInfo[];
  balance: number;
  isCredit: boolean;
  creditDueDate: string | null;
  onAddPayment: (payment: PaymentInfo) => void;
  onRemovePayment: (index: number) => void;
  onSetCredit: (isCredit: boolean) => void;
  onSetCreditDueDate: (date: string | null) => void;
  onFinalize: () => void;
  isLoading: boolean;
  cartItemCount: number;
  downPaymentConfig?: DownPaymentConfig;
  isAdmin?: boolean;
  onDownPaymentException?: (reason: string) => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Efectivo', icon: Banknote, color: 'text-green-600' },
  { value: 'card', label: 'Tarjeta', icon: CreditCard, color: 'text-blue-600' },
  { value: 'transfer', label: 'Transferencia', icon: Building, color: 'text-purple-600' },
  { value: 'check', label: 'Cheque', icon: FileText, color: 'text-orange-600' },
] as const;

export function PaymentPanel({
  total,
  payments,
  balance,
  isCredit,
  creditDueDate,
  onAddPayment,
  onRemovePayment,
  onSetCredit,
  onSetCreditDueDate,
  onFinalize,
  isLoading,
  cartItemCount,
  downPaymentConfig,
  isAdmin = false,
  onDownPaymentException,
}: PaymentPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState<typeof paymentMethods[number]['value']>('cash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionGranted, setExceptionGranted] = useState(false);

  const handleAddPayment = () => {
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) return;

    onAddPayment({
      method: selectedMethod,
      amount: paymentAmount,
      reference: reference || undefined,
    });

    setAmount('');
    setReference('');
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  const handleGrantException = () => {
    if (!exceptionReason.trim()) return;
    setExceptionGranted(true);
    setShowExceptionForm(false);
    onDownPaymentException?.(exceptionReason.trim());
  };

  const needsReference = selectedMethod !== 'cash';
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  // Cart validation
  const cartEmpty = cartItemCount === 0;
  const integrityError = cartEmpty && total > 0;

  // Down payment (enganche) validation
  let engancheMinimo = 0;
  let engancheBlocked = false;
  if (isCredit && downPaymentConfig && total > 0) {
    const byPercent = total * (downPaymentConfig.minPercent / 100);
    const byAmount = downPaymentConfig.minAmount ?? 0;
    engancheMinimo = Math.max(byPercent, byAmount);
    engancheBlocked = totalPaid < engancheMinimo && !exceptionGranted;
  }

  // Finalization rules
  const canFinalize = !cartEmpty && !engancheBlocked && (isCredit || balance <= 0.01);
  const finalizeDisabledReason = (() => {
    if (isLoading) return null;
    if (cartEmpty) {
      return integrityError
        ? 'Error: Total no coincide con productos registrados.'
        : 'Agrega al menos un producto o servicio antes de cobrar.';
    }
    if (engancheBlocked) {
      return `Enganche mínimo requerido: $${engancheMinimo.toFixed(2)}. Pagado hoy: $${totalPaid.toFixed(2)}.`;
    }
    if (!isCredit && balance > 0.01) {
      return 'Para finalizar, el restante debe quedar en $0.00 o activa Venta a Crédito';
    }
    return null;
  })();

  return (
    <div className="space-y-4">
      {/* Payment Summary */}
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total a Cobrar</span>
          <span className="font-bold text-lg">${total.toFixed(2)}</span>
        </div>
        {totalPaid > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Pagado</span>
            <span className="font-medium">${totalPaid.toFixed(2)}</span>
          </div>
        )}
        {isCredit && engancheMinimo > 0 && (
          <div className={`flex justify-between ${totalPaid >= engancheMinimo ? 'text-green-600' : 'text-orange-600'}`}>
            <span>Enganche mínimo</span>
            <span className="font-medium">${engancheMinimo.toFixed(2)}</span>
          </div>
        )}
        {balance > 0 && !isCredit && (
          <div className="flex justify-between text-orange-600">
            <span>Restante</span>
            <span className="font-bold">${balance.toFixed(2)}</span>
          </div>
        )}
        {totalPaid > total && (
          <div className="flex justify-between text-blue-600">
            <span>Cambio</span>
            <span className="font-bold">${(totalPaid - total).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Credit Toggle */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Venta a Crédito</span>
        </div>
        <Switch checked={isCredit} onCheckedChange={(v) => {
          onSetCredit(v);
          // Reset exception if toggling credit off
          if (!v) {
            setExceptionGranted(false);
            setShowExceptionForm(false);
            setExceptionReason('');
          }
        }} />
      </div>

      {isCredit && (
        <div className="p-3 border rounded-lg bg-orange-50 space-y-2">
          <Label className="text-sm font-medium">Fecha de Vencimiento</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !creditDueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {creditDueDate
                  ? format(parse(creditDueDate, 'yyyy-MM-dd', new Date()), "dd/MM/yyyy")
                  : <span>Seleccionar fecha</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={creditDueDate ? parse(creditDueDate, 'yyyy-MM-dd', new Date()) : undefined}
                onSelect={(date) => {
                  if (date) {
                    onSetCreditDueDate(format(date, 'yyyy-MM-dd'));
                  }
                }}
                disabled={(date) => date < new Date()}
                initialFocus
                locale={es}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <div className="flex gap-2">
            {[7, 15, 30].map((days) => (
              <Button
                key={days}
                variant="outline"
                size="sm"
                onClick={() => onSetCreditDueDate(format(addDays(new Date(), days), 'yyyy-MM-dd'))}
              >
                {days} días
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods - show for both credit (enganche) and non-credit */}
      <>
        <div className="grid grid-cols-4 gap-2">
          {paymentMethods.map((method) => (
            <Button
              key={method.value}
              variant={selectedMethod === method.value ? 'default' : 'outline'}
              className="flex-col h-auto py-3"
              onClick={() => setSelectedMethod(method.value)}
            >
              <method.icon className={`h-5 w-5 ${selectedMethod === method.value ? '' : method.color}`} />
              <span className="text-xs mt-1">{method.label}</span>
            </Button>
          ))}
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label>{isCredit ? 'Monto de Enganche' : 'Monto'}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="text-lg"
          />
          <div className="flex gap-2 flex-wrap">
            {[50, 100, 200, 500, 1000].map((value) => (
              <Button
                key={value}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(value)}
              >
                ${value}
              </Button>
            ))}
            {isCredit && engancheMinimo > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(engancheMinimo)}
              >
                Enganche
              </Button>
            )}
            {!isCredit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(balance > 0 ? balance : total)}
              >
                Exacto
              </Button>
            )}
          </div>
        </div>

        {/* Reference */}
        {needsReference && (
          <div>
            <Label>Referencia / Número de Autorización</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ingrese referencia..."
            />
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleAddPayment}
          disabled={!amount || parseFloat(amount) <= 0 || cartEmpty}
        >
          Agregar Pago
        </Button>

        <Separator />

        {/* Payment List */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <Label>Pagos Registrados</Label>
            {payments.map((payment, index) => {
              const method = paymentMethods.find(m => m.value === payment.method);
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    {method && <method.icon className={`h-4 w-4 ${method.color}`} />}
                    <span className="text-sm">{method?.label}</span>
                    {payment.reference && (
                      <span className="text-xs text-muted-foreground">({payment.reference})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">${payment.amount.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemovePayment(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>

      {/* Down payment exception for admin */}
      {isCredit && engancheBlocked && isAdmin && downPaymentConfig?.adminExceptionEnabled && !exceptionGranted && (
        <div className="space-y-2">
          {!showExceptionForm ? (
            <Button
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => setShowExceptionForm(true)}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Autorizar sin enganche mínimo
            </Button>
          ) : (
            <Alert className="border-orange-300 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="space-y-2">
                <p className="text-sm font-medium text-orange-800">Autorización de excepción de enganche</p>
                <Textarea
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  placeholder="Motivo obligatorio de la excepción..."
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleGrantException}
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
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {exceptionGranted && isCredit && (
        <Alert className="border-green-300 bg-green-50">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-sm text-green-800">
            Excepción de enganche autorizada por Administrador
          </AlertDescription>
        </Alert>
      )}

      {/* Validation message */}
      {finalizeDisabledReason && (
        <p className="text-sm text-orange-600 text-center bg-orange-50 rounded-md p-2">
          {finalizeDisabledReason}
        </p>
      )}

      {/* Finalize Button */}
      <Button
        type="button"
        className="w-full"
        size="lg"
        onClick={onFinalize}
        disabled={!canFinalize || isLoading}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? 'Finalizando…' : isCredit ? 'Registrar Venta a Crédito' : 'Finalizar Venta'}
      </Button>
    </div>
  );
}
