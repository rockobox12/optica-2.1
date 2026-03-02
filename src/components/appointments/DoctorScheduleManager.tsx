import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Clock, Plus, Trash2, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DoctorSchedule {
  id: string;
  doctor_id: string;
  branch_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function DoctorScheduleManager() {
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '18:00',
    slot_duration: 30,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile, hasAnyRole } = useAuth();
  const isAdmin = hasAnyRole(['admin']);

  // Fetch doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-for-schedule'],
    queryFn: async () => {
      const { data: doctorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'doctor');
      
      if (rolesError) throw rolesError;
      const doctorIds = doctorRoles.map(r => r.user_id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true)
        .in('user_id', doctorIds);
      
      if (error) throw error;
      return data;
    },
  });

  // Set default doctor
  if (!selectedDoctor && doctors.length > 0) {
    const defaultDoctor = isAdmin ? doctors[0].user_id : profile?.userId || doctors[0].user_id;
    setSelectedDoctor(defaultDoctor);
  }

  // Fetch schedules for selected doctor
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['doctor-schedules', selectedDoctor],
    queryFn: async () => {
      if (!selectedDoctor) return [];
      
      const { data, error } = await supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', selectedDoctor)
        .order('day_of_week', { ascending: true });
      
      if (error) throw error;
      return data as DoctorSchedule[];
    },
    enabled: !!selectedDoctor,
  });

  // Add schedule mutation
  const addSchedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('doctor_schedules').insert({
        doctor_id: selectedDoctor,
        branch_id: profile?.defaultBranchId || null,
        day_of_week: newSchedule.day_of_week,
        start_time: newSchedule.start_time,
        end_time: newSchedule.end_time,
        slot_duration: newSchedule.slot_duration,
        is_active: true,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Horario agregado' });
      setShowAddSchedule(false);
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message.includes('duplicate') 
          ? 'Ya existe un horario para este día' 
          : error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle active mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('doctor_schedules')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
    },
  });

  // Delete schedule mutation
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Horario eliminado' });
      queryClient.invalidateQueries({ queryKey: ['doctor-schedules'] });
    },
  });

  const selectedDoctorName = doctors.find(d => d.user_id === selectedDoctor)?.full_name || '';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Horarios de Atención
              </CardTitle>
              <CardDescription>
                Configure los horarios disponibles para cada doctor
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.user_id} value={doctor.user_id}>
                        {doctor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Dialog open={showAddSchedule} onOpenChange={setShowAddSchedule}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Horario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Horario para {selectedDoctorName}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Día de la Semana</Label>
                      <Select
                        value={newSchedule.day_of_week.toString()}
                        onValueChange={(v) => setNewSchedule(prev => ({ ...prev, day_of_week: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dayNames.map((name, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Hora Inicio</Label>
                        <Input
                          type="time"
                          value={newSchedule.start_time}
                          onChange={(e) => setNewSchedule(prev => ({ ...prev, start_time: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Hora Fin</Label>
                        <Input
                          type="time"
                          value={newSchedule.end_time}
                          onChange={(e) => setNewSchedule(prev => ({ ...prev, end_time: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Duración de Cita (minutos)</Label>
                      <Select
                        value={newSchedule.slot_duration.toString()}
                        onValueChange={(v) => setNewSchedule(prev => ({ ...prev, slot_duration: parseInt(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutos</SelectItem>
                          <SelectItem value="20">20 minutos</SelectItem>
                          <SelectItem value="30">30 minutos</SelectItem>
                          <SelectItem value="45">45 minutos</SelectItem>
                          <SelectItem value="60">60 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => addSchedule.mutate()}
                      disabled={addSchedule.isPending}
                    >
                      {addSchedule.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar Horario
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay horarios configurados para este doctor
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Duración Cita</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {dayNames[schedule.day_of_week]}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.slot_duration} min
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={(checked) => 
                            toggleActive.mutate({ id: schedule.id, isActive: checked })
                          }
                        />
                        <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                          {schedule.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSchedule.mutate(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Weekly Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dayNames.map((day, index) => {
              const daySchedule = schedules.find(s => s.day_of_week === index && s.is_active);
              return (
                <div
                  key={day}
                  className={`p-3 rounded-lg border text-center ${
                    daySchedule ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'
                  }`}
                >
                  <div className="font-medium text-sm mb-1">{day.slice(0, 3)}</div>
                  {daySchedule ? (
                    <div className="text-xs text-muted-foreground">
                      {daySchedule.start_time.slice(0, 5)}<br />
                      {daySchedule.end_time.slice(0, 5)}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      No disponible
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
