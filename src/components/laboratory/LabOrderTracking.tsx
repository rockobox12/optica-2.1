import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface TrackingOrder {
  id: string;
  order_number: string;
  status: string;
  priority: string;
  estimated_delivery_date: string | null;
  created_at: string;
  laboratory_name: string | null;
  patients: {
    first_name: string;
    last_name: string;
  };
}

const statusSteps = [
  { key: 'pending', label: 'Pendiente', icon: Clock },
  { key: 'sent', label: 'Enviado', icon: Truck },
  { key: 'in_production', label: 'En producción', icon: Package },
  { key: 'quality_check', label: 'Control de calidad', icon: AlertTriangle },
  { key: 'ready', label: 'Listo', icon: CheckCircle },
];

export function LabOrderTracking() {
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchActiveOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('lab-orders-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lab_orders',
        },
        () => {
          fetchActiveOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          id,
          order_number,
          status,
          priority,
          estimated_delivery_date,
          created_at,
          laboratory_name,
          patients!inner (first_name, last_name)
        `)
        .not('status', 'in', '("delivered","cancelled")')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las órdenes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusProgress = (status: string): number => {
    const index = statusSteps.findIndex((s) => s.key === status);
    if (index === -1) return 0;
    return ((index + 1) / statusSteps.length) * 100;
  };

  const getDaysRemaining = (estimatedDate: string | null): number | null => {
    if (!estimatedDate) return null;
    return differenceInDays(new Date(estimatedDate), new Date());
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay órdenes activas en seguimiento
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => {
            const progress = getStatusProgress(order.status);
            const daysRemaining = getDaysRemaining(order.estimated_delivery_date);
            const currentStep = statusSteps.find((s) => s.key === order.status);
            const CurrentIcon = currentStep?.icon || Clock;

            return (
              <Card key={order.id} className="relative overflow-hidden">
                {order.priority === 'urgent' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-destructive" />
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-mono">
                        {order.order_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.patients.first_name} {order.patients.last_name}
                      </p>
                    </div>
                    <Badge
                      variant={order.priority === 'urgent' ? 'destructive' : 'secondary'}
                    >
                      {order.priority === 'urgent'
                        ? 'Urgente'
                        : order.priority === 'low'
                        ? 'Baja'
                        : 'Normal'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CurrentIcon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{currentStep?.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Status steps */}
                  <div className="flex justify-between">
                    {statusSteps.map((step, index) => {
                      const isCompleted =
                        statusSteps.findIndex((s) => s.key === order.status) >= index;
                      const isCurrent = order.status === step.key;
                      const Icon = step.icon;

                      return (
                        <div
                          key={step.key}
                          className={`flex flex-col items-center ${
                            isCurrent
                              ? 'text-primary'
                              : isCompleted
                              ? 'text-primary/60'
                              : 'text-muted-foreground/40'
                          }`}
                        >
                          <Icon
                            className={`h-4 w-4 ${
                              isCurrent ? 'animate-pulse' : ''
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Delivery info */}
                  <div className="pt-2 border-t text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">
                        {order.laboratory_name || 'Sin laboratorio'}
                      </span>
                      {daysRemaining !== null && (
                        <Badge
                          variant={
                            daysRemaining < 0
                              ? 'destructive'
                              : daysRemaining <= 2
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {daysRemaining < 0
                            ? `${Math.abs(daysRemaining)} días atrasado`
                            : daysRemaining === 0
                            ? 'Hoy'
                            : `${daysRemaining} días`}
                        </Badge>
                      )}
                    </div>
                    {order.estimated_delivery_date && (
                      <p className="text-muted-foreground mt-1">
                        Entrega:{' '}
                        {format(
                          new Date(order.estimated_delivery_date),
                          "dd 'de' MMMM",
                          { locale: es }
                        )}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de producción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            {statusSteps.map((step) => {
              const count = orders.filter((o) => o.status === step.key).length;
              const Icon = step.icon;
              return (
                <div key={step.key} className="space-y-2">
                  <div
                    className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center ${
                      count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{step.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
