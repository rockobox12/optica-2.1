import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PurchaseOrderForm } from './PurchaseOrderForm';
import { PurchaseOrderDetail } from './PurchaseOrderDetail';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Search, FileText, Wand2, Eye } from 'lucide-react';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  pending: { label: 'Pendiente', variant: 'secondary' },
  approved: { label: 'Aprobada', variant: 'default' },
  ordered: { label: 'Ordenada', variant: 'default' },
  partial: { label: 'Parcial', variant: 'secondary' },
  received: { label: 'Recibida', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export function PurchaseOrderList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['purchase-orders', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select('*, suppliers(name), branches(name)')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('order_number', `%${search}%`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const autoGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.defaultBranchId) throw new Error('Sucursal no configurada');
      
      const { data, error } = await supabase.rpc('generate_auto_purchase_order', {
        p_branch_id: profile.defaultBranchId,
        p_created_by: user?.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (poId) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (poId) {
        toast({ title: 'Orden generada automáticamente', description: 'Se creó una orden basada en alertas de stock' });
      } else {
        toast({ title: 'Sin productos por ordenar', description: 'No hay alertas de stock con proveedores configurados' });
      }
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleViewDetail = (order: any) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Órdenes de Compra</CardTitle>
        <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => autoGenerateMutation.mutate()}
              disabled={autoGenerateMutation.isPending}
              className="gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Generar Automática
            </Button>
            <Button onClick={() => { setSelectedOrder(null); setIsFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Orden
            </Button>
          </div>
        </RoleGuard>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => {
                  const status = statusLabels[order.status] || { label: order.status, variant: 'outline' as const };
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          {order.order_number}
                          {order.is_auto_generated && (
                            <Badge variant="outline" className="text-xs">Auto</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{order.suppliers?.name}</TableCell>
                      <TableCell>{order.branches?.name || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(order.order_date), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${order.total?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetail(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay órdenes de compra</p>
          </div>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Compra</DialogTitle>
          </DialogHeader>
          <PurchaseOrderForm
            onSuccess={() => {
              setIsFormOpen(false);
              queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Orden {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <PurchaseOrderDetail
              orderId={selectedOrder.id}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
