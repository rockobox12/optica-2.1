import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animations';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor?: string;
  animate?: boolean;
  delay?: number;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor = 'bg-primary/10 text-primary',
  animate = true,
  delay = 0,
}: StatCardProps) {
  // Parse numeric value for animation
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  const prefix = value.match(/^[^0-9]*/)?.[0] || '';
  const suffix = value.match(/[^0-9]*$/)?.[0] || '';
  const hasNumeric = !isNaN(numericValue);

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 20, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: delay * 0.1,
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      whileHover={{
        scale: 1.02,
        y: -2,
        transition: { duration: 0.2 },
      }}
      className="bg-card rounded-xl p-6 sm:p-6 border border-border shadow-sm hover:shadow-lg transition-shadow duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-display font-bold text-foreground">
            {animate && hasNumeric ? (
              <AnimatedCounter
                value={numericValue}
                prefix={prefix}
                suffix={suffix}
                decimals={value.includes('.') ? 2 : 0}
                duration={1.2}
              />
            ) : (
              value
            )}
          </p>
          {change && (
            <motion.p
              initial={animate ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay * 0.1 + 0.3 }}
              className={cn(
                'text-xs font-medium',
                changeType === 'positive' && 'text-success',
                changeType === 'negative' && 'text-destructive',
                changeType === 'neutral' && 'text-muted-foreground'
              )}
            >
              {change}
            </motion.p>
          )}
        </div>
        <motion.div
          initial={animate ? { opacity: 0, scale: 0 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: delay * 0.1 + 0.2,
            type: 'spring',
            stiffness: 400,
            damping: 20,
          }}
          className={cn('p-3 rounded-lg', iconColor)}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
    </motion.div>
  );
}
