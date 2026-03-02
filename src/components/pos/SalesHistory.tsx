import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Eye, Calendar, DollarSign, TrendingUp, Package } from 'lucide-react';
import { ThermalTicket } from './ThermalTicket';
import { DeliveryScheduleModal } from './DeliveryScheduleModal';
import { useAuth } from '@/hooks/useAuth';

interface Sale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  total: number;
  amount_paid: number;
  balance: number;
  status: string;
  is_credit: boolean;
  created_at: string;
  patient_id: string | null;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
  partial: 'Parcial',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  partial: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};

export function SalesHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliverySale, setDeliverySale] = useState<Sale | null>(null);
  const { hasAnyRole } = useAuth();
  
  const canScheduleDelivery = hasAnyRole(['admin', 'doctor', 'asistente']);

  // Get date range
  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default:
        return null;
    }
  };

  const dateRange = getDateRange();

  // Fetch sales
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-history', dateFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      if (searchTerm) {
        query = query.or(`sale_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Sale[];
    },
  });

  // Fetch sale details
  const { data: saleDetails } = useQuery({
    queryKey: ['sale-details', selectedSale?.id],
    queryFn: async () => {
      if (!selectedSale) return null;

      const [itemsRes, paymentsRes] = await Promise.all([
        supabase.from('sale_items').select('*').eq('sale_id', selectedSale.id),
        supabase.from('sale_payments').select('*').eq('sale_id', selectedSale.id),
      ]);

      return {
        items: itemsRes.data || [],
        payments: paymentsRes.data || [],
      };
    },
    enabled: !!selectedSale,
  });

  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.amount_paid), 0);
  const completedCount = sales.filter(s => s.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
                <p className="text-xl font-bold">${totalSales.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobrado</p>
                <p className="text-xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Transacciones</p>
              <p className="text-xl font-bold">{sales.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground">Completadas</p>
              <p className="text-xl font-bold text-green-600">{completedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {(['today', 'week', 'month', 'all'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={dateFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter(filter)}
                >
                  {filter === 'today' ? 'Hoy' : filter === 'week' ? '7 días' : filter === 'month' ? '30 días' : 'Todo'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron ventas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(sale.created_at), 'dd/MM/yy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell>{sale.customer_name || 'Cliente general'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(sale.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(sale.amount_paid).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[sale.status]}>
                        {statusLabels[sale.status]}
                      </Badge>
                      {sale.is_credit && (
                        <Badge variant="outline" className="ml-1">Crédito</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSale(sale)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      {selectedSale && saleDetails && (
        <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Detalle de Venta {selectedSale.sale_number}</DialogTitle>
            </DialogHeader>
            <ThermalTicket
              sale={{
                sale_number: selectedSale.sale_number,
                id: selectedSale.id,
                created_at: selectedSale.created_at,
                total: Number(selectedSale.total),
                subtotal: saleDetails.items.reduce((sum: number, item: any) => sum + Number(item.subtotal), 0),
                discount_amount: 0,
                amount_paid: Number(selectedSale.amount_paid),
                balance: Number(selectedSale.balance),
                is_credit: selectedSale.is_credit,
              }}
              items={saleDetails.items.map((item: any) => ({
                id: item.id,
                productType: item.product_type,
                productName: item.product_name,
                productCode: item.product_code,
                description: item.description,
                quantity: item.quantity,
                unitPrice: Number(item.unit_price),
                discountPercent: Number(item.discount_percent) || 0,
                discountAmount: Number(item.discount_amount) || 0,
                subtotal: Number(item.subtotal),
              }))}
              payments={saleDetails.payments.map((payment: any) => ({
                method: payment.payment_method,
                amount: Number(payment.amount),
                reference: payment.reference,
              }))}
              customer={selectedSale.customer_name ? { name: selectedSale.customer_name } : null}
            />
            {/* Schedule Delivery Button */}
            {selectedSale.patient_id && canScheduleDelivery && (
              <div className="pt-2 border-t">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => {
                    setDeliverySale(selectedSale);
                    setSelectedSale(null);
                    setShowDeliveryModal(true);
                  }}
                >
                  <Package className="h-4 w-4" />
                  Agendar Entrega
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delivery Schedule Modal */}
      {deliverySale && deliverySale.patient_id && (
        <DeliveryScheduleModal
          open={showDeliveryModal}
          onOpenChange={setShowDeliveryModal}
          patientId={deliverySale.patient_id}
          patientName={deliverySale.customer_name || 'Paciente'}
          saleId={deliverySale.id}
          saleNumber={deliverySale.sale_number}
          onSuccess={() => setDeliverySale(null)}
        />
      )}
    </div>
  );
}
