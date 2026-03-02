import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const LAST_ROUTE_KEY = 'optica_last_route';
const EXCLUDED_ROUTES = ['/auth', '/login', '/logout', '/unauthorized'];

/**
 * Hook to persist the current route to localStorage
 * Call this in the main app layout to track navigation
 */
export function useRoutePersistence() {
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    
    // Don't save excluded routes
    if (EXCLUDED_ROUTES.some(route => location.pathname.startsWith(route))) {
      return;
    }

    try {
      localStorage.setItem(LAST_ROUTE_KEY, fullPath);
    } catch (error) {
      console.error('Error saving route:', error);
    }
  }, [location.pathname, location.search]);
}

/**
 * Get the last saved route
 */
export function getLastRoute(): string | null {
  try {
    const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
    
    // Validate route is not excluded
    if (lastRoute && !EXCLUDED_ROUTES.some(route => lastRoute.startsWith(route))) {
      return lastRoute;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear the last saved route
 */
export function clearLastRoute(): void {
  try {
    localStorage.removeItem(LAST_ROUTE_KEY);
  } catch (error) {
    console.error('Error clearing route:', error);
  }
}
