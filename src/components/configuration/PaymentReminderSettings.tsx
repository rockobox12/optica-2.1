import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { BellRing, Info, Save } from 'lucide-react';

interface ReminderSettings {
  id: string;
  is_enabled: boolean;
  mode: string;
  interval_days: number;
  template_content: string;
  send_hour: number;
  max_daily_per_patient: number;
}

export function PaymentReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase
      .from('payment_reminder_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (data) setSettings(data as ReminderSettings);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_reminder_settings')
        .update({
          is_enabled: settings.is_enabled,
          mode: settings.mode,
          interval_days: settings.interval_days,
          template_content: settings.template_content,
          send_hour: settings.send_hour,
          max_daily_per_patient: settings.max_daily_per_patient,
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast({ title: 'Guardado', description: 'Configuración de recordatorios actualizada.' });
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

  const VARIABLES = [
    { key: '{nombre}', desc: 'Nombre del paciente' },
    { key: '{saldo_restante}', desc: 'Saldo pendiente ($)' },
    { key: '{next_payment_date}', desc: 'Fecha próximo pago' },
    { key: '{sucursal}', desc: 'Nombre de sucursal' },
    { key: '{telefono_sucursal}', desc: 'Teléfono de sucursal' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-primary" />
          Recordatorios de Pago
        </CardTitle>
        <CardDescription>
          Envía recordatorios automáticos por WhatsApp a pacientes con saldo pendiente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Activar recordatorios automáticos</Label>
            <p className="text-sm text-muted-foreground">
              Busca pacientes con saldo pendiente y envía recordatorios periódicos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.is_enabled ? 'default' : 'secondary'}>
              {settings.is_enabled ? 'Activo' : 'Inactivo'}
            </Badge>
            <Switch
              checked={settings.is_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, is_enabled: v })}
            />
          </div>
        </div>

        {settings.is_enabled && (
          <>
            {/* Mode */}
            <div className="space-y-2">
              <Label>Modo de envío</Label>
              <Select value={settings.mode} onValueChange={(v) => setSettings({ ...settings, mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual (solo sugerencias en Dashboard)</SelectItem>
                  <SelectItem value="manual_approval">Automático con aprobación</SelectItem>
                  <SelectItem value="automatic">Automático (envío directo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interval */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Intervalo (días sin pago)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={settings.interval_days}
                  onChange={(e) => setSettings({ ...settings, interval_days: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Hora de envío</Label>
                <Input
                  type="number"
                  min={8}
                  max={21}
                  value={settings.send_hour}
                  onChange={(e) => setSettings({ ...settings, send_hour: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Entre 08:00 y 21:00</p>
              </div>
            </div>

            {/* Max daily */}
            <div className="space-y-2">
              <Label>Máximo de mensajes por paciente por día</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings.max_daily_per_patient}
                onChange={(e) => setSettings({ ...settings, max_daily_per_patient: Number(e.target.value) })}
              />
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Plantilla del mensaje</Label>
              <Textarea
                value={settings.template_content}
                onChange={(e) => setSettings({ ...settings, template_content: e.target.value })}
                className="min-h-[120px]"
              />
              <div className="flex flex-wrap gap-1">
                {VARIABLES.map(v => (
                  <Badge key={v.key} variant="outline" className="text-xs cursor-help" title={v.desc}>
                    {v.key}
                  </Badge>
                ))}
              </div>
            </div>

            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Si WhatsApp Business API / Twilio no está configurado, los recordatorios se mostrarán como sugerencias manuales con enlace wa.me.
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
