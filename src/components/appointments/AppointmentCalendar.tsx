import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, Clock, User, Phone, Calendar as CalendarIcon } from 'lucide-react';
import { AppointmentForm } from './AppointmentForm';
import { AppointmentDetails } from './AppointmentDetails';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week' | 'month';

interface Appointment {
  id: string;
  patient_id: string | null;
  doctor_id: string;
  branch_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: string;
  status: string;
  reason: string | null;
  notes: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  patient_email: string | null;
  booking_source: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  waiting: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-orange-100 text-orange-800 border-orange-200',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  waiting: 'En espera',
  in_progress: 'En consulta',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
};

const typeLabels: Record<string, string> = {
  exam: 'Examen Visual',
  follow_up: 'Seguimiento',
  contact_lens: 'Lentes de Contacto',
  emergency: 'Urgencia',
  delivery: 'Entrega',
  other: 'Otro',
};

const typeColors: Record<string, string> = {
  exam: 'border-l-primary',
  follow_up: 'border-l-blue-500',
  contact_lens: 'border-l-purple-500',
  emergency: 'border-l-red-500',
  delivery: 'border-l-accent',
  other: 'border-l-gray-500',
};

export function AppointmentCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'week':
        return {
          start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
          end: endOfWeek(selectedDate, { weekStartsOn: 1 }),
        };
      case 'month':
        return {
          start: startOfMonth(selectedDate),
          end: endOfMonth(selectedDate),
        };
      default:
        return { start: selectedDate, end: selectedDate };
    }
  };

  const dateRange = getDateRange();

  // Fetch appointments
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', format(dateRange.start, 'yyyy-MM-dd'), format(dateRange.end, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('appointment_date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('appointment_date', format(dateRange.end, 'yyyy-MM-dd'))
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as Appointment[];
    },
  });

  // Fetch doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.appointment_date), date)
    );
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = doctors.find(d => d.user_id === doctorId);
    return doctor?.full_name || 'Doctor no asignado';
  };

  const navigatePrevious = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(prev => addDays(prev, -1));
        break;
      case 'week':
        setSelectedDate(prev => addDays(prev, -7));
        break;
      case 'month':
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case 'day':
        setSelectedDate(prev => addDays(prev, 1));
        break;
      case 'week':
        setSelectedDate(prev => addDays(prev, 7));
        break;
      case 'month':
        setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        break;
    }
  };

  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(selectedDate);
    const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {hours.map(hour => {
            const hourAppointments = dayAppointments.filter(apt => {
              const aptHour = parseInt(apt.start_time.split(':')[0]);
              return aptHour === hour;
            });

            return (
              <div key={hour} className="flex gap-4 border-b border-border py-2">
                <div className="w-16 text-sm text-muted-foreground">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1 min-h-[60px]">
                  {hourAppointments.length > 0 ? (
                    <div className="space-y-1">
                      {hourAppointments.map(apt => (
                        <button
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className={cn(
                            'w-full text-left p-2 rounded-lg border text-sm',
                            statusColors[apt.status]
                          )}
                        >
                          <div className="font-medium">
                            {apt.start_time.slice(0, 5)} - {apt.patient_name || 'Paciente sin nombre'}
                          </div>
                          <div className="text-xs opacity-75">
                            {typeLabels[apt.appointment_type]} • {getDoctorName(apt.doctor_id)}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                      Disponible
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = eachDayOfInterval({
      start: dateRange.start,
      end: dateRange.end,
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const dayAppointments = getAppointmentsForDate(day);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'border rounded-lg p-2 min-h-[200px]',
                isToday && 'border-primary bg-primary/5'
              )}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-muted-foreground">
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className={cn(
                  'text-lg font-medium',
                  isToday && 'text-primary'
                )}>
                  {format(day, 'd')}
                </div>
              </div>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {dayAppointments.map(apt => (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={cn(
                        'w-full text-left p-1 rounded text-xs',
                        statusColors[apt.status]
                      )}
                    >
                      <div className="font-medium truncate">
                        {apt.start_time.slice(0, 5)}
                      </div>
                      <div className="truncate opacity-75">
                        {apt.patient_name || 'Sin nombre'}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    return (
      <div className="flex gap-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          locale={es}
          className="rounded-md border"
          modifiers={{
            hasAppointments: (date) => getAppointmentsForDate(date).length > 0,
          }}
          modifiersClassNames={{
            hasAppointments: 'bg-primary/20 font-bold',
          }}
        />
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">
              Citas del {format(selectedDate, 'dd MMMM yyyy', { locale: es })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              {getAppointmentsForDate(selectedDate).length > 0 ? (
                <div className="space-y-2">
                  {getAppointmentsForDate(selectedDate).map(apt => (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedAppointment(apt)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg border',
                        statusColors[apt.status]
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {apt.patient_name || 'Paciente sin nombre'}
                          </div>
                          <div className="text-sm opacity-75">
                            {apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[apt.status]}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No hay citas para este día
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setSelectedDate(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold ml-2">
            {viewMode === 'day' && format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: es })}
            {viewMode === 'week' && `${format(dateRange.start, 'dd MMM', { locale: es })} - ${format(dateRange.end, 'dd MMM yyyy', { locale: es })}`}
            {viewMode === 'month' && format(selectedDate, 'MMMM yyyy', { locale: es })}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className="rounded-none"
              >
                {mode === 'day' ? 'Día' : mode === 'week' ? 'Semana' : 'Mes'}
              </Button>
            ))}
          </div>
          <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" preventClose>
              <DialogHeader>
                <DialogTitle>Nueva Cita</DialogTitle>
              </DialogHeader>
              <AppointmentForm
                selectedDate={selectedDate}
                onSuccess={() => {
                  setShowNewAppointment(false);
                  queryClient.invalidateQueries({ queryKey: ['appointments'] });
                  toast({ title: 'Cita agendada correctamente' });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Hoy', value: getAppointmentsForDate(new Date()).length, color: 'text-foreground' },
          { label: 'Confirmadas', value: getAppointmentsForDate(new Date()).filter(a => a.status === 'confirmed').length, color: 'text-green-600' },
          { label: 'En Espera', value: getAppointmentsForDate(new Date()).filter(a => a.status === 'waiting').length, color: 'text-yellow-600' },
          { label: 'Completadas', value: getAppointmentsForDate(new Date()).filter(a => a.status === 'completed').length, color: 'text-gray-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar View */}
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {viewMode === 'day' && renderDayView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'month' && renderMonthView()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      {selectedAppointment && (
        <AppointmentDetails
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={() => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      )}
    </div>
  );
}
