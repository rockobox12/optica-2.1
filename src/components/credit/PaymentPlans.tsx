import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Search, Calendar, DollarSign, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentPlan {
  id: string;
  sale_id: string;
  patient_id: string;
  plan_type: string;
  total_amount: number;
  down_payment: number;
  number_of_installments: number;
  installment_amount: number;
  interest_rate: number;
  start_date: string;
  status: string;
  created_at: string;
  patients?: {
    first_name: string;
    last_name: string;
  };
  sales?: {
    sale_number: string;
  };
}

interface Installment {
  id: string;
  payment_plan_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: string;
  paid_at: string | null;
  days_overdue: number;
}

interface CreditSale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  patient_id: string | null;
  total: number;
  balance: number;
}

const getPlanTypeLabel = (type: string) => {
  switch (type) {
    case 'weekly': return 'Semanal';
    case 'biweekly': return 'Quincenal';
    case 'monthly': return 'Mensual';
    default: return type;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return <Badge className="bg-blue-100 text-blue-800">Activo</Badge>;
    case 'completed': return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
    case 'defaulted': return <Badge className="bg-red-100 text-red-800">Incumplido</Badge>;
    case 'cancelled': return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

const getInstallmentStatus = (status: string) => {
  switch (status) {
    case 'pending': return <Badge variant="outline">Pendiente</Badge>;
    case 'paid': return <Badge className="bg-green-100 text-green-800">Pagado</Badge>;
    case 'partial': return <Badge className="bg-yellow-100 text-yellow-800">Parcial</Badge>;
    case 'overdue': return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

export function PaymentPlans() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlan, setNewPlan] = useState({
    saleId: '',
    planType: 'weekly' as 'weekly' | 'biweekly' | 'monthly',
    downPayment: '',
    installments: '4',
    interestRate: '0',
  });
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch payment plans
  const { data: paymentPlans = [], isLoading } = useQuery({
    queryKey: ['payment-plans', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_plans')
        .select(`
          *,
          patients (first_name, last_name),
          sales (sale_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentPlan[];
    },
  });

  // Fetch installments for selected plan
  const { data: installments = [] } = useQuery({
    queryKey: ['plan-installments', selectedPlan?.id],
    queryFn: async () => {
      if (!selectedPlan) return [];
      const { data, error } = await supabase
        .from('payment_plan_installments')
        .select('*')
        .eq('payment_plan_id', selectedPlan.id)
        .order('installment_number');

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!selectedPlan,
  });

  // Fetch credit sales without payment plan
  const { data: creditSales = [] } = useQuery({
    queryKey: ['credit-sales-without-plan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sale_number, customer_name, patient_id, total, balance')
        .eq('is_credit', true)
        .gt('balance', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out sales that already have a payment plan
      const { data: existingPlans } = await supabase
        .from('payment_plans')
        .select('sale_id');

      const planSaleIds = new Set(existingPlans?.map(p => p.sale_id) || []);
      return (data as CreditSale[]).filter(s => !planSaleIds.has(s.id));
    },
    enabled: showCreateDialog,
  });

  // Create payment plan mutation
  const createPlan = useMutation({
    mutationFn: async () => {
      const sale = creditSales.find(s => s.id === newPlan.saleId);
      if (!sale) throw new Error('Venta no encontrada');

      const { data, error } = await supabase.rpc('create_payment_plan', {
        p_sale_id: newPlan.saleId,
        p_patient_id: sale.patient_id,
        p_plan_type: newPlan.planType,
        p_total_amount: sale.balance,
        p_down_payment: parseFloat(newPlan.downPayment) || 0,
        p_number_of_installments: parseInt(newPlan.installments),
        p_interest_rate: parseFloat(newPlan.interestRate) || 0,
        p_created_by: profile?.userId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Plan de pago creado',
        description: 'Se ha creado el plan de pagos exitosamente',
      });
      setShowCreateDialog(false);
      setNewPlan({ saleId: '', planType: 'weekly', downPayment: '', installments: '4', interestRate: '0' });
      queryClient.invalidateQueries({ queryKey: ['payment-plans'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Pay installment mutation
  const payInstallment = useMutation({
    mutationFn: async (installmentId: string) => {
      const installment = installments.find(i => i.id === installmentId);
      if (!installment) throw new Error('Cuota no encontrada');

      const { error } = await supabase
        .from('payment_plan_installments')
        .update({
          status: 'paid',
          paid_amount: installment.amount,
          paid_at: new Date().toISOString(),
        })
        .eq('id', installmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Cuota pagada' });
      queryClient.invalidateQueries({ queryKey: ['plan-installments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate progress for a plan
  const getProgress = (plan: PaymentPlan) => {
    const paidInstallments = installments.filter(i => i.status === 'paid').length;
    return (paidInstallments / plan.number_of_installments) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar planes de pago..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Crear Plan
        </Button>
      </div>

      {/* Payment Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planes de Pago</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : paymentPlans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay planes de pago registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Cuota</TableHead>
                  <TableHead className="text-center">Progreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono text-sm">
                      {plan.sales?.sale_number}
                    </TableCell>
                    <TableCell>
                      {plan.patients?.first_name} {plan.patients?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPlanTypeLabel(plan.plan_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(plan.total_amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(plan.installment_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={50} className="w-20 h-2" />
                        <span className="text-sm text-muted-foreground">
                          {plan.number_of_installments} cuotas
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(plan.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPlan(plan)}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Ver Cuotas
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Plan de Pagos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Venta a Crédito</Label>
              <Select value={newPlan.saleId} onValueChange={(v) => setNewPlan({ ...newPlan, saleId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar venta..." />
                </SelectTrigger>
                <SelectContent>
                  {creditSales.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id}>
                      {sale.sale_number} - {sale.customer_name || 'Cliente'} - ${Number(sale.balance).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Plan</Label>
                <Select 
                  value={newPlan.planType} 
                  onValueChange={(v: 'weekly' | 'biweekly' | 'monthly') => setNewPlan({ ...newPlan, planType: v })}
                >
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
                <Label>Número de Cuotas</Label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={newPlan.installments}
                  onChange={(e) => setNewPlan({ ...newPlan, installments: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Enganche (Opcional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newPlan.downPayment}
                  onChange={(e) => setNewPlan({ ...newPlan, downPayment: e.target.value })}
                />
              </div>
              <div>
                <Label>Tasa de Interés %</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={newPlan.interestRate}
                  onChange={(e) => setNewPlan({ ...newPlan, interestRate: e.target.value })}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => createPlan.mutate()}
              disabled={!newPlan.saleId || createPlan.isPending}
            >
              {createPlan.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Plan de Pagos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Installments Dialog */}
      {selectedPlan && (
        <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Cuotas - {selectedPlan.sales?.sale_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-bold">${Number(selectedPlan.total_amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cuota</p>
                  <p className="font-bold">${Number(selectedPlan.installment_amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-bold">{getPlanTypeLabel(selectedPlan.plan_type)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Pagado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell>{inst.installment_number}</TableCell>
                      <TableCell>
                        {format(new Date(inst.due_date), 'dd/MM/yyyy', { locale: es })}
                        {inst.status === 'overdue' && (
                          <span className="text-xs text-red-600 ml-2">
                            ({inst.days_overdue} días)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">${Number(inst.amount).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-green-600">
                        ${Number(inst.paid_amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{getInstallmentStatus(inst.status)}</TableCell>
                      <TableCell className="text-right">
                        {inst.status !== 'paid' && (
                          <Button
                            size="sm"
                            onClick={() => payInstallment.mutate(inst.id)}
                            disabled={payInstallment.isPending}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
