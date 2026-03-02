import { useAdminAuthorization } from '@/hooks/useAdminAuthorization';
import { cn } from '@/lib/utils';

interface AuthorizationNotificationBadgeProps {
  className?: string;
}

export function AuthorizationNotificationBadge({ className }: AuthorizationNotificationBadgeProps) {
  const { isAdmin, pendingCount } = useAdminAuthorization();

  if (!isAdmin || pendingCount === 0) {
    return null;
  }

  return (
    <span
      className={cn(
        'absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground animate-pulse',
        className
      )}
    >
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  );
}
