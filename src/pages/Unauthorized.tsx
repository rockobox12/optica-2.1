import { Link } from 'react-router-dom';
import { Shield, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        
        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Acceso No Autorizado
        </h1>
        
        <p className="text-muted-foreground mb-6">
          No tienes los permisos necesarios para acceder a esta página. 
          Contacta al administrador si crees que esto es un error.
        </p>
        
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="h-4 w-4" />
            Volver al Inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}
