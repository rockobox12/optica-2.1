import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRoutePersistence, getLastRoute, clearLastRoute } from '@/hooks/useRoutePersistence';

interface RouteRestorerProps {
  children: ReactNode;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * Component that restores the last visited route after session revalidation
 * Wrap around routes after authentication is confirmed
 */
export function RouteRestorer({ children, isAuthenticated, isLoading }: RouteRestorerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Track current route
  useRoutePersistence();

  // Restore last route on auth complete
  useEffect(() => {
    // Only restore after loading completes and user is authenticated
    if (isLoading || !isAuthenticated) return;
    
    // Only restore if we're on the root path (default redirect destination)
    if (location.pathname !== '/') return;

    const lastRoute = getLastRoute();
    
    if (lastRoute && lastRoute !== '/') {
      // Clear the stored route to avoid re-restoring
      clearLastRoute();
      
      // Navigate to the last route
      navigate(lastRoute, { replace: true });
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  return <>{children}</>;
}
