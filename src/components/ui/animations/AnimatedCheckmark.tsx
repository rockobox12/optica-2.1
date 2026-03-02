import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCheckmarkProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
  color?: string;
}

export function AnimatedCheckmark({
  size = 24,
  strokeWidth = 3,
  className,
  color = 'currentColor',
}: AnimatedCheckmarkProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-green-500', className)}
      initial="hidden"
      animate="visible"
    >
      {/* Circle */}
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.4, ease: 'easeOut' },
          },
        }}
      />
      {/* Checkmark */}
      <motion.path
        d="M7 12.5l3 3 7-7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.3, delay: 0.3, ease: 'easeOut' },
          },
        }}
      />
    </motion.svg>
  );
}

interface AnimatedXProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AnimatedX({
  size = 24,
  strokeWidth = 3,
  className,
}: AnimatedXProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('text-red-500', className)}
      initial="hidden"
      animate="visible"
    >
      {/* Circle */}
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.4, ease: 'easeOut' },
          },
        }}
      />
      {/* X mark */}
      <motion.path
        d="M8 8l8 8M16 8l-8 8"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        variants={{
          hidden: { pathLength: 0, opacity: 0 },
          visible: {
            pathLength: 1,
            opacity: 1,
            transition: { duration: 0.3, delay: 0.3, ease: 'easeOut' },
          },
        }}
      />
    </motion.svg>
  );
}
