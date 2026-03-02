import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AccessDeniedScreen } from './AccessDeniedScreen';

type AppRole = 'super_admin' | 'admin' | 'gerente' | 'doctor' | 'optometrista' | 'asistente' | 'cobrador' | 'tecnico';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AppRole[];
  fallback?: ReactNode;
  showAccessDenied?: boolean;
  accessDeniedTitle?: string;
  accessDeniedMessage?: string;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback,
  showAccessDenied = true,
  accessDeniedTitle,
  accessDeniedMessage,
}: RoleGuardProps) {
  const { hasAnyRole, loading, rolesLoaded } = useAuth();

  // Show loading while checking roles
  if (loading || !rolesLoaded) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!hasAnyRole(allowedRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return (
        <AccessDeniedScreen
          title={accessDeniedTitle}
          message={accessDeniedMessage}
        />
      );
    }

    return null;
  }

  return <>{children}</>;
}

// HOC for role-based component rendering
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: AppRole[]
) {
  return function RoleGuardedComponent(props: P) {
    return (
      <RoleGuard allowedRoles={allowedRoles}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
