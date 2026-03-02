import { createContext, useContext, ReactNode } from 'react';
import { AuthorizationModal } from './AuthorizationRequestModal';
import { useAdminAuthorization, type AuthorizationActionType } from '@/hooks/useAdminAuthorization';

interface AuthorizationContextType {
  checkAuthorization: (
    actionType: AuthorizationActionType,
    resourceType: string,
    resourceId?: string,
    resourceDescription?: string,
    actionData?: Record<string, any>,
    onApproved?: () => void
  ) => Promise<boolean>;
  isAdmin: boolean;
  pendingCount: number;
}

const AuthorizationContext = createContext<AuthorizationContextType | null>(null);

export function useAuthorization() {
  const context = useContext(AuthorizationContext);
  if (!context) {
    throw new Error('useAuthorization must be used within AuthorizationProvider');
  }
  return context;
}

interface AuthorizationProviderProps {
  children: ReactNode;
}

export function AuthorizationProvider({ children }: AuthorizationProviderProps) {
  const { checkAuthorization, isAdmin, pendingCount } = useAdminAuthorization();

  return (
    <AuthorizationContext.Provider value={{ checkAuthorization, isAdmin, pendingCount }}>
      {children}
      <AuthorizationModal />
    </AuthorizationContext.Provider>
  );
}
