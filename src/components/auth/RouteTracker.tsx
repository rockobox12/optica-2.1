import { useRoutePersistence } from '@/hooks/useRoutePersistence';

/**
 * Component that tracks route changes and persists them to localStorage
 * Place this inside BrowserRouter to enable route tracking
 */
export function RouteTracker() {
  useRoutePersistence();
  return null;
}
