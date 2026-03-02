import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, X, PackageCheck, Loader2 } from 'lucide-react';

interface PurchaseOrderDetailProps {
  orderId: string;
  onUpdate: () => void;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Borrador', variant: 'outline' },
  pending: { label: 'Pendiente', variant: 'secondary' },
  approved: { label: 'Aprobada', variant: 'default' },
  ordered: { label: 'Ordenada', variant: 'default' },
  partial: { label: 'Parcial', variant: 'secondary' },
  received: { label: 'Recibida', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export function PurchaseOrderDetail({ orderId, onUpdate }: PurchaseOrderDetailProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['purchase-order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name, email, phone), branches(name)')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ['purchase-order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*, products(name, sku)')
        .eq('purchase_order_id', orderId);
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const updateData: any = { status: newStatus };
      if (newStatus === 'approved') {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
      }
      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order-detail', orderId] });
      onUpdate();
      toast({ title: 'Estado actualizado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const status = statusLabels[order.status] || { label: order.status, variant: 'outline' as const };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Proveedor</p>
          <p className="font-medium">{order.suppliers?.name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sucursal</p>
          <p className="font-medium">{order.branches?.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Fecha</p>
          <p className="font-medium">{format(new Date(order.order_date), 'dd/MM/yyyy', { locale: es })}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Estado</p>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-center">Ordenado</TableHead>
              <TableHead className="text-center">Recibido</TableHead>
              <TableHead className="text-right">Costo Unit.</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.products?.name}</p>
                    <p className="text-sm text-muted-foreground">{item.products?.sku}</p>
                  </div>
                </TableCell>
                <TableCell className="text-center">{item.quantity_ordered}</TableCell>
                <TableCell className="text-center">
                  <span className={item.quantity_received >= item.quantity_ordered ? 'text-green-600' : ''}>
                    {item.quantity_received}
                  </span>
                </TableCell>
                <TableCell className="text-right">${item.unit_cost?.toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">${item.subtotal?.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${order.subtotal?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA ({order.tax_rate}%):</span>
            <span>${order.tax_amount?.toFixed(2)}</span>
          </div>
          {order.shipping_cost > 0 && (
            <div className="flex justify-between">
              <span>Envío:</span>
              <span>${order.shipping_cost?.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${order.total?.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Notas</p>
          <p>{order.notes}</p>
        </div>
      )}

      {/* Actions */}
      <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
        <div className="flex justify-end gap-3 pt-4 border-t">
          {order.status === 'draft' && (
            <>
              <Button
                variant="destructive"
                onClick={() => updateStatusMutation.mutate('cancelled')}
                disabled={updateStatusMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={() => updateStatusMutation.mutate('approved')}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Aprobar
              </Button>
            </>
          )}
          {order.status === 'approved' && (
            <Button
              onClick={() => updateStatusMutation.mutate('ordered')}
              disabled={updateStatusMutation.isPending}
            >
              Marcar como Ordenada
            </Button>
          )}
          {(order.status === 'ordered' || order.status === 'partial') && (
            <Button className="gap-2">
              <PackageCheck className="h-4 w-4" />
              Registrar Recepción
            </Button>
          )}
        </div>
      </RoleGuard>
    </div>
  );
}
