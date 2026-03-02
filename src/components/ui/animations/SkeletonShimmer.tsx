import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SkeletonShimmerProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function SkeletonShimmer({
  className,
  width,
  height,
}: SkeletonShimmerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        className
      )}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{
          translateX: ['−100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonShimmer
            key={`header-${i}`}
            className="h-8 flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <motion.div
          key={`row-${rowIndex}`}
          className="flex gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: rowIndex * 0.05 }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonShimmer
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-12 flex-1"
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
  hasImage?: boolean;
}

export function CardSkeleton({ className, hasImage = false }: CardSkeletonProps) {
  return (
    <motion.div
      className={cn(
        'rounded-lg border bg-card p-4 space-y-3',
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {hasImage && <SkeletonShimmer className="h-32 w-full rounded-md" />}
      <SkeletonShimmer className="h-5 w-3/4" />
      <SkeletonShimmer className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <SkeletonShimmer className="h-8 w-20" />
        <SkeletonShimmer className="h-8 w-20" />
      </div>
    </motion.div>
  );
}
