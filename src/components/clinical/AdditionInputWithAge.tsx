import { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Lightbulb, Info, AlertTriangle } from 'lucide-react';
import { useAddClinicalConfig, calculateAge } from '@/hooks/useAddClinicalConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdditionInputWithAgeProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  className?: string;
  tabIndex?: number;
  sphereHasValue?: boolean;
  patientBirthDate?: string | null;
}

/**
 * Enhanced AdditionInput component with age-based rules:
 * - Shows/hides based on patient age
 * - Provides age-based suggestions
 * - Validates according to clinical config
 */
export function AdditionInputWithAge({
  label = 'Adición',
  value,
  onChange,
  onBlur,
  error: externalError,
  className,
  tabIndex,
  sphereHasValue,
  patientBirthDate,
}: AdditionInputWithAgeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const { config, loading, getSuggestionForAge, shouldShowAdd } = useAddClinicalConfig();
  
  const patientAge = calculateAge(patientBirthDate ?? null);
  const addVisibility = shouldShowAdd(patientAge);
  const suggestedValue = patientAge ? getSuggestionForAge(patientAge) : null;

  // Get config values or defaults
  const addMin = config?.add_min ?? 0.50;
  const addMax = config?.add_max ?? 3.50;
  const addStep = config?.add_step ?? 0.25;

  // Validate on value change
  useEffect(() => {
    if (touched && value) {
      const validation = validateAddValue(value, addMin, addMax, addStep);
      setLocalError(validation.error);
    } else {
      setLocalError(undefined);
    }
  }, [value, touched, addMin, addMax, addStep]);

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

  const handleApplySuggestion = () => {
    if (suggestedValue) {
      onChange(suggestedValue.toFixed(2));
    }
  };

  // Show loading state while fetching config
  if (loading) {
    return (
      <div className={cn('space-y-1', className)}>
        <Label className="text-xs">{label}</Label>
        <div className="h-9 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {patientAge !== null && (
          <span className="text-xs text-muted-foreground">
            {patientAge} años
          </span>
        )}
      </div>
      
      {/* Age-based warning banner */}
      {addVisibility.warning && (
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
          addVisibility.disabled 
            ? 'bg-muted text-muted-foreground' 
            : 'bg-warning/10 text-warning'
        )}>
          {addVisibility.disabled ? (
            <Info className="h-3 w-3 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          )}
          <span>{addVisibility.warning}</span>
        </div>
      )}
      
      {/* Input field */}
      <div className="relative flex items-center">
        {/* Fixed positive sign indicator */}
        <div className={cn(
          'absolute left-0 h-9 w-7 flex items-center justify-center rounded-l-md border border-r-0 text-xs font-bold',
          'bg-primary/10 text-primary border-input',
          hasError && 'border-destructive bg-destructive/10 text-destructive',
          addVisibility.disabled && 'opacity-50'
        )}>
          <Plus className="h-3.5 w-3.5" />
        </div>
        
        {/* Value Input */}
        <Input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          step={addStep.toString()}
          min="0"
          max={addMax.toString()}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="1.50"
          tabIndex={tabIndex}
          disabled={addVisibility.disabled}
          className={cn(
            'h-9 pl-8',
            hasError && 'border-destructive focus-visible:ring-destructive',
            addVisibility.disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>
      
      {/* Age-based suggestion */}
      {suggestedValue && !addVisibility.disabled && config?.mostrar_sugerencia_add && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-accent/50 border border-accent">
          <div className="flex items-center gap-1.5 text-xs">
            <Lightbulb className="h-3.5 w-3.5 text-accent-foreground" />
            <span>
              Sugerencia por edad: <strong>+{suggestedValue.toFixed(2)}</strong>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleApplySuggestion}
          >
            Aplicar
          </Button>
        </div>
      )}
      
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
      {!displayError && !sphereWarning && !addVisibility.warning && !suggestedValue && (
        <p className="text-xs text-muted-foreground">
          ADD siempre es positivo
        </p>
      )}
    </div>
  );
}

/**
 * Validates ADD value according to configurable clinical rules
 */
function validateAddValue(
  value: string, 
  min: number, 
  max: number, 
  step: number
): { isValid: boolean; error?: string } {
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
  if (numValue > 0 && numValue < min) {
    return { isValid: false, error: `ADD mínimo es +${min.toFixed(2)}` };
  }

  // Check maximum value
  if (numValue > max) {
    return { isValid: false, error: `ADD máximo es +${max.toFixed(2)}` };
  }

  // Check step increments
  const remainder = (numValue * 100) % (step * 100);
  if (numValue > 0 && remainder !== 0) {
    return { isValid: false, error: `ADD debe ser en incrementos de ${step}` };
  }

  return { isValid: true };
}
