import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

interface EnhancedFormControlProps {
  children: React.ReactNode;
  error?: string;
  isValid?: boolean;
  isTouched?: boolean;
  showValidationIcon?: boolean;
  className?: string;
}

/**
 * Wraps any form input with validation icons and error state styling
 */
export function EnhancedFormControl({
  children,
  error,
  isValid,
  isTouched = false,
  showValidationIcon = true,
  className,
}: EnhancedFormControlProps) {
  const showError = error && isTouched;
  const showSuccess = isValid && isTouched && !error;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          '[&>input]:transition-all [&>input]:duration-200 [&>textarea]:transition-all [&>textarea]:duration-200',
          showError && '[&>input]:border-destructive [&>input]:focus-visible:border-destructive [&>input]:focus-visible:ring-destructive/20',
          showError && '[&>textarea]:border-destructive [&>textarea]:focus-visible:border-destructive [&>textarea]:focus-visible:ring-destructive/20',
          showSuccess && '[&>input]:border-success [&>input]:focus-visible:border-success [&>input]:focus-visible:ring-success/20',
          showSuccess && '[&>textarea]:border-success [&>textarea]:focus-visible:border-success [&>textarea]:focus-visible:ring-success/20'
        )}
      >
        {children}
      </div>
      {showValidationIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <AnimatePresence mode="wait">
            {showError && (
              <motion.div
                key="error"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <X className="h-4 w-4 text-destructive" />
              </motion.div>
            )}
            {showSuccess && (
              <motion.div
                key="success"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Check className="h-4 w-4 text-success" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface EnhancedFormMessageProps {
  error?: string;
  hint?: string;
  showError?: boolean;
}

/**
 * Animated error/hint message for form fields
 */
export function EnhancedFormMessage({ error, hint, showError = true }: EnhancedFormMessageProps) {
  return (
    <AnimatePresence mode="wait">
      {error && showError ? (
        <motion.p
          key="error"
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="text-xs text-destructive flex items-center gap-1 mt-1"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </motion.p>
      ) : hint ? (
        <motion.p
          key="hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs text-muted-foreground mt-1"
        >
          {hint}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

interface EnhancedLabelProps {
  children: React.ReactNode;
  required?: boolean;
  error?: boolean;
  focused?: boolean;
  htmlFor?: string;
  className?: string;
}

/**
 * Form label with required indicator and state styling
 */
export function EnhancedLabel({
  children,
  required,
  error,
  focused,
  htmlFor,
  className,
}: EnhancedLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        'transition-colors duration-200 flex items-center gap-1',
        focused && 'text-primary',
        error && 'text-destructive',
        className
      )}
    >
      {children}
      {required && <span className="text-destructive">*</span>}
    </label>
  );
}
