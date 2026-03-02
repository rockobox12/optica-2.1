import { useState, useEffect } from 'react';
import { useTouchScroll } from '@/hooks/useTouchScroll';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { DeveloperWatermark } from '@/components/branding/DeveloperWatermark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

const resetSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<AuthView>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const touchRef = useTouchScroll<HTMLDivElement>();
  
  const { toast } = useToast();
  const { signIn, signUp, resetPassword, updatePassword, user } = useAuth();
  const navigate = useNavigate();

  // ... keep existing code (useEffect hooks, validateForm, handleSubmit, getTitle, getSubtitle)

  // Check if we're in password reset mode
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'recovery') {
      setView('reset-password');
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && view !== 'reset-password') {
      navigate('/');
    }
  }, [user, navigate, view]);

  const validateForm = () => {
    try {
      if (view === 'login') {
        loginSchema.parse({ email, password });
      } else if (view === 'signup') {
        signupSchema.parse({ email, password, fullName });
      } else if (view === 'forgot-password') {
        resetSchema.parse({ email });
      } else if (view === 'reset-password') {
        newPasswordSchema.parse({ password, confirmPassword });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (view === 'login') {
        const { error, isInactive } = await signIn(email, password);
        if (error) {
          if (isInactive) {
            toast({
              title: 'Cuenta desactivada',
              description: error.message,
              variant: 'destructive',
            });
          } else if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Error de autenticación',
              description: 'Correo o contraseña incorrectos',
              variant: 'destructive',
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: 'Correo no verificado',
              description: 'Por favor verifica tu correo electrónico antes de iniciar sesión',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: '¡Bienvenido!',
            description: 'Has iniciado sesión correctamente',
          });
          navigate('/');
        }
      } else if (view === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              title: 'Usuario existente',
              description: 'Ya existe una cuenta con este correo electrónico',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Error',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: '¡Cuenta creada!',
            description: 'Te hemos enviado un correo de verificación. Por favor revisa tu bandeja de entrada.',
          });
          setView('login');
        }
      } else if (view === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Correo enviado',
            description: 'Te hemos enviado un enlace para restablecer tu contraseña',
          });
          setView('login');
        }
      } else if (view === 'reset-password') {
        const { error } = await updatePassword(password);
        if (error) {
          toast({
            title: 'Error',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Contraseña actualizada',
            description: 'Tu contraseña ha sido actualizada correctamente',
          });
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'login': return 'Bienvenido de nuevo';
      case 'signup': return 'Crear cuenta';
      case 'forgot-password': return 'Recuperar contraseña';
      case 'reset-password': return 'Nueva contraseña';
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case 'login': return 'Ingresa tus credenciales para continuar';
      case 'signup': return 'Completa el formulario para registrarte';
      case 'forgot-password': return 'Te enviaremos un enlace para restablecer tu contraseña';
      case 'reset-password': return 'Ingresa tu nueva contraseña';
    }
  };

  return (
    <div ref={touchRef} className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent shadow-glow">
              <Eye className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Óptica Istmeña</h1>
              <p className="text-white/60 text-sm">Suite Administrativa</p>
            </div>
          </div>
          
          <h2 className="text-4xl xl:text-5xl font-display font-bold text-white mb-6 leading-tight">
            Gestión integral para tu óptica
          </h2>
          
          <p className="text-lg text-white/70 mb-8 max-w-md">
            Control de ventas, clientes, inventario y exámenes visuales en una sola plataforma moderna y eficiente.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <p className="text-2xl font-bold text-accent">+500</p>
              <p className="text-sm text-white/60">Clientes activos</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <p className="text-2xl font-bold text-accent">3</p>
              <p className="text-sm text-white/60">Sucursales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary">
              <Eye className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-display font-bold">Óptica Istmeña</h1>
          </div>

          {/* Back button for secondary views */}
          {(view === 'forgot-password' || view === 'reset-password') && (
            <button
              type="button"
              onClick={() => setView('login')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio de sesión
            </button>
          )}

          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground">
              {getTitle()}
            </h2>
            <p className="text-muted-foreground mt-2">
              {getSubtitle()}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {view === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required={view === 'signup'}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            {(view === 'login' || view === 'signup' || view === 'forgot-password') && (
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@opticaistmena.mx"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>
            )}

            {(view === 'login' || view === 'signup' || view === 'reset-password') && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {view === 'reset-password' ? 'Nueva contraseña' : 'Contraseña'}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>
            )}

            {view === 'reset-password' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {view === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('forgot-password')}
                  className="text-sm text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 gradient-primary hover:opacity-90 text-primary-foreground"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {view === 'login' && 'Iniciando...'}
                  {view === 'signup' && 'Creando cuenta...'}
                  {view === 'forgot-password' && 'Enviando...'}
                  {view === 'reset-password' && 'Actualizando...'}
                </span>
              ) : (
                <>
                  {view === 'login' && 'Iniciar Sesión'}
                  {view === 'signup' && 'Crear Cuenta'}
                  {view === 'forgot-password' && 'Enviar Enlace'}
                  {view === 'reset-password' && 'Actualizar Contraseña'}
                </>
              )}
            </Button>
          </form>

          {(view === 'login' || view === 'signup') && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              {view === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setView(view === 'login' ? 'signup' : 'login');
                  setErrors({});
                }}
                className="text-primary font-medium hover:underline"
              >
                {view === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
              </button>
            </p>
          )}
          
          {/* Developer watermark - Login screen */}
          <div className="mt-8 text-center">
            <DeveloperWatermark variant="subtle" />
          </div>
        </div>
      </div>
    </div>
  );
}
