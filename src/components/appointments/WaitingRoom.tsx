import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, Clock, Play, CheckCircle, Bell, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface WaitingRoomEntry {
  id: string;
  appointment_id: string;
  branch_id: string | null;
  patient_id: string | null;
  patient_name: string;
  checked_in_at: string;
  called_at: string | null;
  priority: number;
  notes: string | null;
  status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  waiting: 'En Espera',
  called: 'Llamado',
  in_consultation: 'En Consulta',
  completed: 'Completado',
};

const statusColors: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-800',
  called: 'bg-blue-100 text-blue-800',
  in_consultation: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
};

export function WaitingRoom() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch waiting room entries
  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['waiting-room'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waiting_room')
        .select('*')
        .in('status', ['waiting', 'called', 'in_consultation'])
        .order('priority', { ascending: false })
        .order('checked_in_at', { ascending: true });
      
      if (error) throw error;
      return data as WaitingRoomEntry[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('waiting-room-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiting_room',
        },
        (payload: RealtimePostgresChangesPayload<WaitingRoomEntry>) => {
          console.log('Waiting room change:', payload);
          queryClient.invalidateQueries({ queryKey: ['waiting-room'] });
          
          if (payload.eventType === 'INSERT') {
            const newEntry = payload.new as WaitingRoomEntry;
            toast({
              title: 'Nuevo paciente en espera',
              description: `${newEntry.patient_name} ha llegado`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // Call patient mutation
  const callPatient = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('waiting_room')
        .update({ status: 'called', called_at: new Date().toISOString() })
        .eq('id', entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Paciente llamado' });
      queryClient.invalidateQueries({ queryKey: ['waiting-room'] });
    },
  });

  // Start consultation mutation
  const startConsultation = useMutation({
    mutationFn: async (entry: WaitingRoomEntry) => {
      // Update waiting room
      const { error: waitingError } = await supabase
        .from('waiting_room')
        .update({ status: 'in_consultation' })
        .eq('id', entry.id);
      
      if (waitingError) throw waitingError;

      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', entry.appointment_id);
      
      if (appointmentError) throw appointmentError;
    },
    onSuccess: () => {
      toast({ title: 'Consulta iniciada' });
      queryClient.invalidateQueries({ queryKey: ['waiting-room'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  // Complete consultation mutation
  const completeConsultation = useMutation({
    mutationFn: async (entry: WaitingRoomEntry) => {
      // Update waiting room
      const { error: waitingError } = await supabase
        .from('waiting_room')
        .update({ status: 'completed' })
        .eq('id', entry.id);
      
      if (waitingError) throw waitingError;

      // Update appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', entry.appointment_id);
      
      if (appointmentError) throw appointmentError;
    },
    onSuccess: () => {
      toast({ title: 'Consulta completada' });
      queryClient.invalidateQueries({ queryKey: ['waiting-room'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const getWaitTime = (checkedInAt: string) => {
    return formatDistanceToNow(new Date(checkedInAt), { locale: es, addSuffix: false });
  };

  const waitingCount = entries.filter(e => e.status === 'waiting').length;
  const inConsultationCount = entries.filter(e => e.status === 'in_consultation').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100">
              <Users className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Espera</p>
              <p className="text-2xl font-bold">{waitingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100">
              <Play className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">En Consulta</p>
              <p className="text-2xl font-bold">{inConsultationCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Última actualización</p>
              <p className="text-lg font-medium">{format(new Date(), 'HH:mm:ss')}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Waiting Room List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Waiting */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-600" />
              Sala de Espera
              {waitingCount > 0 && (
                <Badge variant="secondary">{waitingCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : entries.filter(e => e.status === 'waiting' || e.status === 'called').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pacientes en espera
                </div>
              ) : (
                <div className="space-y-2">
                  {entries
                    .filter(e => e.status === 'waiting' || e.status === 'called')
                    .map((entry, index) => (
                      <div
                        key={entry.id}
                        className={cn(
                          'p-3 rounded-lg border transition-all',
                          entry.status === 'called' && 'border-blue-300 bg-blue-50',
                          entry.priority > 0 && 'border-red-300 bg-red-50'
                        )}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.patient_name}</span>
                              {entry.priority > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  Urgente
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {getWaitTime(entry.checked_in_at)} esperando
                            </div>
                          </div>
                          <Badge className={cn(statusColors[entry.status])}>
                            {statusLabels[entry.status]}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {entry.status === 'waiting' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => callPatient.mutate(entry.id)}
                            >
                              <Bell className="h-3 w-3 mr-1" />
                              Llamar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => startConsultation.mutate(entry)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Pasar a Consulta
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* In Consultation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-purple-600" />
              En Consulta
              {inConsultationCount > 0 && (
                <Badge variant="secondary">{inConsultationCount}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {entries.filter(e => e.status === 'in_consultation').length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay pacientes en consulta
                </div>
              ) : (
                <div className="space-y-2">
                  {entries
                    .filter(e => e.status === 'in_consultation')
                    .map(entry => (
                      <div
                        key={entry.id}
                        className="p-3 rounded-lg border border-purple-300 bg-purple-50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{entry.patient_name}</span>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {entry.called_at && (
                                <>Inició hace {getWaitTime(entry.called_at)}</>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-purple-100 text-purple-800">
                            En Consulta
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => completeConsultation.mutate(entry)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Finalizar Consulta
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
