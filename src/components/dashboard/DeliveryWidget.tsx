import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Package, Clock, User, Phone, MessageCircle, ExternalLink, CalendarCheck, FlaskConical, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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
}

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  waiting: 'En espera',
  in_progress: 'En proceso',
  completed: 'Realizada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  waiting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  no_show: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const labStatusLabels: Record<string, string> = {
  RECIBIDA: 'Recibida',
  EN_LABORATORIO: 'En laboratorio',
  EN_OPTICA: 'En óptica',
  LISTO_PARA_ENTREGA: 'Listo',
  ENTREGADO: 'Entregado',
  RETRABAJO: 'Retrabajo',
};

function LabOrderStatusBadge({ labOrder }: { labOrder: LabOrderInfo | null | undefined }) {
  if (!labOrder) return null;

  const isReady = labOrder.status === 'LISTO_PARA_ENTREGA' || labOrder.status === 'ENTREGADO';
  const isInOptica = labOrder.location === 'EN_OPTICA';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1">
          {isInOptica ? (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
              <Building2 className="h-2.5 w-2.5" />
              En óptica
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400">
              <FlaskConical className="h-2.5 w-2.5" />
              En laboratorio
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>Orden: {labOrder.order_number}</p>
        <p>Estado: {labStatusLabels[labOrder.status] || labOrder.status}</p>
        <p>Ubicación: {labOrder.location === 'EN_OPTICA' ? 'En óptica' : 'En laboratorio'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function DeliveryReadyIndicator({ labOrder }: { labOrder: LabOrderInfo | null | undefined }) {
  if (!labOrder) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <CheckCircle2 className="h-3 w-3 text-green-500" />
        <span>Sin orden de lab</span>
      </div>
    );
  }

  const isReady = labOrder.status === 'LISTO_PARA_ENTREGA' && labOrder.location === 'EN_OPTICA';
  const isInOptica = labOrder.location === 'EN_OPTICA';
  
  if (isReady) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        <span className="font-medium">Listo para entregar</span>
      </div>
    );
  }

  if (!isInOptica) {
    return (
      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
        <AlertCircle className="h-3 w-3" />
        <span>Lentes en laboratorio</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
      <Building2 className="h-3 w-3" />
      <span>Lentes en óptica</span>
    </div>
  );
}

export function DeliveryWidget() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const today = startOfDay(new Date());
  const in7Days = endOfDay(addDays(today, 7));

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ['deliveries-widget', profile?.defaultBranchId],
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
          branches:branch_id(name),
          lab_orders:lab_order_id(id, order_number, status, location)
        `)
        .eq('appointment_type', 'delivery')
        .gte('appointment_date', format(today, 'yyyy-MM-dd'))
        .lte('appointment_date', format(in7Days, 'yyyy-MM-dd'))
        .not('status', 'in', '("completed","cancelled","no_show")')
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (profile?.defaultBranchId) {
        query = query.eq('branch_id', profile.defaultBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DeliveryAppointment[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Group by day
  const todayDeliveries = deliveries.filter(d => isToday(new Date(d.appointment_date)));
  const tomorrowDeliveries = deliveries.filter(d => isTomorrow(new Date(d.appointment_date)));
  const laterDeliveries = deliveries.filter(d => 
    !isToday(new Date(d.appointment_date)) && !isTomorrow(new Date(d.appointment_date))
  );

  // Count deliveries with issues (lab order not ready)
  const deliveriesWithIssues = deliveries.filter(d => {
    if (!d.lab_orders) return false;
    return d.lab_orders.status !== 'LISTO_PARA_ENTREGA' && d.lab_orders.status !== 'ENTREGADO';
  });

  const handleWhatsApp = (delivery: DeliveryAppointment) => {
    if (!delivery.patient_phone) return;
    const phone = delivery.patient_phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola ${delivery.patient_name}, le recordamos que tiene programada la entrega de sus productos el ${format(new Date(delivery.appointment_date), 'EEEE d \'de\' MMMM', { locale: es })} a las ${delivery.start_time}. ¡Lo esperamos!`
    );
    window.open(`https://wa.me/52${phone}?text=${message}`, '_blank');
  };

  const openDelivery = (delivery: DeliveryAppointment) => {
    navigate(`/agenda?date=${delivery.appointment_date}&view=day`);
  };

  const renderDeliveryItem = (delivery: DeliveryAppointment) => (
    <div key={delivery.id} className="p-3 bg-secondary/30 rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{delivery.start_time}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          <LabOrderStatusBadge labOrder={delivery.lab_orders} />
          <Badge className={statusColors[delivery.status] + ' text-[10px] h-5'}>
            {statusLabels[delivery.status]}
          </Badge>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{delivery.patient_name || 'Sin nombre'}</span>
      </div>

      {/* Lab order ready indicator */}
      <DeliveryReadyIndicator labOrder={delivery.lab_orders} />

      {delivery.patient_phone && (
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">{delivery.patient_phone}</span>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-7 text-xs"
          onClick={() => openDelivery(delivery)}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Ver
        </Button>
        {delivery.patient_phone && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs text-green-600 border-green-600/30 hover:bg-green-50 dark:hover:bg-green-900/20"
            onClick={() => handleWhatsApp(delivery)}
          >
            <MessageCircle className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Entregas Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deliveries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Entregas Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No hay entregas programadas
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          Entregas Pendientes
          <div className="ml-auto flex items-center gap-1">
            {deliveriesWithIssues.length > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5">
                {deliveriesWithIssues.length} sin lentes
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] h-5">
              {deliveries.length} total
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px] px-4 pb-4">
          {todayDeliveries.length > 0 && (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">Hoy</Badge>
                <span className="text-xs text-muted-foreground">{todayDeliveries.length} entrega(s)</span>
              </div>
              {todayDeliveries.map(renderDeliveryItem)}
            </div>
          )}

          {tomorrowDeliveries.length > 0 && (
            <div className="space-y-2 mb-4">
              {todayDeliveries.length > 0 && <Separator className="my-3" />}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Mañana</Badge>
                <span className="text-xs text-muted-foreground">{tomorrowDeliveries.length} entrega(s)</span>
              </div>
              {tomorrowDeliveries.map(renderDeliveryItem)}
            </div>
          )}

          {laterDeliveries.length > 0 && (
            <div className="space-y-2">
              {(todayDeliveries.length > 0 || tomorrowDeliveries.length > 0) && <Separator className="my-3" />}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Próximos días</Badge>
                <span className="text-xs text-muted-foreground">{laterDeliveries.length} entrega(s)</span>
              </div>
              {laterDeliveries.map(d => (
                <div key={d.id} className="p-2 bg-secondary/20 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{d.patient_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(d.appointment_date), 'EEE d', { locale: es })} {d.start_time}
                    </span>
                  </div>
                  <DeliveryReadyIndicator labOrder={d.lab_orders} />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
