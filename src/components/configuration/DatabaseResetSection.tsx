import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { normalizePhoneMX } from '@/hooks/usePatientPortal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Trash2, 
  Lock, 
  KeyRound, 
  Smartphone, 
  CheckCircle2, 
  XCircle,
  Download,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface ResetSelections {
  patients: boolean;
  sales: boolean;
  appointments: boolean;
  laboratory: boolean;
  marketing: boolean;
  products: boolean;
}

type ResetStep = 'password' | 'confirmation' | 'otp';

export function DatabaseResetSection() {
  const { user, isAdmin, session } = useAuth();
  const { settings, updateSettings } = useCompanySettings();
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ResetStep>('password');
  const [isExecuting, setIsExecuting] = useState(false);

  // Step A - Password
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // Step B - Typed confirmation
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const confirmationValid = typedConfirmation === 'REINICIAR';

  // Step C - OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpPhoneHint, setOtpPhoneHint] = useState('');
  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpMode, setOtpMode] = useState<'manual' | 'twilio' | ''>('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpPhoneFull, setOtpPhoneFull] = useState('');
  const [otpWhatsappUrl, setOtpWhatsappUrl] = useState('');

  // Selections
  const [selections, setSelections] = useState<ResetSelections>({
    patients: true,
    sales: true,
    appointments: true,
    laboratory: true,
    marketing: true,
    products: false,
  });

  // Reason
  const [reason, setReason] = useState('');

  // Backup
  const [backupDownloaded, setBackupDownloaded] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isModalOpen]);

  const allStepsValid = passwordVerified && confirmationValid && otpCode.length === 6;

  const resetModal = () => {
    setCurrentStep('password');
    setPassword('');
    setPasswordVerified(false);
    setPasswordError('');
    setTypedConfirmation('');
    setOtpCode('');
    setOtpRequested(false);
    setOtpPhoneHint('');
    setOtpError('');
    setOtpMode('');
    setGeneratedOtp('');
    setOtpPhoneFull('');
    setOtpWhatsappUrl('');
    setReason('');
    setBackupDownloaded(false);
    setSelections({
      patients: true,
      sales: true,
      appointments: true,
      laboratory: true,
      marketing: true,
      products: false,
    });
  };

  const callEdgeFunction = async (body: Record<string, unknown>) => {
    const res = await supabase.functions.invoke('admin-reset-database', {
      body,
    });
    // When edge function returns non-2xx, supabase SDK puts FunctionsHttpError in error
    // but the actual JSON body with meaningful message may be in error.context or data
    if (res.error) {
      // Try to parse the response body from the error
      try {
        const context = (res.error as any).context;
        if (context && typeof context.json === 'function') {
          const errorData = await context.json();
          return { data: errorData, error: null };
        }
      } catch {
        // fallback
      }
      // If data is available alongside error, prefer data
      if (res.data) {
        return { data: res.data, error: null };
      }
    }
    return res;
  };

  const handleVerifyPassword = async () => {
    setVerifyingPassword(true);
    setPasswordError('');
    try {
      const { data, error } = await callEdgeFunction({
        action: 'verify_password',
        password,
      });
      if (error) throw new Error(error.message || 'Error de verificación');
      if (data?.error) {
        setPasswordError(data.error);
        if (data.blocked) {
          toast({ title: 'Bloqueado', description: data.error, variant: 'destructive' });
        }
      } else {
        setPasswordVerified(true);
        setCurrentStep('confirmation');
      }
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Error');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleRequestOtp = async () => {
    setRequestingOtp(true);
    setOtpError('');
    try {
      const { data, error } = await callEdgeFunction({ action: 'request_otp' });
      if (error) throw new Error(error.message);
      if (data?.error) {
        setOtpError(data.error);
      } else {
        setOtpRequested(true);
        setOtpMode(data?.mode || 'manual');
        if (data?.mode === 'manual') {
          setGeneratedOtp(data.otp || '');
          setOtpPhoneFull(data.phone_full || '');
          setOtpWhatsappUrl(data.whatsapp_url || '');
        } else {
          setOtpPhoneHint(data?.phone_hint || '');
        }
      }
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : 'Error');
    } finally {
      setRequestingOtp(false);
    }
  };

  const handleCopyOtp = () => {
    if (generatedOtp) {
      navigator.clipboard.writeText(generatedOtp);
      toast({ title: 'Copiado', description: 'Código OTP copiado al portapapeles' });
    }
  };

  const handleExecuteReset = async () => {
    setIsExecuting(true);
    try {
      const { data, error } = await callEdgeFunction({
        action: 'execute_reset',
        otp_code: otpCode,
        typed_confirmation: typedConfirmation,
        selections,
        reason,
      });
      if (error) throw new Error(error.message);
      if (data?.error) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      } else {
        toast({ title: 'Base de datos reiniciada ✅', description: 'Los datos seleccionados han sido eliminados.' });
        setIsModalOpen(false);
        resetModal();
      }
    } catch (err: unknown) {
      toast({ 
        title: 'Error', 
        description: err instanceof Error ? err.message : 'Error al reiniciar', 
        variant: 'destructive' 
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownloadBackup = async () => {
    // Simple backup: download a summary JSON
    toast({ title: 'Generando respaldo...', description: 'Esto puede tomar unos segundos.' });
    try {
      const tables = ['patients', 'sales', 'appointments', 'lab_orders'];
      const backup: Record<string, unknown[]> = {};
      for (const table of tables) {
        const { data } = await supabase.from(table as 'patients').select('*').limit(10000);
        backup[table] = data || [];
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupDownloaded(true);
      toast({ title: 'Respaldo listo ✅', description: 'Archivo descargado.' });
    } catch {
      toast({ title: 'Error al generar respaldo', variant: 'destructive' });
    }
  };

  const toggleTestMode = async (checked: boolean) => {
    try {
      await updateSettings({ test_mode: checked } as any);
      toast({ 
        title: checked ? 'Modo pruebas activado' : 'Modo pruebas desactivado',
        description: checked ? 'El botón de reinicio está ahora disponible.' : 'El botón de reinicio ha sido ocultado.',
      });
    } catch {
      toast({ title: 'Error al cambiar modo', variant: 'destructive' });
    }
  };

  if (!isAdmin()) return null;

  const testMode = (settings as any)?.test_mode === true;

  const selectionLabels: { key: keyof ResetSelections; label: string; icon: string }[] = [
    { key: 'patients', label: 'Pacientes y expedientes clínicos', icon: '👤' },
    { key: 'sales', label: 'Ventas, pagos, créditos y caja', icon: '💰' },
    { key: 'appointments', label: 'Citas y agenda', icon: '📅' },
    { key: 'laboratory', label: 'Laboratorio y entregas', icon: '🔬' },
    { key: 'marketing', label: 'Marketing, WhatsApp y mensajes', icon: '📣' },
    { key: 'products', label: 'Catálogo de productos e inventario', icon: '📦' },
  ];

  return (
    <div className="space-y-6">
      {/* OTP Security Phone */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Teléfono de Seguridad (OTP)
          </CardTitle>
          <CardDescription>
            Número al que se envía el código OTP para acciones sensibles (reiniciar BD, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Teléfono del propietario / administrador</Label>
            <Input
              value={(settings as any)?.otp_security_phone || ''}
              onChange={(e) => {
                const val = e.target.value;
                updateSettings({ otp_security_phone: val || null } as any);
              }}
              placeholder="9711234567"
            />
            <p className="text-xs text-muted-foreground">
              Si está vacío, se usará el teléfono del perfil del administrador.
            </p>
            {((settings as any)?.otp_security_phone || (settings as any)?.phone) && (
              <p className="text-xs text-green-600">
                📱 OTP se enviará a: <strong>{(settings as any)?.otp_security_phone || 'teléfono del perfil admin'}</strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Mode Toggle */}
      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ShieldAlert className="h-5 w-5" />
            Modo Pruebas
          </CardTitle>
          <CardDescription>
            Activa este modo durante la fase de pruebas del sistema. Habilita herramientas de mantenimiento avanzado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Modo pruebas</Label>
              <p className="text-sm text-muted-foreground">
                {testMode ? 'El sistema está en modo de pruebas' : 'El sistema está en modo producción'}
              </p>
            </div>
            <Switch checked={testMode} onCheckedChange={toggleTestMode} />
          </div>
        </CardContent>
      </Card>

      {/* Reset Section - Only visible when test mode is ON */}
      {testMode && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" />
                🧹 Reiniciar Base de Datos (solo pruebas)
              </CardTitle>
              <CardDescription className="text-destructive font-medium">
                ⚠️ Esto eliminará datos operativos (pacientes, ventas, pagos, citas, laboratorio, mensajes, etc.). 
                Acción irreversible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Advertencia</AlertTitle>
                <AlertDescription>
                  Esta acción vacía los datos de prueba y deja el sistema listo para capturar datos reales. 
                  No se pueden recuperar los datos eliminados. Se recomienda descargar un respaldo antes de continuar.
                </AlertDescription>
              </Alert>

              <Button 
                variant="destructive" 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => { resetModal(); setIsModalOpen(true); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reiniciar base de datos
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Multi-step Reset Modal */}
      {/* Custom Centered Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-[95%] max-w-[520px] max-h-[90vh] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4 rounded-t-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        Reiniciar Base de Datos
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Completa los 3 pasos de verificación
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setIsModalOpen(false); resetModal(); }}
                      className="rounded-full h-9 w-9 hover:bg-muted"
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Step Indicators */}
                  <div className="flex items-center gap-1 mt-4">
                    {([
                      { step: 'password' as ResetStep, label: 'Contraseña', done: passwordVerified },
                      { step: 'confirmation' as ResetStep, label: 'Confirmación', done: confirmationValid },
                      { step: 'otp' as ResetStep, label: 'Verificación OTP', done: otpCode.length === 6 },
                    ]).map(({ step, label, done }, i) => {
                      const isActive = currentStep === step;
                      return (
                        <div key={step} className="flex items-center gap-1 flex-1">
                          <div className="flex flex-col items-center flex-1">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                done
                                  ? 'bg-green-500 text-white'
                                  : isActive
                                  ? 'bg-primary text-primary-foreground shadow-md'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                            </div>
                            <span className={`text-[10px] mt-1 text-center leading-tight ${
                              isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                            }`}>
                              {label}
                            </span>
                          </div>
                          {i < 2 && (
                            <div className={`h-0.5 flex-1 -mt-4 mx-1 rounded-full transition-colors ${
                              done ? 'bg-green-500' : 'bg-border'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                  <AnimatePresence mode="wait">
                    {/* STEP 1: Password */}
                    {currentStep === 'password' && (
                      <motion.div
                        key="password"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <Lock className="h-5 w-5 text-primary" />
                          Paso 1 — Contraseña
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Ingresa tu contraseña de Super Administrador para verificar tu identidad.
                        </p>
                        <Input
                          type="password"
                          placeholder="Contraseña del Super Admin"
                          value={password}
                          onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                          onKeyDown={(e) => e.key === 'Enter' && password && handleVerifyPassword()}
                          className="h-12"
                        />
                        {passwordError && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> {passwordError}
                          </p>
                        )}
                        <Button
                          onClick={handleVerifyPassword}
                          disabled={!password || verifyingPassword}
                          className="w-full h-12"
                          size="lg"
                        >
                          {verifyingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                          Verificar contraseña
                        </Button>
                      </motion.div>
                    )}

                    {/* STEP 2: Confirmation + Selections */}
                    {currentStep === 'confirmation' && (
                      <motion.div
                        key="confirmation"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          Paso 2 — Confirmación
                        </div>

                        {/* Module selection */}
                        <div className="space-y-2.5 p-4 rounded-xl border bg-muted/30">
                          <p className="text-sm font-medium mb-2">Módulos a limpiar:</p>
                          {selectionLabels.map(({ key, label, icon }) => (
                            <div key={key} className="flex items-center gap-3">
                              <Checkbox
                                id={`sel-${key}`}
                                checked={selections[key]}
                                onCheckedChange={(checked) =>
                                  setSelections((prev) => ({ ...prev, [key]: !!checked }))
                                }
                              />
                              <Label htmlFor={`sel-${key}`} className="text-sm cursor-pointer">
                                {icon} {label}
                              </Label>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reason">Motivo (opcional)</Label>
                          <Textarea
                            id="reason"
                            placeholder="Ej: Fin de fase de pruebas"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={2}
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <Button variant="outline" onClick={handleDownloadBackup} size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Descargar respaldo
                          </Button>
                          {backupDownloaded && (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Listo
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>
                            Escribe <span className="font-mono font-bold text-destructive">REINICIAR</span> para continuar
                          </Label>
                          <Input
                            value={typedConfirmation}
                            onChange={(e) => setTypedConfirmation(e.target.value.toUpperCase())}
                            placeholder="Escribe REINICIAR"
                            className={`h-12 ${confirmationValid ? 'border-green-500 focus-visible:ring-green-500' : ''}`}
                          />
                        </div>

                        <Button
                          onClick={() => setCurrentStep('otp')}
                          disabled={!confirmationValid}
                          className="w-full h-12"
                          size="lg"
                        >
                          Continuar al paso final
                        </Button>
                      </motion.div>
                    )}

                    {/* STEP 3: OTP + Final Confirmation */}
                    {currentStep === 'otp' && (
                      <motion.div
                        key="otp"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <Smartphone className="h-5 w-5 text-primary" />
                          Paso 3 — Verificación OTP
                        </div>

                        {!otpRequested ? (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Se generará un código de 6 dígitos para verificación.
                            </p>
                            <Button
                              onClick={handleRequestOtp}
                              disabled={requestingOtp}
                              variant="outline"
                              className="w-full h-12"
                              size="lg"
                            >
                              {requestingOtp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Smartphone className="h-4 w-4 mr-2" />}
                              Generar código OTP
                            </Button>
                          </div>
                        ) : otpMode === 'manual' ? (
                          <div className="space-y-3">
                            {/* Manual mode: show OTP on screen */}
                            <Alert className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-amber-700 dark:text-amber-400">
                                Modo manual activo. Envía este código al número de seguridad.
                              </AlertDescription>
                            </Alert>

                            {otpPhoneFull && (
                              <p className="text-sm text-muted-foreground">
                                Número destino: <strong className="font-mono">{otpPhoneFull}</strong>
                              </p>
                            )}

                            <div className="p-4 bg-muted rounded-xl text-center">
                              <p className="text-xs text-muted-foreground mb-1">Código OTP generado:</p>
                              <p className="text-3xl font-bold tracking-[0.3em] font-mono">{generatedOtp}</p>
                              <p className="text-xs text-muted-foreground mt-1">Vigencia: 10 minutos</p>
                            </div>

                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1" onClick={handleCopyOtp}>
                                <Copy className="h-4 w-4 mr-2" /> Copiar código
                              </Button>
                              {otpWhatsappUrl && (
                                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" asChild>
                                  <a href={otpWhatsappUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir WhatsApp
                                  </a>
                                </Button>
                              )}
                            </div>

                            <div className="flex justify-center py-2">
                              <InputOTP
                                maxLength={6}
                                value={otpCode}
                                onChange={(val) => { setOtpCode(val); setOtpError(''); }}
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              Ingresa el código de arriba para confirmar
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRequestOtp}
                              disabled={requestingOtp}
                            >
                              Regenerar código
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Código enviado a {otpPhoneHint}. Vigencia: 10 minutos.
                            </p>
                            <div className="flex justify-center py-2">
                              <InputOTP
                                maxLength={6}
                                value={otpCode}
                                onChange={(val) => { setOtpCode(val); setOtpError(''); }}
                              >
                                <InputOTPGroup>
                                  <InputOTPSlot index={0} />
                                  <InputOTPSlot index={1} />
                                  <InputOTPSlot index={2} />
                                  <InputOTPSlot index={3} />
                                  <InputOTPSlot index={4} />
                                  <InputOTPSlot index={5} />
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRequestOtp}
                              disabled={requestingOtp}
                            >
                              Reenviar código
                            </Button>
                          </div>
                        )}

                        {otpError && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> {otpError}
                          </p>
                        )}

                        {/* Final warning */}
                        <div className="p-4 rounded-xl border border-destructive/40 bg-destructive/5 space-y-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                            <p className="text-sm font-semibold text-destructive">Advertencia final</p>
                          </div>
                          <p className="text-sm text-destructive/90">
                            Esta acción eliminará <strong>TODOS</strong> los datos seleccionados del sistema. Esta acción <strong>no se puede deshacer</strong>.
                          </p>
                          <ul className="text-xs text-destructive/80 mt-1 space-y-0.5 pl-4">
                            {selectionLabels
                              .filter(({ key }) => selections[key])
                              .map(({ key, label, icon }) => (
                                <li key={key}>• {icon} {label}</li>
                              ))}
                          </ul>
                        </div>

                        <Button
                          variant="destructive"
                          size="lg"
                          className="w-full h-12 font-bold"
                          disabled={!allStepsValid || isExecuting}
                          onClick={handleExecuteReset}
                        >
                          {isExecuting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-2" />
                          )}
                          Confirmar Reinicio Definitivo
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Back navigation */}
                  {currentStep !== 'password' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4"
                      onClick={() =>
                        setCurrentStep(currentStep === 'otp' ? 'confirmation' : 'password')
                      }
                    >
                      ← Paso anterior
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
