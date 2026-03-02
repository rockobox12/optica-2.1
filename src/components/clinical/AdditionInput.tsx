import { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface AdditionInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  className?: string;
  tabIndex?: number;
  sphereHasValue?: boolean;
}

// ADD validation constants
const ADD_MIN = 0.50;
const ADD_MAX = 3.50;
const ADD_STEP = 0.25;

/**
 * Validates ADD value according to clinical rules:
 * - Must be positive
 * - Range: +0.50 to +3.50
 * - Increments of 0.25
 */
export function validateAddValue(value: string): { isValid: boolean; error?: string } {
  // Empty is allowed (optional field)
  if (!value || value.trim() === '') {
    return { isValid: true };
  }

  // Check for negative sign
  if (value.includes('-')) {
    return { isValid: false, error: 'ADD siempre es positivo (+)' };
  }

  const numValue = parseFloat(value);

  // Check if it's a valid number
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Ingresa un valor numérico válido' };
  }

  // Check if it's negative
  if (numValue < 0) {
    return { isValid: false, error: 'ADD siempre es positivo (+)' };
  }

  // Check minimum value if not empty
  if (numValue > 0 && numValue < ADD_MIN) {
    return { isValid: false, error: `ADD mínimo es +${ADD_MIN.toFixed(2)}` };
  }

  // Check maximum value
  if (numValue > ADD_MAX) {
    return { isValid: false, error: `ADD máximo es +${ADD_MAX.toFixed(2)}` };
  }

  // Check step increments (should be multiples of 0.25)
  const remainder = (numValue * 100) % (ADD_STEP * 100);
  if (numValue > 0 && remainder !== 0) {
    return { isValid: false, error: 'ADD debe ser en incrementos de 0.25' };
  }

  return { isValid: true };
}

/**
 * Parse ADD value for database storage
 * Always returns positive value or null
 */
export function parseAddValue(value: string): number | null {
  if (!value || value.trim() === '') return null;
  
  // Remove any sign characters
  const cleanValue = value.replace(/[+-]/g, '').trim();
  const numValue = parseFloat(cleanValue);
  
  if (isNaN(numValue) || numValue <= 0) return null;
  
  return Math.abs(numValue);
}

export function AdditionInput({
  label = 'Adición',
  value,
  onChange,
  onBlur,
  error: externalError,
  className,
  tabIndex,
  sphereHasValue,
}: AdditionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  // Validate on value change
  useEffect(() => {
    if (touched) {
      const validation = validateAddValue(value);
      setLocalError(validation.error);
    }
  }, [value, touched]);

  // Check if ADD has value but sphere doesn't (clinical rule)
  const sphereWarning = value && parseFloat(value) > 0 && !sphereHasValue
    ? 'Se recomienda tener Esfera si hay ADD'
    : undefined;

  const displayError = externalError || localError;
  const hasError = !!displayError;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Block negative input immediately
    if (newValue.includes('-')) {
      setLocalError('ADD siempre es positivo (+)');
      setTouched(true);
      return;
    }
    
    // Remove any extra characters, keep only numbers and decimal
    newValue = newValue.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimals
    const parts = newValue.split('.');
    if (parts.length > 2) {
      newValue = parts[0] + '.' + parts.slice(1).join('');
    }
    
    onChange(newValue);
  };

  const handleBlur = () => {
    setTouched(true);
    
    // Format value on blur
    if (value && !isNaN(parseFloat(value))) {
      const numValue = parseFloat(value);
      if (numValue > 0) {
        onChange(numValue.toFixed(2));
      }
    }
    
    onBlur?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block minus key
    if (e.key === '-') {
      e.preventDefault();
      setLocalError('ADD siempre es positivo (+)');
      setTouched(true);
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs">{label}</Label>
      <div className="relative flex items-center">
        {/* Fixed positive sign indicator */}
        <div className={cn(
          'absolute left-0 h-9 w-7 flex items-center justify-center rounded-l-md border border-r-0 text-xs font-bold',
          'bg-primary/10 text-primary border-input',
          hasError && 'border-destructive bg-destructive/10 text-destructive'
        )}>
          <Plus className="h-3.5 w-3.5" />
        </div>
        
        {/* Value Input */}
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          step={ADD_STEP.toString()}
          min="0"
          max={ADD_MAX.toString()}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="1.50"
          tabIndex={tabIndex}
          className={cn(
            'h-9 pl-8',
            hasError && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>
      
      {/* Error Message */}
      {displayError && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
          {displayError}
        </p>
      )}
      
      {/* Sphere Warning (non-blocking) */}
      {sphereWarning && !displayError && (
        <p className="text-xs text-warning font-medium animate-in fade-in">
          {sphereWarning}
        </p>
      )}
      
      {/* Help text */}
      {!displayError && !sphereWarning && (
        <p className="text-xs text-muted-foreground">
          ADD siempre es positivo
        </p>
      )}
    </div>
  );
}
