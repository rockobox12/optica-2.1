import { motion } from 'framer-motion';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PulsingBadgeProps extends BadgeProps {
  pulse?: boolean;
  pulseColor?: string;
}

export function PulsingBadge({
  children,
  className,
  pulse = true,
  pulseColor,
  ...props
}: PulsingBadgeProps) {
  return (
    <div className="relative inline-flex">
      {pulse && (
        <motion.span
          className={cn(
            'absolute inset-0 rounded-full',
            pulseColor || 'bg-primary/50'
          )}
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.7, 0, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
      <Badge className={cn('relative', className)} {...props}>
        {children}
      </Badge>
    </div>
  );
}

// New badge with pulsing dot
export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="default"
      className={cn(
        'bg-green-500 hover:bg-green-600 gap-1.5',
        className
      )}
    >
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-white"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.7, 1],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      Nuevo
    </Badge>
  );
}

// Notification dot with bounce
export function NotificationDot({
  count,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white',
        className
      )}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 20,
      }}
    >
      {count && count > 99 ? '99+' : count}
    </motion.span>
  );
}
