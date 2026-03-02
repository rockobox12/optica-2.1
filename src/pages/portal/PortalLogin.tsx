import { useState, useRef, useEffect, useCallback } from 'react';
import { useTouchScroll } from '@/hooks/useTouchScroll';
import { Navigate, useSearchParams } from 'react-router-dom';
import { usePatientPortal, validatePortalToken, consumePortalTokenAttempt, markPortalTokenUsed } from '@/hooks/usePatientPortal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, Smartphone, Copy, ExternalLink, Loader2, ShieldCheck, RefreshCw, ClipboardPaste } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_HOUR = 3;

export default function PortalLogin() {
  const { session, loading, requestOTP, verifyOTP } = usePatientPortal();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('t');
  const touchRef = useTouchScroll<HTMLDivElement>();

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manualModal, setManualModal] = useState(false);
  const [manualData, setManualData] = useState<any>(null);
  const [patientName, setPatientName] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const resendTimestamps = useRef<number[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [tokenLoading, setTokenLoading] = useState(!!urlToken);
  const [tokenData, setTokenData] = useState<{ patient_id: string; phone_e164: string; patient_name: string } | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const tokenRef = useRef(urlToken);

  // ... keep existing code (token validation, cooldown, canResend, early returns, handlers)

  // Validate URL token on mount
  useEffect(() => {
    if (!urlToken) return;
    setTokenLoading(true);
    validatePortalToken(urlToken).then((result) => {
      if (result.valid) {
        setTokenData({
          patient_id: result.patient_id,
          phone_e164: result.phone_e164,
          patient_name: result.patient_name || '',
        });
        setPatientName(result.patient_name || '');
        setPhone(result.phone_e164 || '');
        setStep('otp');
      } else {
        setTokenInvalid(true);
      }
    }).catch(() => {
      setTokenInvalid(true);
    }).finally(() => setTokenLoading(false));
  }, [urlToken]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [cooldown > 0]);

  const startCooldown = useCallback(() => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }, []);

  const canResend = useCallback(() => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentResends = resendTimestamps.current.filter(t => t > oneHourAgo);
    return recentResends.length < MAX_RESENDS_PER_HOUR && cooldown === 0;
  }, [cooldown]);

  if (loading || tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/portal/home" replace />;
  }

  const handleRequestOTP = async () => {
    if (phone.replace(/\D/g, '').length < 10) {
      toast({ title: 'Teléfono inválido', description: 'Ingresa un número de 10 dígitos', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await requestOTP(phone);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        return;
      }
      setPatientName(result.patient_name || '');
      if (result.db_warning) {
        toast({ title: 'Aviso', description: result.db_warning, variant: 'destructive' });
      }
      if (result.mode === 'manual') {
        setManualData(result);
        setManualModal(true);
      } else {
        toast({ title: '¡Código enviado!', description: 'Revisa tu WhatsApp o SMS' });
      }
      setStep('otp');
      startCooldown();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'No se pudo enviar el código', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend()) {
      toast({ title: 'Espera', description: cooldown > 0 ? `Espera ${cooldown}s para reenviar` : 'Máximo de reenvíos alcanzado (3/hora)', variant: 'destructive' });
      return;
    }
    resendTimestamps.current.push(Date.now());
    setResendCount(prev => prev + 1);
    setOtpCode('');
    setAttemptsRemaining(null);
    await handleRequestOTP();
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) return;
    setSubmitting(true);
    try {
      if (tokenRef.current) {
        await consumePortalTokenAttempt(tokenRef.current);
      }

      const result = await verifyOTP(phone, otpCode);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        if (result.attempts_remaining !== undefined) {
          setAttemptsRemaining(result.attempts_remaining);
        }
        return;
      }

      if (tokenRef.current) {
        await markPortalTokenUsed(tokenRef.current);
      }

      toast({ title: '¡Bienvenido!', description: 'Acceso verificado correctamente' });
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Código incorrecto', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = () => {
    if (manualData?.otp_message) {
      navigator.clipboard.writeText(manualData.otp_message);
      toast({ title: 'Copiado', description: 'Mensaje copiado al portapapeles' });
    }
  };

  const hasToken = !!tokenData && !tokenInvalid;

  return (
    <div ref={touchRef} className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Eye className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Portal del Paciente</h1>
          <p className="text-muted-foreground text-sm">Óptica Istmeña</p>
        </div>

        {/* Token invalid warning */}
        {tokenInvalid && urlToken && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-destructive text-center">
                El enlace ha expirado o no es válido. Ingresa tu número de teléfono para solicitar un nuevo código.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">
              {step === 'phone'
                ? 'Acceso Seguro'
                : hasToken
                  ? `Hola, ${patientName}`
                  : `Hola, ${patientName}`}
            </CardTitle>
            <CardDescription>
              {step === 'phone'
                ? 'Ingresa tu número de teléfono registrado'
                : 'Ingresa el código de 6 dígitos'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 'phone' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="flex gap-2">
                    <div className="flex items-center px-3 bg-muted rounded-lg border text-sm text-muted-foreground">
                      +52
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="971 234 5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                      maxLength={15}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleRequestOTP}
                  disabled={submitting || phone.replace(/\D/g, '').length < 10}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
                  Enviar Código
                </Button>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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
                  className="w-full text-xs gap-1.5"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      const digits = text.replace(/\D/g, '').slice(0, 6);
                      if (digits.length === 6) {
                        setOtpCode(digits);
                        toast({ title: 'Código pegado', description: 'Se llenaron los 6 dígitos' });
                      } else {
                        toast({ title: 'Sin código válido', description: 'Copia el código de 6 dígitos desde WhatsApp e intenta de nuevo', variant: 'destructive' });
                      }
                    } catch {
                      toast({ title: 'Sin acceso al portapapeles', description: 'Copia el código desde WhatsApp y pégalo manualmente', variant: 'destructive' });
                    }
                  }}
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Pegar código
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Te enviamos un código por WhatsApp/SMS. Vigencia 10 minutos.
                </p>

                {attemptsRemaining !== null && attemptsRemaining <= 2 && (
                  <p className="text-sm text-destructive text-center">
                    {attemptsRemaining} intento(s) restante(s)
                  </p>
                )}

                <Button
                  className="w-full"
                  onClick={handleVerifyOTP}
                  disabled={submitting || otpCode.length !== 6}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Entrar
                </Button>

                <div className="flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep('phone');
                      setOtpCode('');
                      setAttemptsRemaining(null);
                      setCooldown(0);
                      setResendCount(0);
                      setTokenData(null);
                      tokenRef.current = null;
                    }}
                  >
                    Cambiar número
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={submitting || !canResend()}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {cooldown > 0 ? `Reenviar (${cooldown}s)` : 'Reenviar código'}
                  </Button>
                </div>

                {resendCount >= MAX_RESENDS_PER_HOUR && (
                  <p className="text-xs text-muted-foreground text-center">
                    Máximo de reenvíos alcanzado. Intenta más tarde.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Install PWA Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground text-center">
              📱 <strong>Instala la app:</strong> En iPhone: Compartir → Añadir a pantalla de inicio. En Android: Menú → Instalar aplicación.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manual OTP Modal */}
      <Dialog open={manualModal} onOpenChange={setManualModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar código manualmente</DialogTitle>
            <DialogDescription>
              Envía este mensaje al paciente por WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
              {manualData?.otp_message}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopyMessage}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
              {manualData?.whatsapp_url && (
                <Button className="flex-1" variant="success" asChild>
                  <a href={manualData.whatsapp_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" /> Abrir WhatsApp
                  </a>
                </Button>
              )}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setManualModal(false)}>
              Ya envié el código
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
