import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function useDeliveryAlerts() {
  const { toast } = useToast();
  const { profile, hasAnyRole } = useAuth();
  const canSeeDeliveries = hasAnyRole(['admin', 'doctor', 'asistente']);

  const today = startOfDay(new Date());

  const { data: todayDeliveries = [] } = useQuery({
    queryKey: ['today-deliveries-alert', profile?.defaultBranchId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('id, patient_name, start_time')
        .eq('appointment_type', 'delivery')
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .not('status', 'in', '("completed","cancelled","no_show")');

      if (profile?.defaultBranchId) {
        query = query.eq('branch_id', profile.defaultBranchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: canSeeDeliveries,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Show toast on first load if there are deliveries today
  useEffect(() => {
    if (todayDeliveries.length > 0 && canSeeDeliveries) {
      const hasShownToday = sessionStorage.getItem('delivery_alert_shown');
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      
      if (hasShownToday !== todayKey) {
        toast({
          title: `📦 ${todayDeliveries.length} entrega(s) hoy`,
          description: todayDeliveries.length === 1 
            ? `${todayDeliveries[0].patient_name} a las ${todayDeliveries[0].start_time}`
            : 'Revisa el widget de entregas en el dashboard',
          duration: 5000,
        });
        sessionStorage.setItem('delivery_alert_shown', todayKey);
      }
    }
  }, [todayDeliveries, toast, canSeeDeliveries]);

  return {
    todayCount: todayDeliveries.length,
    todayDeliveries,
    canSeeDeliveries,
  };
}

export function useDeliveryBadgeCount() {
  const { profile, hasAnyRole } = useAuth();
  const canSeeDeliveries = hasAnyRole(['admin', 'doctor', 'asistente']);
  const today = startOfDay(new Date());

  const { data: count = 0 } = useQuery({
    queryKey: ['delivery-badge-count', profile?.defaultBranchId],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('appointment_type', 'delivery')
        .eq('appointment_date', format(today, 'yyyy-MM-dd'))
        .not('status', 'in', '("completed","cancelled","no_show")');

      if (profile?.defaultBranchId) {
        query = query.eq('branch_id', profile.defaultBranchId);
      }

      const { count: deliveryCount, error } = await query;
      if (error) throw error;
      return deliveryCount || 0;
    },
    enabled: canSeeDeliveries,
    refetchInterval: 60000, // Every minute
  });

  return { count, canSeeDeliveries };
}
