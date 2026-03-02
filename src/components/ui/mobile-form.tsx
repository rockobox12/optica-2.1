import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';

// Mobile-optimized input with larger touch target
interface MobileInputProps extends React.ComponentProps<typeof Input> {
  label?: string;
  error?: string;
  inputMode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
}

export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ className, label, error, id, inputMode, type, ...props }, ref) => {
    const inputId = id || React.useId();
    const isMobile = useIsMobile();

    // Determine appropriate inputMode based on type - computed unconditionally
    const computedInputMode = React.useMemo(() => 
      inputMode || (type === 'number' ? 'decimal' : 
      type === 'tel' ? 'tel' :
      type === 'email' ? 'email' : 
      type === 'url' ? 'url' : 'text'), [inputMode, type]);

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn(isMobile && 'text-base')}>
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          id={inputId}
          type={type}
          inputMode={computedInputMode}
          className={cn(
            // Mobile: larger touch target (48px min)
            isMobile && 'h-12 text-base px-4',
            error && 'border-destructive focus-visible:ring-destructive/20',
            className
          )}
          {...props}
        />
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);
MobileInput.displayName = 'MobileInput';

// Mobile form container with generous spacing
interface MobileFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export function MobileForm({ className, children, ...props }: MobileFormProps) {
  const isMobile = useIsMobile();

  return (
    <form
      className={cn(
        'space-y-4',
        isMobile && 'space-y-5 pb-24', // Extra space for sticky buttons
        className
      )}
      {...props}
    >
      {children}
    </form>
  );
}

// Sticky action buttons for mobile
interface MobileFormActionsProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileFormActions({ children, className }: MobileFormActionsProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <div className={cn('flex gap-3 pt-4', className)}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border',
        'px-4 py-3 safe-area-bottom',
        className
      )}
    >
      <div className="flex gap-3 max-w-lg mx-auto">{children}</div>
    </motion.div>
  );
}

// Full-width mobile button
interface MobileButtonProps extends React.ComponentProps<typeof Button> {
  fullWidthOnMobile?: boolean;
}

export function MobileButton({
  className,
  fullWidthOnMobile = true,
  children,
  ...props
}: MobileButtonProps) {
  const isMobile = useIsMobile();

  return (
    <Button
      className={cn(
        isMobile && fullWidthOnMobile && 'w-full h-12 text-base',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

// Form field group with horizontal layout on desktop
interface FormFieldGroupProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function FormFieldGroup({ children, columns = 2, className }: FormFieldGroupProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'grid gap-4',
        !isMobile && columns === 2 && 'grid-cols-2',
        !isMobile && columns === 3 && 'grid-cols-3',
        !isMobile && columns === 4 && 'grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// Pull to refresh wrapper
interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const threshold = 80;
  const startY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY.current);
    setPullDistance(Math.min(distance * 0.5, threshold * 1.5));
  };

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 -top-2 z-10"
        style={{ y: pullDistance }}
        animate={{
          scale: pullDistance >= threshold ? 1.2 : 1,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
      >
        <div
          className={cn(
            'w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center bg-background',
            isRefreshing && 'animate-spin'
          )}
        >
          <motion.div
            className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
            animate={{ rotate: isRefreshing ? 360 : pullDistance * 2 }}
            transition={{ duration: isRefreshing ? 0.8 : 0, repeat: isRefreshing ? Infinity : 0 }}
          />
        </div>
      </motion.div>

      <motion.div style={{ y: isPulling ? pullDistance * 0.3 : 0 }}>
        {children}
      </motion.div>
    </div>
  );
}
