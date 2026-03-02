import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AccessDeniedScreenProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
}

export function AccessDeniedScreen({
  title = 'Sin permisos para ver esta sección',
  message = 'No tienes los permisos necesarios para acceder a este módulo. Contacta al administrador si crees que esto es un error.',
  showBackButton = true,
  showHomeButton = true,
}: AccessDeniedScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="p-6 rounded-full bg-destructive/10 mb-6">
        <Shield className="h-16 w-16 text-destructive" />
      </div>
      
      <h1 className="text-2xl font-display font-bold text-foreground mb-3">
        {title}
      </h1>
      
      <p className="text-muted-foreground max-w-md mb-8">
        {message}
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-3">
        {showBackButton && (
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        )}
        
        {showHomeButton && (
          <Button 
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Ir al Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}
