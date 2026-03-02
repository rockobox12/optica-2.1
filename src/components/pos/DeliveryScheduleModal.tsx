import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, AlertTriangle, CheckCircle2, Package, CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { parse } from 'date-fns';

const formSchema = z.object({
  delivery_date: z.string().min(1, 'Seleccione una fecha'),
  responsible: z.string().default('OPTICA'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DeliveryScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientPhone?: string | null;
  saleId: string;
  saleNumber: string;
  labOrderId?: string | null;
  branchId?: string | null;
  onSuccess?: () => void;
  // Inherited from sale
  defaultResponsibleType?: string | null;
  defaultResponsibleUserId?: string | null;
  defaultResponsibleName?: string | null;
}

export function DeliveryScheduleModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientPhone,
  saleId,
  saleNumber,
  labOrderId,
  branchId,
  onSuccess,
  defaultResponsibleType,
  defaultResponsibleUserId,
  defaultResponsibleName,
}: DeliveryScheduleModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      delivery_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      responsible: defaultResponsibleType === 'COBRADOR' && defaultResponsibleUserId
        ? defaultResponsibleUserId
        : 'OPTICA',
      notes: '',
    },
  });

  const { confirmClose, UnsavedDialog } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
    enabled: open,
  });

  const handleDeliveryClose = (v: boolean) => {
    if (!v) {
      confirmClose(() => onOpenChange(false));
    }
  };

  // Check lab order status if exists
  const { data: labOrder } = useQuery({
    queryKey: ['lab-order-for-delivery', labOrderId],
    queryFn: async () => {
      if (!labOrderId) return null;
      const { data, error } = await supabase
        .from('lab_orders')
        .select('id, order_number, status, location')
        .eq('id', labOrderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!labOrderId,
  });

  // Fetch cobradores (collectors) for responsible assignment
  const { data: cobradores = [] } = useQuery({
    queryKey: ['cobradores-for-delivery'],
    queryFn: async () => {
      const { data: cobradorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'cobrador');

      if (!cobradorRoles || cobradorRoles.length === 0) return [];

      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, default_branch_id')
        .eq('is_active', true)
        .in('user_id', cobradorRoles.map(r => r.user_id));

      return data || [];
    },
  });

  // Fetch a default doctor for the appointment record (required field)
  const { data: defaultDoctor } = useQuery({
    queryKey: ['default-doctor-for-delivery'],
    queryFn: async () => {
      const { data: doctorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'doctor')
        .limit(1);

      if (!doctorRoles || doctorRoles.length === 0) return null;

      const { data } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('is_active', true)
        .eq('user_id', doctorRoles[0].user_id)
        .single();

      return data;
    },
  });

  const isLabOrderReady = labOrder?.status === 'LISTO_PARA_ENTREGA' || labOrder?.status === 'ENTREGADO';
  const isLabOrderInOptica = labOrder?.location === 'EN_OPTICA';

  const createDelivery = useMutation({
    mutationFn: async (data: FormData) => {
      const isOptica = data.responsible === 'OPTICA';
      const selectedCobrador = !isOptica
        ? cobradores.find(c => c.user_id === data.responsible)
        : null;

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          patient_name: patientName,
          patient_phone: patientPhone || null,
          doctor_id: defaultDoctor?.user_id || profile?.userId,
          branch_id: branchId || profile?.defaultBranchId,
          appointment_date: data.delivery_date,
          start_time: '09:00',
          end_time: '10:00',
          appointment_type: 'delivery' as any,
          reason: `Entrega de productos - Venta ${saleNumber}`,
          notes: data.notes || null,
          booking_source: 'reception',
          booked_by: profile?.userId,
          status: 'scheduled',
          sale_id: saleId,
          lab_order_id: labOrderId || null,
          delivery_responsible_type: isOptica ? 'OPTICA' : 'COBRADOR',
          delivery_responsible_user_id: selectedCobrador?.user_id || null,
          delivery_responsible_name_snapshot: isOptica
            ? 'Óptica Istmeña'
            : selectedCobrador?.full_name || null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return appointment;
    },
    onSuccess: () => {
      toast({
        title: 'Entrega agendada',
        description: `Se agendó la entrega para ${format(form.getValues('delivery_date'), 'PPP', { locale: es })}`,
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: 'Error al agendar entrega',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createDelivery.mutate(data);
  };

  return (
    <>
    <UnsavedDialog />
    <Dialog open={open} onOpenChange={handleDeliveryClose}>
      <DialogContent className="max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Agendar Entrega
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sale info */}
          <div className="p-3 bg-muted rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Venta:</span>
              <Badge variant="outline">{saleNumber}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paciente:</span>
              <span className="font-medium text-sm">{patientName}</span>
            </div>
            {patientPhone && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teléfono:</span>
                <span className="text-sm">{patientPhone}</span>
              </div>
            )}
          </div>

          {/* Lab order warning if exists but not ready */}
          {labOrder && !isLabOrderReady && (
            <Alert variant="destructive" className="border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning-foreground">
                La orden de laboratorio ({labOrder.order_number}) aún no está lista.
                <br />
                <span className="text-xs">
                  Estado: {labOrder.status} | Ubicación: {labOrder.location || 'No especificada'}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {labOrder && isLabOrderReady && isLabOrderInOptica && (
            <Alert className="border-primary/30 bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                ¡Listo para entregar! La orden {labOrder.order_number} está en óptica.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="delivery_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Entrega *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value
                              ? format(parse(field.value, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')
                              : <span>Seleccionar fecha</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-[9999]" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? parse(field.value, 'yyyy-MM-dd', new Date()) : undefined}
                          onSelect={(date) => {
                            if (date) field.onChange(format(date, 'yyyy-MM-dd'));
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          locale={es}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar responsable" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPTICA">
                          Óptica Istmeña (entrega en mostrador)
                        </SelectItem>
                        {cobradores.map((cobrador) => (
                          <SelectItem key={cobrador.user_id} value={cobrador.user_id}>
                            {cobrador.full_name}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicaciones especiales</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Indicaciones especiales para la entrega..."
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createDelivery.isPending}>
                  {createDelivery.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Agendar Entrega
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
