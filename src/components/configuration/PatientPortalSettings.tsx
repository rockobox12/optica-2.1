import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Smartphone, Eye, Copy, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { generateManualOTP, normalizePhoneMX, findPatientByPhone } from '@/hooks/usePatientPortal';

export function PatientPortalSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testModal, setTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState({
    id: '',
    send_mode: 'manual',
    twilio_enabled: false,
    twilio_account_sid: '',
    twilio_auth_token: '',
    otp_channel: 'whatsapp',
    whatsapp_sender: '',
    sms_sender: '',
    otp_expiry_minutes: 10,
    session_duration_days: 30,
    max_otp_attempts: 5,
    otp_template: 'Tu código de acceso a Óptica Istmeña es: {OTP}. Vigencia: {MIN} minutos.',
    portal_link_template: 'Entra aquí: {LINK} Código: {OTP}. Vigencia: {MIN} minutos.',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from('patient_portal_config')
      .select('*')
      .limit(1)
      .single();
    if (data) {
      const d = data as any;
      setConfig({
        id: d.id,
        send_mode: d.send_mode || 'manual',
        twilio_enabled: d.twilio_enabled || false,
        twilio_account_sid: d.twilio_account_sid || '',
        twilio_auth_token: d.twilio_auth_token || '',
        otp_channel: d.otp_channel || 'whatsapp',
        whatsapp_sender: d.whatsapp_sender || '',
        sms_sender: d.sms_sender || '',
        otp_expiry_minutes: d.otp_expiry_minutes || 10,
        session_duration_days: d.session_duration_days || 30,
        max_otp_attempts: d.max_otp_attempts || 5,
        otp_template: d.otp_template || 'Tu código de acceso a Óptica Istmeña es: {OTP}. Vigencia: {MIN} minutos.',
        portal_link_template: d.portal_link_template || 'Entra aquí: {LINK} Código: {OTP}. Vigencia: {MIN} minutos.',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('patient_portal_config')
        .update({
          send_mode: config.send_mode,
          twilio_enabled: config.twilio_enabled,
          twilio_account_sid: config.twilio_account_sid || null,
          twilio_auth_token: config.twilio_auth_token || null,
          otp_channel: config.otp_channel,
          whatsapp_sender: config.whatsapp_sender || null,
          sms_sender: config.sms_sender || null,
          otp_expiry_minutes: config.otp_expiry_minutes,
          session_duration_days: config.session_duration_days,
          max_otp_attempts: config.max_otp_attempts,
          otp_template: config.otp_template,
          portal_link_template: config.portal_link_template,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', config.id);

      if (error) throw error;
      toast({ title: 'Configuración guardada', description: 'Los cambios del portal se guardaron correctamente' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestOTP = async () => {
    if (!testPhone || testPhone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Error', description: 'Ingresa un número válido de 10 dígitos', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      if (config.send_mode === 'manual') {
        const { e164: phoneE164, plain } = normalizePhoneMX(testPhone);
        const portalUrl = `${window.location.origin}/portal`;

        // Robust patient search
        const patient = await findPatientByPhone(testPhone);
        const patientId = patient?.id || null;

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Build full message with link
        const fullMessage = config.portal_link_template
          .replace('{LINK}', portalUrl)
          .replace('{OTP}', otpCode)
          .replace('{MIN}', String(config.otp_expiry_minutes));
        const whatsappUrl = `https://wa.me/${plain}?text=${encodeURIComponent(fullMessage)}`;

        // Try to save to DB (allow null patient_id for test)
        let dbSaved = false;
        try {
          const { error } = await supabase.from('patient_auth_codes').insert({
            phone_e164: phoneE164,
            patient_id: patientId,
            code: otpCode,
            channel: 'manual',
            expires_at: new Date(Date.now() + config.otp_expiry_minutes * 60 * 1000).toISOString(),
          } as any);
          dbSaved = !error;
        } catch {}

        setTestResult({
          mode: 'manual',
          otp_message: fullMessage,
          whatsapp_url: whatsappUrl,
          otp_code: otpCode,
          portal_url: portalUrl,
          patient_found: !!patientId,
          patient_name: patient ? `${patient.first_name} ${patient.last_name || ''}`.trim() : null,
          db_saved: dbSaved,
        });
      } else {
        // TWILIO: call Edge Function
        const { data, error } = await supabase.functions.invoke('patient-portal-otp', {
          body: { action: 'request_otp', phone: testPhone }
        });
        if (error) throw error;
        setTestResult(data);
      }
    } catch (err: any) {
      toast({ title: 'Error en prueba', description: err.message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Portal del Paciente / OTP
          </CardTitle>
          <CardDescription>
            Configura el acceso al portal de pacientes y el envío de códigos de verificación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Send Mode */}
          <div className="space-y-3">
            <Label>Modo de Envío de Mensajes</Label>
            <Select value={config.send_mode} onValueChange={(v) => setConfig(prev => ({ ...prev, send_mode: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual (WhatsApp link / copiar)</SelectItem>
                <SelectItem value="twilio">Automático con Twilio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.send_mode === 'twilio' ? (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activar Twilio</Label>
                  <p className="text-xs text-muted-foreground">Habilitar envío automático de OTP</p>
                </div>
                <Switch
                  checked={config.twilio_enabled}
                  onCheckedChange={(v) => setConfig(prev => ({ ...prev, twilio_enabled: v }))}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Twilio Account SID</Label>
                  <Input
                    value={config.twilio_account_sid}
                    onChange={(e) => setConfig(prev => ({ ...prev, twilio_account_sid: e.target.value }))}
                    placeholder="AC..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twilio Auth Token</Label>
                  <Input
                    type="password"
                    value={config.twilio_auth_token}
                    onChange={(e) => setConfig(prev => ({ ...prev, twilio_auth_token: e.target.value }))}
                    placeholder="••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Canal OTP</Label>
                <Select value={config.otp_channel} onValueChange={(v) => setConfig(prev => ({ ...prev, otp_channel: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Número WhatsApp Business</Label>
                  <Input
                    value={config.whatsapp_sender}
                    onChange={(e) => setConfig(prev => ({ ...prev, whatsapp_sender: e.target.value }))}
                    placeholder="+529711234567"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número SMS</Label>
                  <Input
                    value={config.sms_sender}
                    onChange={(e) => setConfig(prev => ({ ...prev, sms_sender: e.target.value }))}
                    placeholder="+1..."
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
              <p className="text-sm text-muted-foreground">
                📱 <strong>Modo Manual:</strong> El sistema generará el mensaje con el código OTP y podrás enviarlo por WhatsApp manualmente o copiarlo al portapapeles.
              </p>
            </div>
          )}

          {/* Message Templates */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium text-sm">Plantillas de Mensaje</h4>
            <div className="space-y-2">
              <Label>Plantilla OTP</Label>
              <Textarea
                value={config.otp_template}
                onChange={(e) => setConfig(prev => ({ ...prev, otp_template: e.target.value }))}
                placeholder="Tu código es {OTP}"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Variables: {'{OTP}'}, {'{MIN}'}</p>
            </div>
            <div className="space-y-2">
              <Label>Plantilla Link + OTP (Expediente)</Label>
              <Textarea
                value={config.portal_link_template}
                onChange={(e) => setConfig(prev => ({ ...prev, portal_link_template: e.target.value }))}
                placeholder="Entra aquí: {LINK} Código: {OTP}"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Variables: {'{LINK}'}, {'{OTP}'}, {'{MIN}'}</p>
            </div>
          </div>

          {/* Session Settings */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Expiración OTP (min)</Label>
              <Input
                type="number"
                value={config.otp_expiry_minutes}
                onChange={(e) => setConfig(prev => ({ ...prev, otp_expiry_minutes: parseInt(e.target.value) || 10 }))}
                min={5}
                max={30}
              />
            </div>
            <div className="space-y-2">
              <Label>Duración Sesión (días)</Label>
              <Input
                type="number"
                value={config.session_duration_days}
                onChange={(e) => setConfig(prev => ({ ...prev, session_duration_days: parseInt(e.target.value) || 30 }))}
                min={1}
                max={90}
              />
            </div>
            <div className="space-y-2">
              <Label>Intentos OTP máx.</Label>
              <Input
                type="number"
                value={config.max_otp_attempts}
                onChange={(e) => setConfig(prev => ({ ...prev, max_otp_attempts: parseInt(e.target.value) || 5 }))}
                min={3}
                max={10}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar Configuración
            </Button>
            <Button variant="outline" onClick={() => { setTestModal(true); setTestResult(null); }}>
              <Smartphone className="h-4 w-4 mr-2" /> Probar OTP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test OTP Modal */}
      <Dialog open={testModal} onOpenChange={setTestModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Probar Envío de OTP</DialogTitle>
            <DialogDescription>
              {config.send_mode === 'manual' 
                ? 'Genera un OTP de prueba (modo manual, sin Twilio)'
                : 'Envía un OTP de prueba via Twilio'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Teléfono de prueba</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="9711234567"
              />
            </div>
            <Button onClick={handleTestOTP} disabled={testing} className="w-full">
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {config.send_mode === 'manual' ? 'Generar OTP de Prueba' : 'Enviar OTP de Prueba'}
            </Button>
            {testResult && (
              <div className="space-y-3">
                {testResult.mode === 'manual' && (
                  <>
                    {testResult.patient_found ? (
                      <p className="text-xs text-green-600">✅ Paciente encontrado: {testResult.patient_name}</p>
                    ) : (
                      <p className="text-xs text-amber-600">⚠️ No se encontró paciente con ese teléfono. OTP generado solo para prueba.</p>
                    )}
                    {!testResult.db_saved && (
                      <p className="text-xs text-amber-600">⚠️ No se pudo guardar en BD, pero puedes probar el flujo manual.</p>
                    )}
                    <div className="p-2 bg-muted rounded text-center">
                      <p className="text-xs text-muted-foreground mb-1">Código OTP</p>
                      <p className="text-2xl font-bold tracking-widest font-mono">{testResult.otp_code}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {testResult.otp_message}
                    </div>
                    {testResult.portal_url && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Link del Portal:</p>
                        <div className="p-2 bg-muted rounded text-sm font-mono break-all">{testResult.portal_url}</div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            navigator.clipboard.writeText(testResult.portal_url);
                            toast({ title: 'Link copiado' });
                          }}>
                            <Copy className="h-4 w-4 mr-1" /> Copiar link
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={testResult.portal_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-1" /> Abrir Portal
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(testResult.otp_message);
                        toast({ title: 'Mensaje copiado' });
                      }}>
                        <Copy className="h-4 w-4 mr-1" /> Copiar mensaje
                      </Button>
                      {testResult.whatsapp_url && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" asChild>
                          <a href={testResult.whatsapp_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" /> WhatsApp
                          </a>
                        </Button>
                      )}
                    </div>
                  </>
                )}
                {testResult.mode === 'twilio' && (
                  <p className="text-sm text-green-600">✅ OTP enviado por {config.otp_channel}</p>
                )}
                {testResult.error && (
                  <p className="text-sm text-destructive">❌ {testResult.error}</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
