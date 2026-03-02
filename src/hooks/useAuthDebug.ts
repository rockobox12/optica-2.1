import { useEffect } from 'react';
import { useAuth } from './useAuth';

/**
 * Development-only hook to debug auth state
 * Logs auth state changes to console
 */
export function useAuthDebug(componentName: string = 'Unknown') {
  const { user, loading, rolesLoaded, profileLoaded, roles, profile } = useAuth();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.group(`🔐 [${componentName}] Auth State`);
      console.log('User:', user?.email ?? 'null');
      console.log('Loading:', loading);
      console.log('Roles Loaded:', rolesLoaded);
      console.log('Profile Loaded:', profileLoaded);
      console.log('Roles:', roles);
      console.log('Profile:', profile);
      console.log('Is Active:', profile?.isActive ?? 'N/A');
      console.log('Default Branch:', profile?.defaultBranchId ?? 'null');
      console.groupEnd();
    }
  }, [user, loading, rolesLoaded, profileLoaded, roles, profile, componentName]);
}
