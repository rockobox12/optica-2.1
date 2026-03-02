import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';
import { Controller, Control, FieldValues, Path, FieldError } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ValidatedFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  showValidationIcon?: boolean;
  className?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
}

export function ValidatedFormField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  required = false,
  hint,
  showValidationIcon = true,
  className,
  disabled = false,
  multiline = false,
  rows = 3,
  min,
  max,
  step,
}: ValidatedFormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const { error, isTouched, isDirty } = fieldState;
        const hasValue = field.value !== undefined && field.value !== '' && field.value !== null;
        const isValid = !error && hasValue && (isTouched || isDirty);
        const showError = error && isTouched;

        return (
          <div className={cn('space-y-1.5', className)}>
            {label && (
              <Label
                htmlFor={name}
                className={cn(
                  'transition-colors duration-200 flex items-center gap-1',
                  showError && 'text-destructive'
                )}
              >
                {label}
                {required && <span className="text-destructive">*</span>}
              </Label>
            )}
            <div className="relative">
              {multiline ? (
                <Textarea
                  id={name}
                  placeholder={placeholder}
                  disabled={disabled}
                  rows={rows}
                  className={cn(
                    'transition-all duration-200',
                    showError && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                    isValid && 'border-success focus-visible:border-success focus-visible:ring-success/20'
                  )}
                  {...field}
                  value={field.value ?? ''}
                />
              ) : (
                <Input
                  id={name}
                  type={type}
                  placeholder={placeholder}
                  disabled={disabled}
                  min={min}
                  max={max}
                  step={step}
                  className={cn(
                    'pr-10 transition-all duration-200',
                    showError && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20',
                    isValid && 'border-success focus-visible:border-success focus-visible:ring-success/20'
                  )}
                  {...field}
                  value={field.value ?? ''}
                />
              )}
              {showValidationIcon && !multiline && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
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
                    {isValid && (
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
              {showError && (
                <motion.p
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="text-xs text-destructive flex items-center gap-1"
                >
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  {error?.message}
                </motion.p>
              )}
              {hint && !showError && (
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
      }}
    />
  );
}

// Enhanced FormMessage with animation
export function AnimatedFormMessage({ error }: { error?: FieldError | string }) {
  const message = typeof error === 'string' ? error : error?.message;
  
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          className="text-xs text-destructive flex items-center gap-1 mt-1"
        >
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

// Validation status icon component
export function ValidationIcon({ isValid, hasError }: { isValid?: boolean; hasError?: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {hasError && (
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
      {isValid && !hasError && (
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
  );
}
