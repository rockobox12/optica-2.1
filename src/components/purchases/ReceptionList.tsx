import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ReceptionForm } from './ReceptionForm';
import { useToast } from '@/hooks/use-toast';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, PackageCheck, Eye } from 'lucide-react';

export function ReceptionList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingOrders } = useQuery({
    queryKey: ['pending-orders-for-reception'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('id, order_number, suppliers(name)')
        .in('status', ['ordered', 'partial'])
        .order('order_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: receptions, isLoading } = useQuery({
    queryKey: ['purchase-receptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_receptions')
        .select(`
          *,
          purchase_orders(order_number, suppliers(name)),
          branches(name)
        `)
        .order('reception_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const handleNewReception = () => {
    if (!selectedOrderId) {
      toast({ title: 'Selecciona una orden', variant: 'destructive' });
      return;
    }
    setIsFormOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Recepciones</CardTitle>
        <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
          <div className="flex gap-2">
            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleccionar orden pendiente" />
              </SelectTrigger>
              <SelectContent>
                {pendingOrders?.map((order: any) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} - {order.suppliers?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleNewReception} className="gap-2" disabled={!selectedOrderId}>
              <Plus className="h-4 w-4" />
              Recibir
            </Button>
          </div>
        </RoleGuard>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : receptions && receptions.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recepción</TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receptions.map((reception: any) => (
                  <TableRow key={reception.id}>
                    <TableCell className="font-mono">{reception.reception_number}</TableCell>
                    <TableCell className="font-mono">{reception.purchase_orders?.order_number}</TableCell>
                    <TableCell>{reception.purchase_orders?.suppliers?.name}</TableCell>
                    <TableCell>{reception.branches?.name || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(reception.reception_date), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <PackageCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay recepciones registradas</p>
          </div>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recepción de Mercancía</DialogTitle>
          </DialogHeader>
          <ReceptionForm
            orderId={selectedOrderId}
            onSuccess={() => {
              setIsFormOpen(false);
              setSelectedOrderId('');
              queryClient.invalidateQueries({ queryKey: ['purchase-receptions'] });
              queryClient.invalidateQueries({ queryKey: ['pending-orders-for-reception'] });
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
