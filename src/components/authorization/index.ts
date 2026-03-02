export { AuthorizationProvider, useAuthorization } from './AuthorizationProvider';
export { AuthorizationRequestModal, AuthorizationModal } from './AuthorizationRequestModal';
export { AdminAuthorizationPanel } from './AdminAuthorizationPanel';
export { AuthorizationNotificationBadge } from './AuthorizationNotificationBadge';
export { useProtectedAction, withAuthorizationCheck } from './useProtectedAction';
export { 
  ACTION_TYPE_LABELS, 
  RESOURCE_TYPE_LABELS,
  type AuthorizationActionType,
  type AuthorizationRequestStatus,
  type AuthorizationRequest,
} from '@/hooks/useAdminAuthorization';
