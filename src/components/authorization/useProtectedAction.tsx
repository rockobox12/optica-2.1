import { useCallback } from 'react';
import { useAuthorization } from './AuthorizationProvider';
import type { AuthorizationActionType } from '@/hooks/useAdminAuthorization';

interface UseProtectedActionOptions {
  actionType: AuthorizationActionType;
  resourceType: string;
  resourceId?: string;
  resourceDescription?: string;
  actionData?: Record<string, any>;
}

/**
 * Hook to wrap an action with authorization check
 * 
 * Usage:
 * ```tsx
 * const handleDelete = useProtectedAction({
 *   actionType: 'DELETE_PATIENT',
 *   resourceType: 'patient',
 *   resourceId: patient.id,
 *   resourceDescription: patient.name,
 * }, async () => {
 *   // Delete patient logic
 * });
 * ```
 */
export function useProtectedAction<T extends (...args: any[]) => Promise<any> | any>(
  options: UseProtectedActionOptions,
  action: T
): (...args: Parameters<T>) => Promise<void> {
  const { checkAuthorization, isAdmin } = useAuthorization();

  return useCallback(async (...args: Parameters<T>) => {
    // Check authorization first
    const authorized = await checkAuthorization(
      options.actionType,
      options.resourceType,
      options.resourceId,
      options.resourceDescription,
      options.actionData
    );

    if (authorized) {
      await action(...args);
    }
    // If not authorized, the modal is shown by AuthorizationProvider
  }, [checkAuthorization, options, action, isAdmin]);
}

/**
 * HOC to wrap a button's onClick with authorization
 */
export function withAuthorizationCheck<P extends { onClick?: () => void }>(
  WrappedComponent: React.ComponentType<P>,
  options: UseProtectedActionOptions
) {
  return function AuthorizedComponent(props: P) {
    const protectedClick = useProtectedAction(options, props.onClick || (() => {}));

    return <WrappedComponent {...props} onClick={protectedClick} />;
  };
}
