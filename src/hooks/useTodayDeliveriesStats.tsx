import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranchContext';
import { format, startOfDay, differenceInHours } from 'date-fns';

interface LabOrderInfo {
  id: string;
  order_number: string;
  status: string;
  location: string;
}

interface DeliveryAppointment {
  id: string;
  patient_name: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  lab_order_id: string | null;
  lab_orders?: LabOrderInfo | null;
}

type TrafficLight = 'green' | 'yellow' | 'red';

function calculateTrafficLight(delivery: DeliveryAppointment, now: Date): TrafficLight {
  const labOrder = delivery.lab_orders;
  const deliveryDateTime = new Date(`${delivery.appointment_date}T${delivery.start_time}`);
  const hoursUntilDelivery = differenceInHours(deliveryDateTime, now);
  
  // RED conditions
  if (labOrder) {
    if (labOrder.location === 'EN_LABORATORIO') {
      return 'red';
    }
    if (labOrder.status === 'RETRABAJO') {
      return 'red';
    }
  }
  
  // YELLOW conditions
  if (labOrder) {
    if (labOrder.location === 'EN_OPTICA' && labOrder.status !== 'LISTO_PARA_ENTREGA') {
      return 'yellow';
    }
  }
  
  if (hoursUntilDelivery <= 2 && hoursUntilDelivery > 0 && delivery.status !== 'confirmed') {
    return 'yellow';
  }
  
  if (delivery.status === 'scheduled' && hoursUntilDelivery <= 4) {
    return 'yellow';
  }
  
  // GREEN conditions
  return 'green';
}

export function useTodayDeliveriesStats() {
  const { hasAnyRole } = useAuth();
  const { branchFilter } = useBranch();
  const canSeeDeliveries = hasAnyRole(['admin', 'doctor', 'asistente']);
  
  const today = startOfDay(new Date());
  const now = new Date();

  const { data, isLoading } = useQuery({
    queryKey: ['today-deliveries-stats', branchFilter],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          patient_name,
          appointment_date,
          start_time,
          status,
          lab_order_id,
          lab_orders:lab_order_id(id, order_number, status, location)
        `)
        .eq('appointment_type', 'delivery')
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .not('status', 'in', '("completed","cancelled")');

      if (branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DeliveryAppointment[];
    },
    enabled: canSeeDeliveries,
    refetchInterval: 60000, // Every minute
  });

  const deliveries = data || [];
  
  // Calculate stats
  const stats = deliveries.reduce(
    (acc, delivery) => {
      const color = calculateTrafficLight(delivery, now);
      acc[color]++;
      acc.total++;
      return acc;
    },
    { total: 0, red: 0, yellow: 0, green: 0 }
  );

  return {
    stats,
    isLoading,
    canSeeDeliveries,
  };
}
