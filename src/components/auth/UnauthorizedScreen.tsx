import { Shield, Home, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface UnauthorizedScreenProps {
  type: 'no-session' | 'no-permission' | 'inactive';
  requiredRoles?: string[];
}

export function UnauthorizedScreen({ type, requiredRoles }: UnauthorizedScreenProps) {
  const navigate = useNavigate();

  const config = {
    'no-session': {
      icon: LogIn,
      title: 'Sesión requerida',
      description: 'Necesitas iniciar sesión para acceder a esta página.',
      primaryAction: { label: 'Iniciar sesión', onClick: () => navigate('/auth') },
    },
    'no-permission': {
      icon: Shield,
      title: 'Sin permisos',
      description: requiredRoles?.length 
        ? `Esta sección requiere uno de los siguientes roles: ${requiredRoles.join(', ')}.`
        : 'No tienes permisos para acceder a esta sección.',
      primaryAction: { label: 'Ir al inicio', onClick: () => navigate('/') },
    },
    'inactive': {
      icon: Shield,
      title: 'Cuenta desactivada',
      description: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      primaryAction: { label: 'Cerrar sesión', onClick: () => navigate('/auth') },
    },
  };

  const { icon: Icon, title, description, primaryAction } = config[type];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-destructive/10 w-fit">
            <Icon className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={primaryAction.onClick} className="w-full">
            {type === 'no-session' ? <LogIn className="h-4 w-4 mr-2" /> : <Home className="h-4 w-4 mr-2" />}
            {primaryAction.label}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
