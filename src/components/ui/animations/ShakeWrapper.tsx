import { motion, useAnimation } from 'framer-motion';
import { ReactNode, useEffect, forwardRef, useImperativeHandle } from 'react';

interface ShakeWrapperProps {
  children: ReactNode;
  className?: string;
  trigger?: boolean;
  intensity?: 'light' | 'medium' | 'strong';
}

export interface ShakeWrapperRef {
  shake: () => void;
}

export const ShakeWrapper = forwardRef<ShakeWrapperRef, ShakeWrapperProps>(
  ({ children, className, trigger, intensity = 'medium' }, ref) => {
    const controls = useAnimation();

    const intensityValues = {
      light: [-2, 2, -2, 2, 0],
      medium: [-4, 4, -4, 4, -2, 2, 0],
      strong: [-8, 8, -8, 8, -4, 4, -2, 2, 0],
    };

    const shake = async () => {
      await controls.start({
        x: intensityValues[intensity],
        transition: {
          duration: 0.4,
          ease: 'easeInOut',
        },
      });
    };

    useImperativeHandle(ref, () => ({
      shake,
    }));

    useEffect(() => {
      if (trigger) {
        shake();
      }
    }, [trigger]);

    return (
      <motion.div animate={controls} className={className}>
        {children}
      </motion.div>
    );
  }
);

ShakeWrapper.displayName = 'ShakeWrapper';
