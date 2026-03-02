import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useBranch } from '@/hooks/useBranchContext';
import type { PatientTableItem } from '@/components/patients/PatientTable';

interface UsePatientTableDataOptions {
  initialFilter?: 'all' | 'recent' | 'today';
}

interface Branch {
  id: string;
  name: string;
}

export function usePatientTableData(options: UsePatientTableDataOptions = {}) {
  const [patients, setPatients] = useState<PatientTableItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { branchFilter } = useBranch();

  const fetchPatients = useCallback(async () => {
    setLoading(true);

    try {
      // Check corporate setting
      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('corporate_patients_enabled')
        .limit(1)
        .single();

      const isCorporate = settingsData?.corporate_patients_enabled ?? true;

      // Fetch patients - if corporate mode, don't filter by branch
      let query = supabase
        .from('patients')
        .select(`
          id, first_name, last_name, birth_date, gender, 
          phone, mobile, whatsapp, email, is_active, created_at, status,
          branch_id, home_branch_id, is_corporate_patient, current_branch_id
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!isCorporate && branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }

      const { data: patientsData, error: patientsError } = await query;
      if (patientsError) throw patientsError;

      // Fetch sales data for each patient to compute last purchase, total spent, and credit status
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('patient_id, total, balance, next_payment_date, created_at, status')
        .in('status', ['completed', 'partial', 'pending'])
        .order('created_at', { ascending: false });

      if (salesError) {
        console.warn('Could not fetch sales data:', salesError);
      }

      // Create lookup maps
      const salesByPatient = new Map<string, { lastPurchase: string; totalSpent: number; saldoPendiente: number }>();
      const morosoPatients = new Set<string>();
      const saldoPendientePatients = new Set<string>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Process sales data
      salesData?.forEach(sale => {
        if (!sale.patient_id) return;
        const existing = salesByPatient.get(sale.patient_id);
        const balance = sale.balance || 0;
        
        if (!existing) {
          salesByPatient.set(sale.patient_id, {
            lastPurchase: sale.created_at,
            totalSpent: sale.total || 0,
            saldoPendiente: balance > 0 ? balance : 0,
          });
        } else {
          existing.totalSpent += sale.total || 0;
          if (balance > 0) existing.saldoPendiente += balance;
          if (new Date(sale.created_at) > new Date(existing.lastPurchase)) {
            existing.lastPurchase = sale.created_at;
          }
        }

        // Track saldo pendiente
        if (balance > 0 && (sale.status === 'partial' || sale.status === 'pending')) {
          saldoPendientePatients.add(sale.patient_id);
          
          // MOROSO: has balance AND next_payment_date is in the past
          if (sale.next_payment_date) {
            const nextDate = new Date(sale.next_payment_date);
            if (nextDate < today) {
              morosoPatients.add(sale.patient_id);
            }
          }
        }
      });

      // Identify VIPs (top 10% by total spent)
      const allTotals = Array.from(salesByPatient.values())
        .map(s => s.totalSpent)
        .sort((a, b) => b - a);
      const vipThreshold = allTotals.length > 10 
        ? allTotals[Math.floor(allTotals.length * 0.1)] 
        : Infinity;

      // Combine patient data
      const enrichedPatients: PatientTableItem[] = (patientsData || []).map(patient => {
        const salesInfo = salesByPatient.get(patient.id);
        const totalSpent = salesInfo?.totalSpent || 0;
        
        return {
          ...patient,
          last_purchase_date: salesInfo?.lastPurchase || null,
          total_spent: totalSpent,
          saldo_pendiente: salesInfo?.saldoPendiente || 0,
          is_vip: totalSpent >= vipThreshold && vipThreshold !== Infinity,
          is_moroso: morosoPatients.has(patient.id),
          has_saldo_pendiente: saldoPendientePatients.has(patient.id),
        };
      });

      setPatients(enrichedPatients);

      // Fetch branches
      const { data: branchesData } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      setBranches(branchesData || []);

    } catch (error) {
      console.error('Error fetching patient data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de clientes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, branchFilter]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const deletePatient = async (patientId: string): Promise<boolean> => {
    try {
      // Note: actual archiving is done via the PatientDeleteModal using archive_patient RPC
      // This is a fallback that uses the same RPC
      const { error } = await supabase.rpc('archive_patient', {
        p_patient_id: patientId,
        p_reason: 'Archivado desde listado de pacientes',
      });

      if (error) {
        toast({
          title: 'Error',
          description: error.message.includes('Administrador') 
            ? 'Solo los administradores pueden archivar pacientes'
            : 'No se pudo archivar el paciente',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Paciente archivado',
        description: 'El paciente ha sido archivado correctamente',
      });
      
      await fetchPatients();
      return true;
    } catch (error) {
      console.error('Error archiving patient:', error);
      return false;
    }
  };

  const exportPatients = (selectedPatients: PatientTableItem[]) => {
    // Create CSV content
    const headers = ['Nombre', 'Teléfono', 'Email', 'Estado', 'Última Compra', 'Total Gastado'];
    const rows = selectedPatients.map(p => [
      `${p.first_name} ${p.last_name}`,
      p.whatsapp || p.mobile || p.phone || '',
      p.email || '',
      p.is_vip ? 'VIP' : p.is_moroso ? 'Moroso' : 'Activo',
      p.last_purchase_date || 'Nunca',
      p.total_spent?.toFixed(2) || '0.00',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({
      title: 'Exportación completada',
      description: `Se exportaron ${selectedPatients.length} clientes`,
    });
  };

  return {
    patients,
    branches,
    loading,
    refetch: fetchPatients,
    deletePatient,
    exportPatients,
  };
}
