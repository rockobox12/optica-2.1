import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ValidatedInputProps extends React.ComponentProps<'input'> {
  label?: string;
  error?: string;
  isValid?: boolean;
  hint?: string;
  showValidationIcon?: boolean;
  touched?: boolean;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ className, label, error, isValid, hint, showValidationIcon = true, touched = false, required, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    const [hasBlurred, setHasBlurred] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasBlurred(true);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    // Show error only after blur or if touched prop is true
    const shouldShowError = error && (hasBlurred || touched) && !isFocused;
    const shouldShowSuccess = isValid && hasValue && !error && (hasBlurred || touched);

    return (
      <div className="space-y-1.5">
        {label && (
          <Label
            className={cn(
              'transition-colors duration-200 flex items-center gap-1',
              isFocused && 'text-primary',
              shouldShowError && 'text-destructive'
            )}
          >
            {label}
            {required && <span className="text-destructive">*</span>}
          </Label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            required={required}
            className={cn(
              'pr-10 transition-all duration-200',
              shouldShowError && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
              shouldShowSuccess && 'border-success focus-visible:border-success focus-visible:ring-success/20',
              className
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />
          {showValidationIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AnimatePresence mode="wait">
                {shouldShowError && (
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
                {shouldShowSuccess && (
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
        <AnimatePresence>
          {shouldShowError && (
            <motion.p
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="text-xs text-destructive flex items-center gap-1"
            >
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              {error}
            </motion.p>
          )}
          {hint && !shouldShowError && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground"
            >
              {hint}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';
