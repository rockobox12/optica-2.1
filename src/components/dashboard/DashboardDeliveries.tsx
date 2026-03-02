import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format, startOfDay, addDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Package, Clock, User, Phone, MessageCircle,
  ExternalLink, FlaskConical, Building2, AlertCircle,
  CheckCircle2, CalendarCheck, RefreshCw, CircleDot,
  Check, CalendarClock, Filter,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

type TrafficLight = 'green' | 'yellow' | 'red';
type FilterMode = 'all' | 'scheduled' | 'confirmed';

const statusLabels: Record<string, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  waiting: 'En espera',
  in_progress: 'En proceso',
};

function calculateTrafficLight(delivery: DeliveryAppointment, now: Date): { color: TrafficLight; reason: string } {
  const labOrder = delivery.lab_orders;
  const deliveryDateTime = new Date(`${delivery.appointment_date}T${delivery.start_time}`);
  const hoursUntilDelivery = differenceInHours(deliveryDateTime, now);

  if (labOrder) {
    if (labOrder.location === 'EN_LABORATORIO') {
      return { color: 'red', reason: 'Lentes en laboratorio' };
    }
    if (labOrder.status === 'RETRABAJO') {
      return { color: 'red', reason: 'Orden en retrabajo' };
    }
    if (labOrder.location === 'EN_OPTICA' && labOrder.status !== 'LISTO_PARA_ENTREGA') {
      return { color: 'yellow', reason: 'En óptica, pendiente confirmar' };
    }
  }

  if (hoursUntilDelivery <= 2 && hoursUntilDelivery > 0 && delivery.status !== 'confirmed') {
    return { color: 'yellow', reason: 'Entrega próxima sin confirmar' };
  }

  if (labOrder?.status === 'LISTO_PARA_ENTREGA') {
    return { color: 'green', reason: 'Lentes listos' };
  }

  return { color: 'green', reason: 'Entrega programada' };
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `52${digits}`;
  if (digits.startsWith('52') && digits.length === 12) return digits;
  if (digits.startsWith('+52')) return digits.slice(1);
  return digits;
}

export function DashboardDeliveries() {
  const navigate = useNavigate();
  const { profile, user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [rescheduleTarget, setRescheduleTarget] = useState<DeliveryAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const canMarkDelivered = hasAnyRole(['admin', 'asistente']);
  const today = startOfDay(new Date());
  const now = new Date();

  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ['dashboard-deliveries', profile?.defaultBranchId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          id, patient_name, patient_phone, patient_id,
          appointment_date, start_time, status, notes,
          sale_id, lab_order_id, branch_id,
          branches:branch_id(name),
          lab_orders:lab_order_id(id, order_number, status, location)
        `)
        .eq('appointment_type', 'delivery')
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .not('status', 'in', '("completed","cancelled","no_show")')
        .order('start_time', { ascending: true });

      if (profile?.defaultBranchId) {
        query = query.eq('branch_id', profile.defaultBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DeliveryAppointment[];
    },
    refetchInterval: 60000,
  });

  const enriched = deliveries.map(d => ({
    ...d,
    tl: calculateTrafficLight(d, now),
  }));

  const filtered = enriched.filter(d => {
    if (filter === 'scheduled') return d.status === 'scheduled';
    if (filter === 'confirmed') return d.status === 'confirmed';
    return true;
  });

  // Sort: red first, then yellow, then green, then by time
  const sorted = [...filtered].sort((a, b) => {
    const p = { red: 0, yellow: 1, green: 2 };
    const diff = p[a.tl.color] - p[b.tl.color];
    if (diff !== 0) return diff;
    return a.start_time.localeCompare(b.start_time);
  });

  const counts = {
    total: enriched.length,
    red: enriched.filter(d => d.tl.color === 'red').length,
    yellow: enriched.filter(d => d.tl.color === 'yellow').length,
    green: enriched.filter(d => d.tl.color === 'green').length,
  };

  const handleMarkDelivered = async (delivery: DeliveryAppointment) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', delivery.id);

      if (error) throw error;

      toast.success(`Entrega de ${delivery.patient_name} marcada como completada`);
      queryClient.invalidateQueries({ queryKey: ['dashboard-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['today-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['today-deliveries-stats'] });
    } catch (err) {
      toast.error('Error al marcar entrega');
      console.error(err);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate) return;
    setRescheduling(true);
    try {
      const updateData: Record<string, string> = {
        appointment_date: rescheduleDate,
      };
      if (rescheduleTime) {
        updateData.start_time = rescheduleTime;
        // Calculate end_time 30 min after
        const [h, m] = rescheduleTime.split(':').map(Number);
        const endMinutes = h * 60 + m + 30;
        updateData.end_time = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
      }
      if (rescheduleReason) {
        updateData.notes = `[Reagendado] ${rescheduleReason}${rescheduleTarget.notes ? ` | ${rescheduleTarget.notes}` : ''}`;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', rescheduleTarget.id);

      if (error) throw error;

      toast.success(`Entrega reagendada al ${format(new Date(rescheduleDate + 'T12:00:00'), 'd MMM yyyy', { locale: es })}`);
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      queryClient.invalidateQueries({ queryKey: ['dashboard-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['today-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['today-deliveries-stats'] });
    } catch (err) {
      toast.error('Error al reagendar');
      console.error(err);
    } finally {
      setRescheduling(false);
    }
  };

  const handleWhatsApp = (delivery: DeliveryAppointment) => {
    if (!delivery.patient_phone) return;
    const phone = normalizePhone(delivery.patient_phone);
    const branchName = (delivery.branches as any)?.name || 'nuestra óptica';
    const hora = delivery.start_time || 'horario abierto';
    const message = encodeURIComponent(
      `Hola ${delivery.patient_name || ''}, te recordamos que hoy tienes entrega programada en ${branchName}.\nHorario: ${hora}.\n¿Confirmas tu asistencia? ✅`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');

    // Log contact event
    if (user?.id && delivery.patient_id) {
      supabase.from('contact_events').insert({
        patient_id: delivery.patient_id,
        user_id: user.id,
        event_type: 'WHATSAPP_OPENED',
        channel: 'whatsapp',
        phone_used: delivery.patient_phone,
        related_entity_type: 'appointment',
        related_entity_id: delivery.id,
      }).then(() => {});
    }
  };

  const openReschedule = (delivery: DeliveryAppointment) => {
    setRescheduleTarget(delivery);
    setRescheduleDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    setRescheduleTime('');
    setRescheduleReason('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5" />
            Entregas programadas para hoy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5" />
              Entregas programadas para hoy
              <Badge variant="secondary" className="ml-1 text-xs">
                {counts.total}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              {/* Traffic light summary */}
              {counts.red > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                  <AlertCircle className="h-2.5 w-2.5" />
                  {counts.red}
                </Badge>
              )}
              {counts.yellow > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  {counts.yellow}
                </Badge>
              )}
              {counts.green > 0 && (
                <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {counts.green}
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Filters */}
          {counts.total > 0 && (
            <div className="flex gap-1 pt-2">
              {(['all', 'scheduled', 'confirmed'] as FilterMode[]).map(f => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'Todas' : f === 'scheduled' ? 'Pendientes' : 'Confirmadas'}
                </Button>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {counts.total === 0 ? (
            <div className="text-center py-6">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 text-green-500/60" />
              <p className="text-sm font-medium">No hay entregas programadas para hoy ✅</p>
              <p className="text-xs text-muted-foreground mt-1">Las entregas agendadas aparecerán aquí</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6">
              <Filter className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Sin entregas en este filtro</p>
            </div>
          ) : (
            <ScrollArea className={sorted.length > 4 ? 'h-[420px]' : ''}>
              <div className="space-y-3">
                {sorted.map(delivery => {
                  const tlColor = {
                    green: 'border-l-green-500',
                    yellow: 'border-l-yellow-500',
                    red: 'border-l-red-500',
                  }[delivery.tl.color];

                  const tlBg = {
                    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                    yellow: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
                    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
                  }[delivery.tl.color];

                  return (
                    <div
                      key={delivery.id}
                      className={cn('border rounded-lg p-3 border-l-4 space-y-2', tlColor)}
                    >
                      {/* Row 1: Time + Patient + Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-sm">{delivery.start_time || 'Sin hora'}</span>
                          <span className="text-sm truncate">{delivery.patient_name || 'Sin nombre'}</span>
                        </div>
                        <Badge className={cn('text-[10px] h-5 shrink-0',
                          delivery.status === 'confirmed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        )}>
                          {statusLabels[delivery.status] || delivery.status}
                        </Badge>
                      </div>

                      {/* Row 2: Branch + Phone + Lab order */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        {(delivery.branches as any)?.name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {(delivery.branches as any).name}
                          </span>
                        )}
                        {delivery.patient_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {delivery.patient_phone}
                          </span>
                        )}
                        {delivery.lab_orders && (
                          <span className="flex items-center gap-1">
                            <FlaskConical className="h-3 w-3" />
                            {delivery.lab_orders.order_number}
                          </span>
                        )}
                        {delivery.sale_id && (
                          <span className="text-[10px] opacity-60">
                            Venta vinculada
                          </span>
                        )}
                      </div>

                      {/* Row 3: Traffic light reason */}
                      <div className={cn('text-[11px] px-2 py-1 rounded flex items-center gap-1', tlBg)}>
                        {delivery.tl.color === 'red' && <AlertCircle className="h-3 w-3" />}
                        {delivery.tl.color === 'yellow' && <CircleDot className="h-3 w-3" />}
                        {delivery.tl.color === 'green' && <CheckCircle2 className="h-3 w-3" />}
                        {delivery.tl.reason}
                      </div>

                      {/* Row 4: Actions */}
                      <div className="flex gap-1.5 pt-1 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => navigate(`/agenda?date=${delivery.appointment_date}&view=day`)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver detalle
                        </Button>

                        {canMarkDelivered && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => handleMarkDelivered(delivery)}
                          >
                            <Check className="h-3 w-3" />
                            Entregada
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => openReschedule(delivery)}
                        >
                          <CalendarClock className="h-3 w-3" />
                          Reagendar
                        </Button>

                        {delivery.patient_phone ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
                            onClick={() => handleWhatsApp(delivery)}
                          >
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled>
                                <MessageCircle className="h-3 w-3" />
                                WhatsApp
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Paciente sin WhatsApp registrado</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Footer link */}
          {counts.total > 0 && (
            <div className="pt-3 border-t mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/agenda?tab=deliveries')}
              >
                Ver todas las entregas en Agenda →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Modal */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Reagendar entrega
            </DialogTitle>
          </DialogHeader>
          {rescheduleTarget && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium">{rescheduleTarget.patient_name}</p>
                <p className="text-xs text-muted-foreground">
                  Fecha actual: {format(new Date(rescheduleTarget.appointment_date + 'T12:00:00'), 'd MMM yyyy', { locale: es })} - {rescheduleTarget.start_time}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Nueva fecha *</Label>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
                <div>
                  <Label className="text-sm">Nueva hora (opcional)</Label>
                  <Input
                    type="time"
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-sm">Motivo (opcional)</Label>
                  <Textarea
                    value={rescheduleReason}
                    onChange={e => setRescheduleReason(e.target.value)}
                    placeholder="Ej: Paciente solicitó cambio de fecha"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!rescheduleDate || rescheduling}
            >
              {rescheduling ? 'Reagendando...' : 'Reagendar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
