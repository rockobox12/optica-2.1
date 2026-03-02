import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { UnauthorizedScreen } from '@/components/auth/UnauthorizedScreen';
import { useAuthDebug } from '@/hooks/useAuthDebug';
import { getLastRoute, clearLastRoute } from '@/hooks/useRoutePersistence';

// Valid user roles - "vendedor" was removed and replaced by "Promotor" entity (non-user)
type AppRole = 'admin' | 'doctor' | 'asistente' | 'cobrador' | 'tecnico' | 'gerente';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, loading, profile, hasAnyRole, rolesLoaded, profileLoaded } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRestoredRoute = useRef(false);
  
  // Debug auth state in development
  useAuthDebug(`ProtectedRoute:${location.pathname}`);

  // Calculate auth states
  const isInitialLoading = loading;
  const isUserDataLoading = !!user && (!rolesLoaded || !profileLoaded);
  const isAuthenticated = !!user && rolesLoaded && profileLoaded;
  
  // Check permissions
  const hasRequiredRole = useMemo(() => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return hasAnyRole(requiredRoles);
  }, [requiredRoles, hasAnyRole]);

  const isUserActive = profile?.isActive !== false;

  // Route restoration logic - only runs once when auth completes
  useEffect(() => {
    // Only attempt restoration once, when auth is fully complete, and we're on root
    if (hasRestoredRoute.current) return;
    if (isInitialLoading || isUserDataLoading || !isAuthenticated) return;
    if (location.pathname !== '/') return;

    const lastRoute = getLastRoute();
    if (lastRoute && lastRoute !== '/') {
      hasRestoredRoute.current = true;
      clearLastRoute();
      navigate(lastRoute, { replace: true });
    }
  }, [isInitialLoading, isUserDataLoading, isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    // Only log in development for debugging
    if (import.meta.env.DEV) {
      console.log(`🛡️ [ProtectedRoute] ${location.pathname}`, {
        isInitialLoading,
        isUserDataLoading,
        isAuthenticated,
        hasRequiredRole,
        isUserActive,
      });
    }
  }, [location.pathname, isInitialLoading, isUserDataLoading, isAuthenticated, hasRequiredRole, isUserActive]);

  // Show loading screen while checking auth
  if (isInitialLoading) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  // No session - show unauthorized screen with login option
  if (!user) {
    return <UnauthorizedScreen type="no-session" />;
  }

  // Loading user data (roles, profile)
  if (isUserDataLoading) {
    return <LoadingScreen message="Cargando perfil de usuario..." />;
  }

  // User is inactive
  if (!isUserActive) {
    return <UnauthorizedScreen type="inactive" />;
  }

  // Check required roles
  if (requiredRoles && requiredRoles.length > 0 && !hasRequiredRole) {
    return <UnauthorizedScreen type="no-permission" requiredRoles={requiredRoles} />;
  }

  // All checks passed - render children
  return <>{children}</>;
}
