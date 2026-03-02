import React, { Suspense, ComponentType, lazy } from 'react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Default loading fallback
function DefaultFallback() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center min-h-[200px]"
    >
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <div className="flex justify-center gap-2 pt-4">
          <motion.div
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-primary"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Wrapper component for lazy loaded modules
export function LazyLoader({ children, fallback }: LazyLoaderProps) {
  return (
    <Suspense fallback={fallback || <DefaultFallback />}>
      {children}
    </Suspense>
  );
}

// Helper to create lazy components with custom fallbacks
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);
  
  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <LazyLoader fallback={fallback}>
        <LazyComponent {...props} />
      </LazyLoader>
    );
  };
}

// Preload utility for route transitions
export function preloadComponent(importFn: () => Promise<any>) {
  importFn().catch(() => {
    // Silently fail - component will load on demand
  });
}

// Image lazy loading component
interface LazyImageProps {
  src?: string;
  alt?: string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: string;
}

export function LazyImage({ 
  src, 
  alt = '', 
  className, 
  fallbackSrc = '/placeholder.svg',
  aspectRatio,
}: LazyImageProps) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  return (
    <div 
      className={`relative overflow-hidden ${className || ''}`}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {!loaded && !error && (
        <Skeleton className="absolute inset-0" />
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="w-full h-full"
      >
        <img
          src={error ? fallbackSrc : src}
          alt={alt}
          loading="lazy"
          className="w-full h-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </motion.div>
    </div>
  );
}
