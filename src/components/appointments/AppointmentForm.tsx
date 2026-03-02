import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MaskedDateInput, MaskedTimeInput } from '@/components/ui/MaskedDateInput';
import { motion, AnimatePresence } from 'framer-motion';

const formSchema = z.object({
  patient_id: z.string().optional(),
  patient_name: z.string().min(1, 'Nombre del paciente requerido'),
  patient_phone: z.string().optional(),
  patient_email: z.string().email().optional().or(z.literal('')),
  doctor_id: z.string().min(1, 'Seleccione un doctor'),
  appointment_date: z.string().min(1, 'Seleccione una fecha'),
  start_time: z.string().min(1, 'Seleccione hora de inicio'),
  end_time: z.string().min(1, 'Seleccione hora de fin'),
  appointment_type: z.enum(['exam', 'follow_up', 'contact_lens', 'emergency', 'delivery', 'other']),
  reason: z.string().optional(),
  notes: z.string().optional(),
  booking_source: z.enum(['reception', 'online', 'phone']),
});

type FormData = z.infer<typeof formSchema>;

interface AppointmentFormProps {
  selectedDate?: Date;
  onSuccess: () => void;
}

export function AppointmentForm({ selectedDate, onSuccess }: AppointmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientOpen, setPatientOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_name: '',
      patient_phone: '',
      patient_email: '',
      doctor_id: '',
      appointment_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      start_time: '',
      end_time: '',
      appointment_type: 'exam',
      reason: '',
      notes: '',
      booking_source: 'reception',
    },
  });

  // Fetch patients for autocomplete
  const { data: patients = [] } = useQuery({
    queryKey: ['patients-search', patientSearch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, phone, email')
        .eq('is_active', true)
        .or(`first_name.ilike.%${patientSearch}%,last_name.ilike.%${patientSearch}%`)
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: patientSearch.length > 1,
  });

  // Fetch doctors
  const { data: doctors = [] } = useQuery({
    queryKey: ['doctors-for-appointment'],
    queryFn: async () => {
      // Get users with doctor role
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


  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        patient_id: data.patient_id || null,
        patient_name: data.patient_name,
        patient_phone: data.patient_phone || null,
        patient_email: data.patient_email || null,
        doctor_id: data.doctor_id,
        branch_id: profile?.defaultBranchId || null,
        appointment_date: data.appointment_date, // Already in ISO format
        start_time: data.start_time,
        end_time: data.end_time,
        appointment_type: data.appointment_type,
        reason: data.reason || null,
        notes: data.notes || null,
        booking_source: data.booking_source,
        booked_by: profile?.userId || null,
        status: 'scheduled',
      });

      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error al agendar cita',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectPatient = (patient: typeof patients[0]) => {
    form.setValue('patient_id', patient.id, { shouldValidate: true });
    form.setValue('patient_name', `${patient.first_name} ${patient.last_name}`, { shouldValidate: true });
    form.setValue('patient_phone', patient.phone || '', { shouldValidate: true });
    form.setValue('patient_email', patient.email || '', { shouldValidate: true });
    setPatientOpen(false);
  };

  const { formState: { errors, isValid, touchedFields } } = form;

  // Helper for validation icon
  const ValidationIcon = ({ hasError, isFieldValid }: { hasError: boolean; isFieldValid: boolean }) => (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <AnimatePresence mode="wait">
        {hasError && (
          <motion.div
            key="error"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <X className="h-4 w-4 text-destructive" />
          </motion.div>
        )}
        {isFieldValid && (
          <motion.div
            key="success"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Check className="h-4 w-4 text-success" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Patient Selection */}
        <div className="space-y-2">
          <FormLabel>Buscar Paciente Existente</FormLabel>
          <Popover open={patientOpen} onOpenChange={setPatientOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={patientOpen}
                className="w-full justify-between"
              >
                {form.watch('patient_id') ? form.watch('patient_name') : 'Buscar paciente...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Buscar por nombre..."
                  value={patientSearch}
                  onValueChange={setPatientSearch}
                />
                <CommandList>
                  <CommandEmpty>No se encontraron pacientes</CommandEmpty>
                  <CommandGroup>
                    {patients.map((patient) => (
                      <CommandItem
                        key={patient.id}
                        value={patient.id}
                        onSelect={() => selectPatient(patient)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            form.watch('patient_id') === patient.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {patient.first_name} {patient.last_name}
                        {patient.phone && <span className="ml-2 text-muted-foreground text-xs">{patient.phone}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground">
            O ingrese los datos del paciente manualmente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patient_name"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className={cn(fieldState.error && fieldState.isTouched && 'text-destructive')}>
                  Nombre del Paciente <span className="text-destructive">*</span>
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Nombre completo"
                      className={cn(
                        'pr-10 transition-all duration-200',
                        fieldState.error && fieldState.isTouched && 'border-destructive',
                        !fieldState.error && field.value && fieldState.isTouched && 'border-success'
                      )}
                    />
                  </FormControl>
                  <ValidationIcon 
                    hasError={!!fieldState.error && fieldState.isTouched} 
                    isFieldValid={!fieldState.error && !!field.value && fieldState.isTouched}
                  />
                </div>
                <AnimatePresence>
                  {fieldState.error && fieldState.isTouched && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <FormMessage />
                    </motion.div>
                  )}
                </AnimatePresence>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patient_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Teléfono de contacto" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="patient_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="correo@ejemplo.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="doctor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doctor *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar doctor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.user_id} value={doctor.user_id}>
                        {doctor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="appointment_date"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <MaskedDateInput
                    value={field.value}
                    onChange={field.onChange}
                    label="Fecha *"
                    mode="appointment"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="appointment_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Cita *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="exam">Examen Visual</SelectItem>
                    <SelectItem value="follow_up">Seguimiento</SelectItem>
                    <SelectItem value="contact_lens">Lentes de Contacto</SelectItem>
                    <SelectItem value="emergency">Urgencia</SelectItem>
                    <SelectItem value="delivery">Entrega de Productos</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <MaskedTimeInput
                    value={field.value}
                    onChange={field.onChange}
                    label="Hora Inicio *"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <MaskedTimeInput
                    value={field.value}
                    onChange={field.onChange}
                    label="Hora Fin *"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="booking_source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origen</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="reception">Recepción</SelectItem>
                    <SelectItem value="online">En Línea</SelectItem>
                    <SelectItem value="phone">Teléfono</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo de la Consulta</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Describa el motivo de la cita" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Internas</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Notas adicionales (solo visibles para el personal)" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button 
            type="submit" 
            disabled={isSubmitting || !isValid}
            className={cn(
              'transition-all duration-200',
              !isValid && 'opacity-70'
            )}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar Cita
          </Button>
        </div>
      </form>
    </Form>
  );
}
