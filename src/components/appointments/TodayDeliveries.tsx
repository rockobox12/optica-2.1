import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfDay, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Package, 
  Clock, 
  User, 
  Phone, 
  MessageCircle, 
  ExternalLink, 
  CalendarCheck, 
  FlaskConical, 
  Building2, 
  AlertCircle, 
  CheckCircle2,
  Calendar,
  RefreshCw,
  CircleDot,
  ArrowUpDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface LabOrderInfo {
  id: string;
  order_number: string;
  status: string;
  location: string;
}

interface DeliveryAppointment {
  id: string;
  patient_name: string | null;
  patient_phone: string | null;
  patient_id: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  sale_id: string | null;
  lab_order_id: string | null;
  branch_id: string | null;
  branches?: { name: string } | null;
  lab_orders?: LabOrderInfo | null;
  delivery_responsible_type?: string | null;
  delivery_responsible_user_id?: string | null;
  delivery_responsible_name_snapshot?: string | null;
}

type TrafficLight = 'green' | 'yellow' | 'red';
type SortMode = 'time' | 'priority';

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  waiting: 'En espera',
  in_progress: 'En proceso',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const labStatusLabels: Record<string, string> = {
  RECIBIDA: 'Recibida',
  EN_LABORATORIO: 'En laboratorio',
  EN_OPTICA: 'En óptica',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  ENTREGADO: 'Entregado',
  RETRABAJO: 'Retrabajo',
};

/**
 * Calculate traffic light color based on delivery conditions
 * 🟢 GREEN: Order ready (LISTO_PARA_ENTREGA), delivery confirmed/scheduled
 * 🟡 YELLOW: Order in optica but not confirmed, delivery within 2 hours
 * 🔴 RED: Order still in lab, within 24h without lenses ready, or no-show history
 */
function calculateTrafficLight(delivery: DeliveryAppointment, now: Date): { color: TrafficLight; reason: string } {
  const labOrder = delivery.lab_orders;
  const deliveryDateTime = new Date(`${delivery.appointment_date}T${delivery.start_time}`);
  const hoursUntilDelivery = differenceInHours(deliveryDateTime, now);
  
  // 🔴 RED conditions (highest priority)
  if (labOrder) {
    // Order still in laboratory
    if (labOrder.location === 'EN_LABORATORIO') {
      if (hoursUntilDelivery <= 24) {
        return { color: 'red', reason: 'Lentes en laboratorio, entrega en menos de 24h' };
      }
      return { color: 'red', reason: 'Lentes aún en laboratorio' };
    }
    
    // Retrabajo status
    if (labOrder.status === 'RETRABAJO') {
      return { color: 'red', reason: 'Orden en retrabajo' };
    }
  }
  
  // Patient no-show history would be checked here if available
  // For now, we'll use the status
  if (delivery.status === 'no_show') {
    return { color: 'red', reason: 'Historial de no asistencia' };
  }
  
  // 🟡 YELLOW conditions
  if (labOrder) {
    // Order in optica but not confirmed
    if (labOrder.location === 'EN_OPTICA' && labOrder.status !== 'LISTO_PARA_ENTREGA') {
      return { color: 'yellow', reason: 'En óptica, pendiente confirmar estado' };
    }
  }
  
  // Delivery within 2 hours and not confirmed
  if (hoursUntilDelivery <= 2 && hoursUntilDelivery > 0 && delivery.status !== 'confirmed') {
    return { color: 'yellow', reason: 'Entrega próxima, requiere confirmación' };
  }
  
  // Delivery scheduled but not confirmed
  if (delivery.status === 'scheduled' && hoursUntilDelivery <= 4) {
    return { color: 'yellow', reason: 'Entrega próxima sin confirmar' };
  }
  
  // 🟢 GREEN conditions
  if (labOrder?.status === 'LISTO_PARA_ENTREGA' && labOrder?.location === 'EN_OPTICA') {
    if (delivery.status === 'confirmed') {
      return { color: 'green', reason: 'Todo listo para entrega' };
    }
    return { color: 'green', reason: 'Lentes listos en óptica' };
  }
  
  // No lab order means simple pickup, likely okay
  if (!labOrder) {
    return { color: 'green', reason: 'Entrega sin orden de laboratorio' };
  }
  
  // Default to yellow for uncertain states
  return { color: 'yellow', reason: 'Requiere verificación' };
}

function TrafficLightIndicator({ color, reason }: { color: TrafficLight; reason: string }) {
  const colorClasses = {
    green: 'bg-green-500 shadow-green-500/50',
    yellow: 'bg-yellow-500 shadow-yellow-500/50',
    red: 'bg-red-500 shadow-red-500/50 animate-pulse',
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className={cn(
            'w-4 h-4 rounded-full shadow-lg cursor-help shrink-0',
            colorClasses[color]
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[200px]">
        <p className="text-xs">{reason}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function LabOrderBadge({ labOrder }: { labOrder: LabOrderInfo | null | undefined }) {
  if (!labOrder) {
    return (
      <Badge variant="outline" className="text-[10px] h-5 gap-1">
        <Package className="h-2.5 w-2.5" />
        Sin orden
      </Badge>
    );
  }
  
  const isInOptica = labOrder.location === 'EN_OPTICA';
  const isReady = labOrder.status === 'LISTO_PARA_ENTREGA';
  
  if (isReady && isInOptica) {
    return (
      <Badge className="text-[10px] h-5 gap-1 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Listo
      </Badge>
    );
  }
  
  if (isInOptica) {
    return (
      <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
        <Building2 className="h-2.5 w-2.5" />
        En óptica
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
      <FlaskConical className="h-2.5 w-2.5" />
      En laboratorio
    </Badge>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    waiting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  
  return (
    <Badge className={cn(statusColors[status] || 'bg-gray-100', 'text-[10px] h-5')}>
      {statusLabels[status] || status}
    </Badge>
  );
}

export function TodayDeliveries() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  
  const today = startOfDay(new Date());
  const now = new Date();

  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ['today-deliveries', profile?.defaultBranchId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          patient_name,
          patient_phone,
          patient_id,
          appointment_date,
          start_time,
          status,
          notes,
          sale_id,
          lab_order_id,
          branch_id,
          delivery_responsible_type,
          delivery_responsible_user_id,
          delivery_responsible_name_snapshot,
          branches:branch_id(name),
          lab_orders:lab_order_id(id, order_number, status, location)
        `)
        .eq('appointment_type', 'delivery')
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .not('status', 'in', '("completed","cancelled")')
        .order('start_time', { ascending: true });

      if (profile?.defaultBranchId) {
        query = query.eq('branch_id', profile.defaultBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DeliveryAppointment[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds for real-time monitoring
  });

  // Add traffic light info to each delivery
  const deliveriesWithTrafficLight = deliveries.map(delivery => ({
    ...delivery,
    trafficLight: calculateTrafficLight(delivery, now),
  }));

  // Get unique responsible names for filter
  const responsibleOptions = Array.from(new Set(
    deliveriesWithTrafficLight
      .map(d => d.delivery_responsible_type === 'COBRADOR' 
        ? d.delivery_responsible_name_snapshot || 'Cobrador' 
        : 'Óptica Istmeña')
  ));

  // Filter by responsible
  const filteredDeliveries = deliveriesWithTrafficLight.filter(d => {
    if (responsibleFilter === 'all') return true;
    if (responsibleFilter === 'OPTICA') return !d.delivery_responsible_type || d.delivery_responsible_type === 'OPTICA';
    return d.delivery_responsible_user_id === responsibleFilter;
  });

  // Sort deliveries
  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    if (sortMode === 'priority') {
      const priorityOrder = { red: 0, yellow: 1, green: 2 };
      const priorityDiff = priorityOrder[a.trafficLight.color] - priorityOrder[b.trafficLight.color];
      if (priorityDiff !== 0) return priorityDiff;
    }
    return a.start_time.localeCompare(b.start_time);
  });

  // Count by traffic light
  const counts = {
    red: deliveriesWithTrafficLight.filter(d => d.trafficLight.color === 'red').length,
    yellow: deliveriesWithTrafficLight.filter(d => d.trafficLight.color === 'yellow').length,
    green: deliveriesWithTrafficLight.filter(d => d.trafficLight.color === 'green').length,
  };

  const handleWhatsApp = (delivery: DeliveryAppointment) => {
    if (!delivery.patient_phone) return;
    const phone = delivery.patient_phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola ${delivery.patient_name}, le recordamos que hoy tiene programada la entrega de sus productos a las ${delivery.start_time}. ¡Lo esperamos en la óptica!`
    );
    window.open(`https://wa.me/52${phone}?text=${message}`, '_blank');
  };

  const openDeliveryDetail = (delivery: DeliveryAppointment) => {
    navigate(`/agenda?tab=calendar&date=${delivery.appointment_date}`);
  };

  const openLabOrder = (delivery: DeliveryAppointment) => {
    if (delivery.lab_order_id) {
      navigate(`/laboratorio?order=${delivery.lab_order_id}`);
    }
  };

  const renderDeliveryCard = (delivery: typeof sortedDeliveries[0]) => (
    <Card 
      key={delivery.id} 
      className={cn(
        'overflow-hidden border-l-4 transition-all hover:shadow-md',
        delivery.trafficLight.color === 'green' && 'border-l-green-500',
        delivery.trafficLight.color === 'yellow' && 'border-l-yellow-500',
        delivery.trafficLight.color === 'red' && 'border-l-red-500',
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Traffic Light */}
          <TrafficLightIndicator 
            color={delivery.trafficLight.color} 
            reason={delivery.trafficLight.reason} 
          />
          
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-bold text-lg">{delivery.start_time}</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                <LabOrderBadge labOrder={delivery.lab_orders} />
                <DeliveryStatusBadge status={delivery.status} />
              </div>
            </div>
            
            {/* Patient Info */}
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{delivery.patient_name || 'Sin nombre'}</span>
            </div>

            {/* Responsible */}
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">
                {delivery.delivery_responsible_type === 'COBRADOR'
                  ? delivery.delivery_responsible_name_snapshot || 'Cobrador'
                  : 'Óptica Istmeña'}
              </span>
            </div>
            
            {delivery.patient_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">{delivery.patient_phone}</span>
              </div>
            )}
            
            {/* Lab Order Status Detail */}
            {delivery.lab_orders && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1">
                <span>Orden: {delivery.lab_orders.order_number}</span>
                <span>•</span>
                <span>{labStatusLabels[delivery.lab_orders.status] || delivery.lab_orders.status}</span>
              </div>
            )}
            
            {/* Reason/Alert */}
            <div className={cn(
              'text-xs px-2 py-1 rounded flex items-center gap-1',
              delivery.trafficLight.color === 'red' && 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
              delivery.trafficLight.color === 'yellow' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
              delivery.trafficLight.color === 'green' && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
            )}>
              {delivery.trafficLight.color === 'red' && <AlertCircle className="h-3 w-3" />}
              {delivery.trafficLight.color === 'yellow' && <CircleDot className="h-3 w-3" />}
              {delivery.trafficLight.color === 'green' && <CheckCircle2 className="h-3 w-3" />}
              <span>{delivery.trafficLight.reason}</span>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-8"
                onClick={() => openDeliveryDetail(delivery)}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Abrir entrega
              </Button>
              {delivery.lab_order_id && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  onClick={() => openLabOrder(delivery)}
                >
                  <FlaskConical className="h-3 w-3" />
                </Button>
              )}
              {delivery.patient_phone && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-900/20"
                  onClick={() => handleWhatsApp(delivery)}
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => navigate(`/agenda?tab=calendar&date=${delivery.appointment_date}`)}
              >
                <Calendar className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entregas del Día
          </h2>
        </div>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entregas del Día
          </h2>
          <p className="text-sm text-muted-foreground">
            {format(today, 'EEEE, d \'de\' MMMM yyyy', { locale: es })}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={responsibleFilter} onValueChange={setResponsibleFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Building2 className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="OPTICA">Óptica Istmeña</SelectItem>
              {deliveriesWithTrafficLight
                .filter(d => d.delivery_responsible_type === 'COBRADOR' && d.delivery_responsible_user_id)
                .reduce((acc, d) => {
                  if (!acc.find(x => x.id === d.delivery_responsible_user_id)) {
                    acc.push({ id: d.delivery_responsible_user_id!, name: d.delivery_responsible_name_snapshot || 'Cobrador' });
                  }
                  return acc;
                }, [] as { id: string; name: string }[])
                .map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
          <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
            <SelectTrigger className="w-[160px] h-9">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Por prioridad</SelectItem>
              <SelectItem value="time">Por hora</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{deliveries.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{counts.red}</span>
            </div>
            <div className="text-xs text-muted-foreground">Críticas</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{counts.yellow}</span>
            </div>
            <div className="text-xs text-muted-foreground">Atención</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{counts.green}</span>
            </div>
            <div className="text-xs text-muted-foreground">Listas</div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries List */}
      {deliveries.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No hay entregas programadas para hoy</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Las entregas agendadas aparecerán aquí
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sortedDeliveries.map(renderDeliveryCard)}
        </div>
      )}
    </div>
  );
}
