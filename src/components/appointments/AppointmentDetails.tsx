import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, User, Phone, Mail, Calendar, FileText, CheckCircle, XCircle, UserCheck, Play, Loader2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AppointmentWhatsApp } from './AppointmentWhatsApp';

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

interface AppointmentDetailsProps {
  appointment: Appointment;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  waiting: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
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
  other: 'Otro',
};

const sourceLabels: Record<string, string> = {
  reception: 'Recepción',
  online: 'En Línea',
  phone: 'Teléfono',
};

export function AppointmentDetails({ appointment, open, onClose, onUpdate }: AppointmentDetailsProps) {
  const [cancellationReason, setCancellationReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch doctor info
  const { data: doctor } = useQuery({
    queryKey: ['doctor', appointment.doctor_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', appointment.doctor_id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: async ({ status, extras }: { status: string; extras?: Record<string, any> }) => {
      const updates: Record<string, any> = { status };
      
      if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
      if (status === 'waiting') updates.checked_in_at = new Date().toISOString();
      if (status === 'in_progress') updates.started_at = new Date().toISOString();
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      if (status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
        updates.cancellation_reason = extras?.reason || null;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointment.id);
      
      if (error) throw error;

      // If checking in, add to waiting room
      if (status === 'waiting') {
        const { error: waitingError } = await supabase.from('waiting_room').insert({
          appointment_id: appointment.id,
          branch_id: appointment.branch_id,
          patient_id: appointment.patient_id,
          patient_name: appointment.patient_name || 'Paciente',
          status: 'waiting',
        });
        if (waitingError) console.error('Error adding to waiting room:', waitingError);
      }

      // Update waiting room status if starting consultation
      if (status === 'in_progress') {
        await supabase
          .from('waiting_room')
          .update({ status: 'in_consultation', called_at: new Date().toISOString() })
          .eq('appointment_id', appointment.id);
      }

      // Remove from waiting room if completed
      if (status === 'completed') {
        await supabase
          .from('waiting_room')
          .update({ status: 'completed' })
          .eq('appointment_id', appointment.id);
      }
    },
    onSuccess: () => {
      toast({ title: 'Estado actualizado' });
      onUpdate();
      queryClient.invalidateQueries({ queryKey: ['waiting-room'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'cancelled') return; // Handle separately with reason
    updateStatus.mutate({ status: newStatus });
  };

  const handleCancel = () => {
    updateStatus.mutate({ 
      status: 'cancelled', 
      extras: { reason: cancellationReason } 
    });
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (appointment.status === 'scheduled') {
      actions.push(
        <Button key="confirm" onClick={() => handleStatusChange('confirmed')} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          Confirmar
        </Button>
      );
    }
    
    if (appointment.status === 'scheduled' || appointment.status === 'confirmed') {
      actions.push(
        <Button key="checkin" variant="outline" onClick={() => handleStatusChange('waiting')} className="gap-2">
          <UserCheck className="h-4 w-4" />
          Registrar Llegada
        </Button>
      );
    }
    
    if (appointment.status === 'waiting') {
      actions.push(
        <Button key="start" onClick={() => handleStatusChange('in_progress')} className="gap-2">
          <Play className="h-4 w-4" />
          Iniciar Consulta
        </Button>
      );
    }
    
    if (appointment.status === 'in_progress') {
      actions.push(
        <Button key="complete" onClick={() => handleStatusChange('completed')} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          Completar
        </Button>
      );
    }

    if (!['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
      actions.push(
        <AlertDialog key="cancel">
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancelar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Cita</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Está seguro de cancelar esta cita? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="reason">Motivo de cancelación</Label>
              <Textarea
                id="reason"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Ingrese el motivo de la cancelación..."
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>
                Confirmar Cancelación
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }

    return actions;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalles de la Cita</DialogTitle>
            <Badge className={cn(statusColors[appointment.status])}>
              {statusLabels[appointment.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient Info */}
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Paciente
            </h3>
            <div className="pl-6 space-y-1 text-sm">
              <p className="font-medium">{appointment.patient_name || 'Sin nombre'}</p>
              {appointment.patient_phone && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {appointment.patient_phone}
                </p>
              )}
              {appointment.patient_email && (
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {appointment.patient_email}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Appointment Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-3 w-3" />
                Fecha
              </div>
              <p className="font-medium">
                {format(new Date(appointment.appointment_date), 'PPP', { locale: es })}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                Hora
              </div>
              <p className="font-medium">
                {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <User className="h-3 w-3" />
                Doctor
              </div>
              <p className="font-medium">{doctor?.full_name || 'No asignado'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileText className="h-3 w-3" />
                Tipo
              </div>
              <p className="font-medium">{typeLabels[appointment.appointment_type]}</p>
            </div>
          </div>

          <Separator />

          {/* WhatsApp Actions */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Contactar por WhatsApp
            </h4>
            <AppointmentWhatsApp
              appointmentId={appointment.id}
              patientName={appointment.patient_name}
              patientPhone={appointment.patient_phone}
              patientId={appointment.patient_id}
              appointmentDate={appointment.appointment_date}
              startTime={appointment.start_time}
              doctorId={appointment.doctor_id}
              branchId={appointment.branch_id}
            />
          </div>

          <Separator />

          {/* Reason & Notes */}
          {appointment.reason && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Motivo</h4>
              <p className="text-sm">{appointment.reason}</p>
            </div>
          )}

          {appointment.notes && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Notas</h4>
              <p className="text-sm">{appointment.notes}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Origen: {sourceLabels[appointment.booking_source]}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {updateStatus.isPending ? (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Actualizando...
            </Button>
          ) : (
            getQuickActions()
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
