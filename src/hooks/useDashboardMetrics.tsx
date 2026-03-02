import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBranch } from '@/hooks/useBranchContext';

export interface DashboardMetrics {
  salesToday: number;
  salesYesterday: number;
  salesChangePercent: number | null;
  clientsToday: number;
  newClientsToday: number;
  pendingOrders: number;
  readyForDelivery: number;
  examsToday: number;
  loading: boolean;
}

export function useDashboardMetrics(): DashboardMetrics {
  const { activeBranchId } = useBranch();
  const [metrics, setMetrics] = useState<Omit<DashboardMetrics, 'loading'>>({
    salesToday: 0,
    salesYesterday: 0,
    salesChangePercent: null,
    clientsToday: 0,
    newClientsToday: 0,
    pendingOrders: 0,
    readyForDelivery: 0,
    examsToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        setLoading(true);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const startOfYesterday = yesterday.toISOString();
        const endOfYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999).toISOString();

        const branchFilter = activeBranchId && activeBranchId !== 'all' ? activeBranchId : null;

        // Build queries
        let salesTodayQ = supabase.from('sales').select('total, patient_id').gte('created_at', startOfToday).lte('created_at', endOfToday);
        let salesYesterdayQ = supabase.from('sales').select('total').gte('created_at', startOfYesterday).lte('created_at', endOfYesterday);
        let pendingOrdersQ = supabase.from('lab_orders').select('id, status').in('status', ['pending', 'in_progress', 'ready']);
        let examsQ = supabase.from('appointments').select('id').eq('appointment_type', 'exam').gte('appointment_date', startOfToday.split('T')[0]).lte('appointment_date', startOfToday.split('T')[0]);

        if (branchFilter) {
          salesTodayQ = salesTodayQ.eq('branch_id', branchFilter);
          salesYesterdayQ = salesYesterdayQ.eq('branch_id', branchFilter);
          pendingOrdersQ = pendingOrdersQ.eq('branch_id', branchFilter);
          examsQ = examsQ.eq('branch_id', branchFilter);
        }

        const [salesTodayRes, salesYesterdayRes, pendingRes, examsRes] = await Promise.all([
          salesTodayQ,
          salesYesterdayQ,
          pendingOrdersQ,
          examsQ,
        ]);

        // Sales today
        const todaySales = salesTodayRes.data || [];
        const salesToday = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);

        // Sales yesterday
        const yesterdaySales = salesYesterdayRes.data || [];
        const salesYesterday = yesterdaySales.reduce((sum, s) => sum + (s.total || 0), 0);

        // % change
        const salesChangePercent = salesYesterday > 0
          ? ((salesToday - salesYesterday) / salesYesterday) * 100
          : salesToday > 0 ? 100 : null;

        // Clients today (distinct patient_id from sales)
        const uniquePatients = new Set(todaySales.filter(s => s.patient_id).map(s => s.patient_id));
        const clientsToday = uniquePatients.size;

        // New clients
        let newClientsToday = 0;
        if (uniquePatients.size > 0) {
          const { data: patientsData } = await supabase
            .from('patients')
            .select('id, created_at')
            .in('id', Array.from(uniquePatients));
          newClientsToday = (patientsData || []).filter(p => {
            const c = new Date(p.created_at);
            return c >= new Date(startOfToday) && c <= new Date(endOfToday);
          }).length;
        }

        // Pending orders
        const orders = pendingRes.data || [];
        const pendingOrders = orders.length;
        const readyForDelivery = orders.filter(o => o.status === 'ready').length;

        // Exams today
        const examsToday = examsRes.data?.length || 0;

        setMetrics({
          salesToday,
          salesYesterday,
          salesChangePercent,
          clientsToday,
          newClientsToday,
          pendingOrders,
          readyForDelivery,
          examsToday,
        });
      } catch (err) {
        console.error('[useDashboardMetrics] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [activeBranchId]);

  return { ...metrics, loading };
}
