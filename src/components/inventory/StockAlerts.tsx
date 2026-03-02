import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, Package, TrendingUp, CheckCircle, Bell } from 'lucide-react';

const alertTypes = {
  out_of_stock: { label: 'Sin stock', variant: 'destructive' as const, icon: AlertTriangle },
  low_stock: { label: 'Stock bajo', variant: 'secondary' as const, icon: TrendingUp },
  overstock: { label: 'Exceso de stock', variant: 'outline' as const, icon: Package },
};

export function StockAlerts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          products(name, sku, reorder_point),
          branches(name)
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('stock-alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const resolveMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('stock_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      toast({ title: 'Alerta marcada como resuelta' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const alertCounts = {
    out_of_stock: alerts?.filter((a) => a.alert_type === 'out_of_stock').length || 0,
    low_stock: alerts?.filter((a) => a.alert_type === 'low_stock').length || 0,
    overstock: alerts?.filter((a) => a.alert_type === 'overstock').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Sin Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{alertCounts.out_of_stock}</p>
            <p className="text-sm text-muted-foreground">productos agotados</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{alertCounts.low_stock}</p>
            <p className="text-sm text-muted-foreground">necesitan reposición</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Exceso de Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{alertCounts.overstock}</p>
            <p className="text-sm text-muted-foreground">sobre el máximo</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas Activas
          </CardTitle>
          <CardDescription>
            Alertas de inventario que requieren atención
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : alerts && alerts.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Stock Actual</TableHead>
                    <TableHead className="text-center">Umbral</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert: any) => {
                    const typeInfo = alertTypes[alert.alert_type as keyof typeof alertTypes];
                    const TypeIcon = typeInfo?.icon || AlertTriangle;

                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{alert.products?.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {alert.products?.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{alert.branches?.name}</TableCell>
                        <TableCell>
                          <Badge variant={typeInfo?.variant} className="gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {typeInfo?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {alert.current_quantity}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {alert.threshold_quantity}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell className="text-right">
                          <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resolveMutation.mutate(alert.id)}
                              disabled={resolveMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolver
                            </Button>
                          </RoleGuard>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-lg font-medium text-foreground">¡Todo en orden!</p>
              <p className="text-muted-foreground">No hay alertas de inventario pendientes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
