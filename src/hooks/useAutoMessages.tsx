import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type AutoMessageType = 
  | 'order_ready' 
  | 'appointment_reminder' 
  | 'post_sale_followup' 
  | 'birthday_greeting' 
  | 'order_delayed'
  | 'payment_reminder';

export type MessageChannel = 'whatsapp' | 'sms';

export interface AutoMessageTemplate {
  id: string;
  message_type: AutoMessageType;
  channel: MessageChannel;
  name: string;
  template_content: string;
  is_active: boolean;
  trigger_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AutoMessageLog {
  id: string;
  template_id: string | null;
  message_type: AutoMessageType;
  channel: MessageChannel;
  recipient_phone: string;
  recipient_name: string | null;
  patient_id: string | null;
  message_content: string;
  variables_used: Record<string, unknown>;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'cancelled';
  error_message: string | null;
  external_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  reference_type: string | null;
  reference_id: string | null;
}

export const MESSAGE_TYPE_CONFIG: Record<AutoMessageType, { icon: string; label: string; description: string }> = {
  order_ready: { icon: '🔔', label: 'Orden Lista', description: 'Notificación cuando el pedido está listo para recoger' },
  appointment_reminder: { icon: '📅', label: 'Recordatorio Cita', description: 'Recordatorio 24 horas antes de la cita' },
  post_sale_followup: { icon: '⭐', label: 'Seguimiento Post-Venta', description: 'Mensaje de seguimiento 7 días después de la compra' },
  birthday_greeting: { icon: '🎂', label: 'Felicitación Cumpleaños', description: 'Felicitación con cupón de descuento' },
  order_delayed: { icon: '⚠️', label: 'Orden Atrasada', description: 'Disculpa y nuevo tiempo estimado' },
  payment_reminder: { icon: '💰', label: 'Recordatorio de Pago', description: 'Recordatorio periódico de saldo pendiente' },
};

export const TEMPLATE_VARIABLES = [
  { key: '{nombre}', description: 'Nombre del cliente' },
  { key: '{fecha}', description: 'Fecha de la cita o entrega' },
  { key: '{hora}', description: 'Hora de la cita' },
  { key: '{numero_orden}', description: 'Número de la orden' },
  { key: '{producto}', description: 'Producto principal' },
  { key: '{sucursal}', description: 'Nombre de la sucursal' },
  { key: '{doctor}', description: 'Nombre del doctor' },
  { key: '{nueva_fecha}', description: 'Nueva fecha estimada' },
  { key: '{año}', description: 'Año actual' },
  { key: '{saldo_restante}', description: 'Saldo pendiente ($)' },
  { key: '{next_payment_date}', description: 'Fecha del próximo pago' },
  { key: '{telefono_sucursal}', description: 'Teléfono de la sucursal' },
];

export function useAutoMessages() {
  const [templates, setTemplates] = useState<AutoMessageTemplate[]>([]);
  const [logs, setLogs] = useState<AutoMessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('auto_message_templates')
        .select('*')
        .order('message_type', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as unknown as AutoMessageTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las plantillas',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (limit = 100) => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('auto_message_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLogs((data || []) as unknown as AutoMessageLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: { template_content?: string; is_active?: boolean }) => {
    try {
      const { error } = await supabase
        .from('auto_message_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTemplates(prev => 
        prev.map(t => t.id === id ? { ...t, ...updates } : t)
      );

      toast({
        title: 'Plantilla actualizada',
        description: 'Los cambios se guardaron correctamente',
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la plantilla',
        variant: 'destructive',
      });
    }
  }, []);

  const toggleTemplateActive = useCallback(async (id: string, isActive: boolean) => {
    await updateTemplate(id, { is_active: isActive });
  }, [updateTemplate]);

  useEffect(() => {
    fetchTemplates();
    fetchLogs();
  }, [fetchTemplates, fetchLogs]);

  return {
    templates,
    logs,
    loading,
    logsLoading,
    fetchTemplates,
    fetchLogs,
    updateTemplate,
    toggleTemplateActive,
  };
}

// Helper function to replace template variables
export function replaceTemplateVariables(
  template: string, 
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
}
