import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/lib/toast-utils';

export interface Branch {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  colony: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  email: string | null;
  manager: string | null;
  is_active: boolean;
  is_main: boolean;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
}

export type BranchFormData = Omit<Branch, 'id' | 'created_at' | 'updated_at'>;

export function useBranchManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchBranches = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('is_main', { ascending: false })
        .order('name');

      if (error) throw error;

      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
      showError('Error al cargar las sucursales');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateBranchCode = useCallback(async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_branch_code');
    if (error) {
      console.error('Error generating branch code:', error);
      return `SUC${String(branches.length + 1).padStart(3, '0')}`;
    }
    return data;
  }, [branches.length]);

  const createBranch = useCallback(async (branchData: Partial<BranchFormData>) => {
    setIsSaving(true);
    try {
      // Generate code if not provided
      const dataToInsert = { ...branchData };
      if (!dataToInsert.code) {
        dataToInsert.code = await generateBranchCode();
      }

      // Check if code already exists
      const { data: existing } = await supabase
        .from('branches')
        .select('id')
        .eq('code', dataToInsert.code)
        .single();

      if (existing) {
        showError('El código de sucursal ya existe');
        return null;
      }

      const { data, error } = await supabase
        .from('branches')
        .insert({
          name: dataToInsert.name || 'Nueva Sucursal',
          code: dataToInsert.code,
          address: dataToInsert.address,
          colony: dataToInsert.colony,
          city: dataToInsert.city,
          state: dataToInsert.state,
          zip_code: dataToInsert.zip_code,
          phone: dataToInsert.phone,
          email: dataToInsert.email,
          manager: dataToInsert.manager,
          is_active: dataToInsert.is_active ?? true,
          is_main: dataToInsert.is_main ?? false,
          whatsapp_number: dataToInsert.whatsapp_number,
        })
        .select()
        .single();

      if (error) throw error;

      setBranches(prev => [...prev, data]);
      showSuccess('Sucursal creada exitosamente');
      return data;
    } catch (error) {
      console.error('Error creating branch:', error);
      showError('Error al crear la sucursal');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [generateBranchCode]);

  const updateBranch = useCallback(async (id: string, updates: Partial<BranchFormData>) => {
    setIsSaving(true);
    try {
      // If updating code, check uniqueness
      if (updates.code) {
        const { data: existing } = await supabase
          .from('branches')
          .select('id')
          .eq('code', updates.code)
          .neq('id', id)
          .single();

        if (existing) {
          showError('El código de sucursal ya existe');
          return null;
        }
      }

      const { data, error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setBranches(prev => prev.map(b => b.id === id ? data : b));
      showSuccess('Sucursal actualizada exitosamente');
      return data;
    } catch (error) {
      console.error('Error updating branch:', error);
      showError('Error al actualizar la sucursal');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteBranch = useCallback(async (id: string) => {
    const branch = branches.find(b => b.id === id);
    if (!branch) return false;

    // Check if it's the main branch
    if (branch.is_main) {
      showError('No se puede eliminar la sucursal principal');
      return false;
    }

    // Check minimum branches requirement
    const activeBranches = branches.filter(b => b.is_active);
    if (activeBranches.length <= 1 && branch.is_active) {
      showError('Debe haber al menos una sucursal activa');
      return false;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBranches(prev => prev.filter(b => b.id !== id));
      showSuccess('Sucursal eliminada exitosamente');
      return true;
    } catch (error) {
      console.error('Error deleting branch:', error);
      showError('Error al eliminar la sucursal. Puede tener datos asociados.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [branches]);

  const setMainBranch = useCallback(async (id: string) => {
    return updateBranch(id, { is_main: true });
  }, [updateBranch]);

  const toggleBranchStatus = useCallback(async (id: string, isActive: boolean) => {
    const branch = branches.find(b => b.id === id);
    if (!branch) return null;

    // Cannot deactivate main branch
    if (branch.is_main && !isActive) {
      showError('No se puede desactivar la sucursal principal');
      return null;
    }

    // Check minimum active branches
    const activeBranches = branches.filter(b => b.is_active);
    if (activeBranches.length <= 1 && !isActive && branch.is_active) {
      showError('Debe haber al menos una sucursal activa');
      return null;
    }

    return updateBranch(id, { is_active: isActive });
  }, [branches, updateBranch]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  return {
    branches,
    isLoading,
    isSaving,
    createBranch,
    updateBranch,
    deleteBranch,
    setMainBranch,
    toggleBranchStatus,
    generateBranchCode,
    refetch: fetchBranches,
  };
}
