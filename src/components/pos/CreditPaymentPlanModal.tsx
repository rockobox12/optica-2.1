import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { calculatePaymentPlan, validatePlanIntegrity } from '@/lib/payment-plan-calculator';

interface CreditPaymentPlanModalProps {
  open: boolean;
  saleId: string;
  patientId: string | null;
  patientName: string;
  saleTotal: number;
  amountPaid: number;
  onPlanCreated: (plan: CreatedPlan) => void;
  /** Called when user wants to close/cancel without creating a plan */
  onCancel?: () => void;
}

export interface CreatedPlan {
  id: string;
  planType: string;
  downPayment: number;
  totalFinanced: number;
  installments: number;
  installmentAmount: number;
  frequency: string;
  firstPaymentDate: string;
}

type PlanFrequency = 'weekly' | 'biweekly' | 'monthly';

const frequencyLabels: Record<PlanFrequency, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
};

function getNextDate(startDate: Date, frequency: PlanFrequency, index: number): Date {
  switch (frequency) {
    case 'weekly': return addWeeks(startDate, index);
    case 'biweekly': return addDays(startDate, index * 14);
    case 'monthly': return addMonths(startDate, index);
  }
}

export function CreditPaymentPlanModal({
  open,
  saleId,
  patientId,
  patientName,
  saleTotal,
  amountPaid,
  onPlanCreated,
  onCancel,
}: CreditPaymentPlanModalProps) {
  const [frequency, setFrequency] = useState<PlanFrequency>('weekly');
  const [installments, setInstallments] = useState('4');
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    format(addWeeks(new Date(), 1), 'yyyy-MM-dd')
  );
  const [isCreating, setIsCreating] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const numInstallments = Math.max(1, parseInt(installments) || 1);

  // Use shared calculator — single source of truth
  const planCalc = useMemo(() => calculatePaymentPlan({
    saleTotal,
    downPayment: amountPaid,
    numberOfInstallments: numInstallments,
  }), [saleTotal, amountPaid, numInstallments]);

  const balance = planCalc.financedAmount;
  const installmentAmount = planCalc.installmentAmount;

  // Generate preview calendar using the exact calculated amounts
  // Deps include primitive values to guarantee re-render on any change
  const calendar = useMemo(() => {
    if (!firstPaymentDate) return [];
    const startDate = new Date(firstPaymentDate + 'T12:00:00');
    return planCalc.installments.map((amt, i) => ({
      number: i + 1,
      date: getNextDate(startDate, frequency, i),
      amount: amt,
      status: 'pendiente' as const,
    }));
  }, [firstPaymentDate, frequency, planCalc.financedAmount, planCalc.installmentAmount, numInstallments]);

  const handleCreate = async () => {
    if (!patientId) {
      toast({ title: 'Error', description: 'Se requiere un paciente para crear el plan.', variant: 'destructive' });
      return;
    }
    if (!firstPaymentDate) {
      toast({ title: 'Error', description: 'Selecciona la fecha del primer pago.', variant: 'destructive' });
      return;
    }

    // Validate plan integrity before saving
    if (!validatePlanIntegrity(planCalc.installments, planCalc.financedAmount)) {
      toast({ title: 'Error de cálculo', description: 'La suma de cuotas no coincide con el saldo financiado. Ajusta los parámetros.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      // IMPORTANT: Pass saleTotal as p_total_amount — the RPC subtracts p_down_payment internally.
      // Previously we passed `balance` (already subtracted), causing double subtraction.
      const { data, error } = await supabase.rpc('create_payment_plan', {
        p_sale_id: saleId,
        p_patient_id: patientId,
        p_plan_type: frequency,
        p_total_amount: saleTotal,
        p_down_payment: amountPaid,
        p_number_of_installments: numInstallments,
        p_interest_rate: 0,
        p_created_by: profile?.userId || undefined,
        p_start_date: firstPaymentDate,
      });

      if (error) throw error;

      toast({
        title: 'Plan de pago creado',
        description: `${numInstallments} cuotas de $${installmentAmount.toFixed(2)} (${frequencyLabels[frequency]})`,
      });

      onPlanCreated({
        id: data as string,
        planType: frequency,
        downPayment: amountPaid,
        totalFinanced: balance,
        installments: numInstallments,
        installmentAmount,
        frequency: frequencyLabels[frequency],
        firstPaymentDate,
      });
    } catch (err: any) {
      toast({ title: 'Error al crear plan', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && onCancel) onCancel(); }}>
      <DialogContent className="max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Plan de Pago Obligatorio
          </DialogTitle>
          <DialogDescription>
            Debes definir el plan de pago antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <Alert className="border-orange-300 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-sm text-orange-800">
            Tienes que definir el plan de pago antes de continuar.
          </AlertDescription>
        </Alert>

        {/* Sale summary */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-muted rounded-lg text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Total Venta</p>
            <p className="font-bold">${saleTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Enganche</p>
            <p className="font-bold text-green-600">${amountPaid.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">A Financiar</p>
            <p className="font-bold text-orange-600">${balance.toFixed(2)}</p>
          </div>
        </div>

        <div className="text-sm font-medium">{patientName}</div>

        {/* Plan configuration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Frecuencia *</Label>
            <Select value={frequency} onValueChange={(v: PlanFrequency) => setFrequency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="biweekly">Quincenal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Número de Pagos *</Label>
            <Input
              type="number"
              min="1"
              max="52"
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 relative">
          <Label className="text-xs">Fecha Primer Pago *</Label>
          <Button
            variant="outline"
            type="button"
            onClick={() => setCalendarOpen(!calendarOpen)}
            className={cn(
              "w-full justify-start text-left font-normal",
              !firstPaymentDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {firstPaymentDate
              ? format(new Date(firstPaymentDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })
              : 'Seleccionar fecha'}
          </Button>
          {calendarOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-50 rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
                <Calendar
                  mode="single"
                  selected={firstPaymentDate ? new Date(firstPaymentDate + 'T12:00:00') : undefined}
                  onSelect={(date) => {
                    if (date) {
                      setFirstPaymentDate(format(date, 'yyyy-MM-dd'));
                      setCalendarOpen(false);
                    }
                  }}
                  locale={es}
                  className={cn("p-3 pointer-events-auto")}
                />
              </div>
            </>
          )}
          <div className="flex gap-2">
            {[7, 14, 30].map((days) => (
              <Button
                key={days}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setFirstPaymentDate(format(addDays(new Date(), days), 'yyyy-MM-dd'))}
              >
                {days} días
              </Button>
            ))}
          </div>
        </div>

        <div className="text-sm font-medium flex justify-between">
          <span>Monto por cuota:</span>
          <span className="text-primary font-bold">
            ${installmentAmount.toFixed(2)}
            {planCalc.lastInstallmentAmount !== installmentAmount && (
              <span className="text-xs text-muted-foreground ml-1">
                (última: ${planCalc.lastInstallmentAmount.toFixed(2)})
              </span>
            )}
          </span>
        </div>

        <Separator />

        {/* Calendar preview */}
        {calendar.length > 0 && (
          <div className="max-h-[200px] overflow-y-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">No.</TableHead>
                  <TableHead className="text-xs">Fecha</TableHead>
                  <TableHead className="text-xs text-right">Monto</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendar.map((item) => (
                  <TableRow key={item.number}>
                    <TableCell className="text-sm">{item.number}</TableCell>
                    <TableCell className="text-sm">
                      {format(item.date, 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      ${item.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">Pendiente</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Verification total row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2} className="text-sm text-right">Total:</TableCell>
                  <TableCell className="text-sm text-right">${calendar.reduce((s, i) => s + i.amount, 0).toFixed(2)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={onCancel}
            >
              Omitir por ahora
            </Button>
          )}
          <Button
            className="flex-1"
            size="lg"
            onClick={handleCreate}
            disabled={isCreating || !firstPaymentDate || numInstallments < 1 || !patientId}
          >
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Plan de Pago ({numInstallments} cuotas de ${installmentAmount.toFixed(2)})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
