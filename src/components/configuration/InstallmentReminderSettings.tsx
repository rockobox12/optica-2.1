import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { CalendarClock, Info, Save } from 'lucide-react';

interface InstallmentReminderConfig {
  id: string;
  is_enabled: boolean;
  days_before_due: number;
  days_after_due: number;
  overdue_repeat_interval_days: number;
  send_hour: number;
  min_hour: number;
  max_hour: number;
  max_per_patient_per_week: number;
  template_before: string;
  template_overdue: string;
}

const VARIABLES = [
  { key: '{nombre}', desc: 'Nombre del paciente' },
  { key: '{fecha}', desc: 'Fecha del pago' },
  { key: '{monto}', desc: 'Monto de la cuota' },
  { key: '{saldo}', desc: 'Saldo pendiente total' },
  { key: '{sucursal}', desc: 'Nombre de sucursal' },
  { key: '{telefono_sucursal}', desc: 'Teléfono sucursal' },
  { key: '{folio_venta}', desc: 'Folio de venta' },
];

export function InstallmentReminderSettings() {
  const [settings, setSettings] = useState<InstallmentReminderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('installment_reminder_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setSettings(data as unknown as InstallmentReminderConfig);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('installment_reminder_settings')
        .update({
          is_enabled: settings.is_enabled,
          days_before_due: settings.days_before_due,
          days_after_due: settings.days_after_due,
          overdue_repeat_interval_days: settings.overdue_repeat_interval_days,
          send_hour: settings.send_hour,
          min_hour: settings.min_hour,
          max_hour: settings.max_hour,
          max_per_patient_per_week: settings.max_per_patient_per_week,
          template_before: settings.template_before,
          template_overdue: settings.template_overdue,
        })
        .eq('id', settings.id);
      if (error) throw error;
      toast({ title: 'Guardado', description: 'Configuración de recordatorios por cuota actualizada.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const updateField = <K extends keyof InstallmentReminderConfig>(key: K, value: InstallmentReminderConfig[K]) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Recordatorios por Plan de Pago
        </CardTitle>
        <CardDescription>
          Envía recordatorios automáticos basados en el calendario de cuotas del plan de pago
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Activar recordatorios por cuota</Label>
            <p className="text-sm text-muted-foreground">
              Busca cuotas próximas y vencidas del plan de pagos para enviar recordatorios
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.is_enabled ? 'default' : 'secondary'}>
              {settings.is_enabled ? 'Activo' : 'Inactivo'}
            </Badge>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(v) => updateField('is_enabled', v)}
            />
          </div>
        </div>

        {settings.is_enabled && (
          <>
            {/* Timing */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Días antes del pago</Label>
                <Input
                  type="number" min={0} max={7}
                  value={settings.days_before_due}
                  onChange={(e) => updateField('days_before_due', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Días después (vencido)</Label>
                <Input
                  type="number" min={0} max={7}
                  value={settings.days_after_due}
                  onChange={(e) => updateField('days_after_due', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Repetir vencido cada (días)</Label>
                <Input
                  type="number" min={1} max={90}
                  value={settings.overdue_repeat_interval_days}
                  onChange={(e) => updateField('overdue_repeat_interval_days', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Hours & limits */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Hora mínima envío</Label>
                <Input
                  type="number" min={6} max={21}
                  value={settings.min_hour}
                  onChange={(e) => updateField('min_hour', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora máxima envío</Label>
                <Input
                  type="number" min={6} max={23}
                  value={settings.max_hour}
                  onChange={(e) => updateField('max_hour', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Máx. por paciente/semana</Label>
                <Input
                  type="number" min={1} max={10}
                  value={settings.max_per_patient_per_week}
                  onChange={(e) => updateField('max_per_patient_per_week', Number(e.target.value))}
                />
              </div>
            </div>

            {/* Template: Before */}
            <div className="space-y-2">
              <Label>Plantilla: Recordatorio Previo</Label>
              <Textarea
                value={settings.template_before}
                onChange={(e) => updateField('template_before', e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Template: Overdue */}
            <div className="space-y-2">
              <Label>Plantilla: Pago Vencido</Label>
              <Textarea
                value={settings.template_overdue}
                onChange={(e) => updateField('template_overdue', e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Variables */}
            <div className="flex flex-wrap gap-1">
              {VARIABLES.map(v => (
                <Badge key={v.key} variant="outline" className="text-xs cursor-help" title={v.desc}>
                  {v.key}
                </Badge>
              ))}
            </div>

            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Los recordatorios se envían diariamente a las 10:00 AM. Si Twilio no está configurado, se generan como enlaces wa.me manuales. Se respeta el opt-in de WhatsApp del paciente.
              </AlertDescription>
            </Alert>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </CardContent>
    </Card>
  );
}
