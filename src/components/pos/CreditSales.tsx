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
import { format, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, DollarSign, AlertTriangle, Clock, CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface CreditSale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  patient_id: string | null;
  total: number;
  amount_paid: number;
  balance: number;
  credit_due_date: string | null;
  created_at: string;
  status: string;
}

export function CreditSales() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch credit sales
  const { data: creditSales = [], isLoading } = useQuery({
    queryKey: ['credit-sales', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*')
        .eq('is_credit', true)
        .in('status', ['pending', 'partial'])
        .order('credit_due_date', { ascending: true });

      if (searchTerm) {
        query = query.or(`sale_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreditSale[];
    },
  });

  // Register payment mutation
  const registerPayment = useMutation({
    mutationFn: async () => {
      if (!selectedSale) throw new Error('No sale selected');
      
      const amount = parseFloat(paymentAmount);
      if (amount <= 0) throw new Error('Monto inválido');

      // Get current payment count
      const { count } = await supabase
        .from('credit_payments')
        .select('*', { count: 'exact', head: true })
        .eq('sale_id', selectedSale.id);

      // Insert credit payment
      const { error: paymentError } = await supabase.from('credit_payments').insert({
        sale_id: selectedSale.id,
        payment_number: (count || 0) + 1,
        amount,
        payment_method: paymentMethod,
        reference: paymentReference || null,
        received_by: profile?.userId,
      });

      if (paymentError) throw paymentError;

      // Also add to sale_payments for consistency
      const { error: salePaymentError } = await supabase.from('sale_payments').insert({
        sale_id: selectedSale.id,
        payment_method: paymentMethod,
        amount,
        reference: paymentReference || null,
        received_by: profile?.userId,
        is_initial_payment: false,
      });

      if (salePaymentError) throw salePaymentError;

      return amount;
    },
    onSuccess: (amount) => {
      toast({
        title: 'Abono registrado',
        description: `Se registró un abono de $${amount.toFixed(2)}`,
      });
      setSelectedSale(null);
      setPaymentAmount('');
      setPaymentReference('');
      queryClient.invalidateQueries({ queryKey: ['credit-sales'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calculate stats
  const totalPending = creditSales.reduce((sum, sale) => sum + Number(sale.balance), 0);
  const overdueCount = creditSales.filter(sale => 
    sale.credit_due_date && isPast(new Date(sale.credit_due_date))
  ).length;

  const getDueStatus = (sale: CreditSale) => {
    if (!sale.credit_due_date) return null;
    const dueDate = new Date(sale.credit_due_date);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    
    if (isPast(dueDate)) {
      return { label: 'Vencido', color: 'bg-red-100 text-red-800', days: Math.abs(daysUntilDue) };
    } else if (daysUntilDue <= 7) {
      return { label: 'Por vencer', color: 'bg-orange-100 text-orange-800', days: daysUntilDue };
    }
    return { label: 'Vigente', color: 'bg-green-100 text-green-800', days: daysUntilDue };
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pendiente</p>
                <p className="text-xl font-bold text-orange-600">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créditos Activos</p>
                <p className="text-xl font-bold">{creditSales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-xl font-bold text-red-600">{overdueCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número de ticket o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Credit Sales Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : creditSales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay créditos pendientes
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditSales.map((sale) => {
                  const dueStatus = getDueStatus(sale);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                      <TableCell>{sale.customer_name || 'Cliente general'}</TableCell>
                      <TableCell className="text-right">${Number(sale.total).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        ${Number(sale.balance).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {sale.credit_due_date 
                          ? format(new Date(sale.credit_due_date), 'dd/MM/yyyy', { locale: es })
                          : 'Sin fecha'}
                      </TableCell>
                      <TableCell>
                        {dueStatus && (
                          <Badge className={dueStatus.color}>
                            {dueStatus.label} ({dueStatus.days}d)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSale(sale);
                            setPaymentAmount(Number(sale.balance).toFixed(2));
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Abonar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {selectedSale && (
        <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Abono - {selectedSale.sale_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between mb-2">
                  <span>Cliente:</span>
                  <span className="font-medium">{selectedSale.customer_name || 'Cliente general'}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Total venta:</span>
                  <span>${Number(selectedSale.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Pagado:</span>
                  <span className="text-green-600">${Number(selectedSale.amount_paid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Saldo pendiente:</span>
                  <span className="text-orange-600">${Number(selectedSale.balance).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <Label>Monto del Abono</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={Number(selectedSale.balance)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div>
                <Label>Método de Pago</Label>
                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod !== 'cash' && (
                <div>
                  <Label>Referencia</Label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Número de autorización o referencia"
                  />
                </div>
              )}

              <Button
                className="w-full"
                onClick={() => registerPayment.mutate()}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || registerPayment.isPending}
              >
                {registerPayment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Registrar Abono de ${parseFloat(paymentAmount || '0').toFixed(2)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
