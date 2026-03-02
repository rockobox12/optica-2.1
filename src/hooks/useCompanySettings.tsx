import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showPromise } from '@/lib/toast-utils';

export interface CompanySettings {
  id: string;
  logo_url: string | null;
  company_name: string;
  slogan: string | null;
  rfc: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  currency: string;
  date_format: string;
  timezone: string;
  language: string;
  tax_rate: number;
  printer_paper_size: string;
  printer_density: string;
  printer_speed: string;
  otp_security_phone: string | null;
  corporate_patients_enabled: boolean;
  cross_branch_payments_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSettings(data);
    } catch (error) {
      console.error('Error fetching company settings:', error);
      showError('Error al cargar la configuración de la empresa');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (updates: Partial<CompanySettings>) => {
    if (!settings?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      showSuccess('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error updating company settings:', error);
      showError('Error al guardar la configuración');
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [settings?.id]);

  const uploadLogo = useCallback(async (file: File) => {
    if (!settings?.id) return null;

    // Validate file
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

    if (file.size > maxSize) {
      showError('El archivo es muy grande (máx 2MB)');
      return null;
    }

    if (!allowedTypes.includes(file.type)) {
      showError('Formato no permitido. Use PNG, JPG o SVG');
      return null;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `logo_${settings.id}.${fileExt}`;

    try {
      // Delete previous logo if exists
      if (settings.logo_url) {
        const oldFileName = settings.logo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('company-logos')
            .remove([oldFileName]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update settings
      await updateSettings({ logo_url: publicUrl });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      showError('Error al subir el logo');
      return null;
    }
  }, [settings, updateSettings]);

  const deleteLogo = useCallback(async () => {
    if (!settings?.id || !settings.logo_url) return;

    try {
      const fileName = settings.logo_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('company-logos')
          .remove([fileName]);
      }

      await updateSettings({ logo_url: null });
      showSuccess('Logo eliminado');
    } catch (error) {
      console.error('Error deleting logo:', error);
      showError('Error al eliminar el logo');
    }
  }, [settings, updateSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    updateSettings,
    uploadLogo,
    deleteLogo,
    refetch: fetchSettings,
  };
}
