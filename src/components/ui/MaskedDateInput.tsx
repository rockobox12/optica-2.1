import { useState, useCallback, useEffect, useRef } from 'react';
import { isValid, differenceInYears } from 'date-fns';
import { AlertCircle, Check, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type DateInputMode = 'birthdate' | 'appointment' | 'delivery' | 'payment' | 'general';

interface MaskedDateInputProps {
  value: string; // ISO format: yyyy-MM-dd
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  mode?: DateInputMode;
  showAge?: boolean;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

const MODE_CONFIG: Record<DateInputMode, { allowFuture: boolean; allowPast: boolean }> = {
  birthdate: { allowFuture: false, allowPast: true },
  appointment: { allowFuture: true, allowPast: true },
  delivery: { allowFuture: true, allowPast: true },
  payment: { allowFuture: true, allowPast: true },
  general: { allowFuture: true, allowPast: true },
};

/**
 * Parse ISO date (yyyy-MM-dd) to display format (dd/MM/yyyy)
 */
function isoToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Parse display format (dd/MM/yyyy) to ISO (yyyy-MM-dd)
 */
function displayToIso(display: string): string | null {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Apply mask to input value
 */
function applyMask(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Apply mask: dd/MM/yyyy
  let masked = '';
  for (let i = 0; i < digits.length && i < 8; i++) {
    if (i === 2 || i === 4) {
      masked += '/';
    }
    masked += digits[i];
  }
  
  return masked;
}

/**
 * Validate the date
 */
function validateDate(
  day: number, 
  month: number, 
  year: number, 
  allowFuture: boolean,
  allowPast: boolean
): { valid: boolean; error?: string } {
  // Basic range checks
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Mes inválido (01-12)' };
  }
  
  if (year < 1900 || year > 2100) {
    return { valid: false, error: 'Año fuera de rango (1900-2100)' };
  }
  
  // Check days in month
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) {
    return { valid: false, error: `Día inválido para ese mes (máx. ${daysInMonth})` };
  }
  
  // Create date object to validate
  const date = new Date(year, month - 1, day);
  if (!isValid(date)) {
    return { valid: false, error: 'Fecha inválida' };
  }
  
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  // Check future dates
  if (!allowFuture && date > today) {
    return { valid: false, error: 'No se permiten fechas futuras' };
  }
  
  return { valid: true };
}

/**
 * Parse a masked value and validate it
 */
function parseAndValidate(
  maskedValue: string,
  allowFuture: boolean,
  allowPast: boolean
): { 
  valid: boolean; 
  isoDate?: string; 
  error?: string;
  date?: Date;
} {
  // Check if complete (dd/MM/yyyy = 10 chars)
  if (maskedValue.length !== 10) {
    return { valid: false };
  }
  
  const match = maskedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return { valid: false, error: 'Formato inválido. Usa dd/MM/aaaa' };
  }
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  const validation = validateDate(day, month, year, allowFuture, allowPast);
  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }
  
  const date = new Date(year, month - 1, day);
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  return { valid: true, isoDate, date };
}

export function MaskedDateInput({ 
  value, 
  onChange, 
  error: externalError, 
  label,
  placeholder = 'dd/MM/aaaa (ej. 12/03/1964)',
  mode = 'general',
  showAge = false,
  disabled = false,
  className,
  required = false,
}: MaskedDateInputProps) {
  const config = MODE_CONFIG[mode];
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Initialize display value from ISO value
  const [displayValue, setDisplayValue] = useState(() => isoToDisplay(value));
  const [validationState, setValidationState] = useState<{
    valid: boolean;
    error?: string;
    date?: Date;
  }>({ valid: !!value });
  const [isFocused, setIsFocused] = useState(false);
  
  // Sync when value changes externally
  useEffect(() => {
    const newDisplay = isoToDisplay(value);
    if (newDisplay !== displayValue) {
      setDisplayValue(newDisplay);
      if (value) {
        setValidationState({ valid: true });
      }
    }
  }, [value]);
  
  // Calculate age for birthdate mode
  const age = showAge && validationState.date 
    ? differenceInYears(new Date(), validationState.date) 
    : null;
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    // Apply mask
    const masked = applyMask(rawValue);
    setDisplayValue(masked);
    
    // Validate and update ISO value
    const result = parseAndValidate(masked, config.allowFuture, config.allowPast);
    setValidationState(result);
    
    if (result.valid && result.isoDate) {
      onChange(result.isoDate);
    } else if (masked.length === 0) {
      onChange('');
    }
    
    // Restore cursor position after mask application
    requestAnimationFrame(() => {
      if (inputRef.current) {
        // Calculate new cursor position based on how many slashes were added
        const digitsBeforeCursor = rawValue.slice(0, cursorPosition).replace(/\D/g, '').length;
        let newPosition = digitsBeforeCursor;
        if (digitsBeforeCursor > 2) newPosition++;
        if (digitsBeforeCursor > 4) newPosition++;
        inputRef.current.setSelectionRange(newPosition, newPosition);
      }
    });
  }, [config.allowFuture, config.allowPast, onChange]);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    
    // Final validation on blur
    if (displayValue && displayValue.length > 0 && displayValue.length < 10) {
      setValidationState({ 
        valid: false, 
        error: 'Fecha incompleta. Usa dd/MM/aaaa' 
      });
    }
  }, [displayValue]);
  
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      return;
    }
    
    // Only allow digits
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }, []);
  
  const showError = (validationState.error && !isFocused && displayValue.length > 0) || externalError;
  const showSuccess = validationState.valid && displayValue.length === 10 && !showError;
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="masked-date-input">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="masked-date-input"
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={10}
          className={cn(
            "pr-10 h-11",
            showError && "border-destructive focus-visible:ring-destructive",
            showSuccess && "border-primary focus-visible:ring-primary"
          )}
          autoComplete="off"
        />
        
        {/* Status indicator */}
        <div className="absolute right-3 top-0 h-full flex items-center">
          {showSuccess && (
            <Check className="h-4 w-4 text-primary" />
          )}
          {showError && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
      </div>
      
      {/* Feedback area */}
      <div className="min-h-[20px]">
        {/* Help text when focused and empty */}
        {isFocused && !displayValue && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <HelpCircle className="h-3 w-3" />
            Formato: dd/MM/aaaa
          </p>
        )}
        
        {/* Validation error */}
        {showError && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {validationState.error || externalError}
          </p>
        )}
        
        {/* Success with age display */}
        {showSuccess && showAge && age !== null && (
          <p className="text-xs text-muted-foreground">
            Edad: <span className="font-medium">{age} años</span>
          </p>
        )}
      </div>
    </div>
  );
}

// Time input component for appointments/deliveries
interface MaskedTimeInputProps {
  value: string; // HH:mm format
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export function MaskedTimeInput({
  value,
  onChange,
  error: externalError,
  label,
  placeholder = 'HH:mm (ej. 09:30)',
  disabled = false,
  className,
  required = false,
}: MaskedTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(value || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  useEffect(() => {
    if (value !== displayValue) {
      setDisplayValue(value || '');
    }
  }, [value]);
  
  const applyTimeMask = (val: string): string => {
    const digits = val.replace(/\D/g, '');
    let masked = '';
    for (let i = 0; i < digits.length && i < 4; i++) {
      if (i === 2) {
        masked += ':';
      }
      masked += digits[i];
    }
    return masked;
  };
  
  const validateTime = (timeStr: string): { valid: boolean; error?: string } => {
    if (timeStr.length !== 5) {
      return { valid: false };
    }
    
    const match = timeStr.match(/^(\d{2}):(\d{2})$/);
    if (!match) {
      return { valid: false, error: 'Formato inválido. Usa HH:mm' };
    }
    
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    
    if (hours < 0 || hours > 23) {
      return { valid: false, error: 'Hora inválida (00-23)' };
    }
    
    if (minutes < 0 || minutes > 59) {
      return { valid: false, error: 'Minutos inválidos (00-59)' };
    }
    
    return { valid: true };
  };
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyTimeMask(e.target.value);
    setDisplayValue(masked);
    
    const validation = validateTime(masked);
    setValidationError(validation.error || null);
    
    if (validation.valid) {
      onChange(masked);
    }
  }, [onChange]);
  
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (displayValue && displayValue.length > 0 && displayValue.length < 5) {
      setValidationError('Hora incompleta. Usa HH:mm');
    }
  }, [displayValue]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Escape' ||
      e.key === 'Enter' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'Home' ||
      e.key === 'End'
    ) {
      return;
    }
    
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }, []);
  
  const showError = (validationError && !isFocused && displayValue.length > 0) || externalError;
  const showSuccess = !validationError && displayValue.length === 5 && !showError;
  
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={5}
          className={cn(
            "pr-10 h-11",
            showError && "border-destructive focus-visible:ring-destructive",
            showSuccess && "border-primary focus-visible:ring-primary"
          )}
          autoComplete="off"
        />
        
        <div className="absolute right-3 top-0 h-full flex items-center">
          {showSuccess && <Check className="h-4 w-4 text-primary" />}
          {showError && <AlertCircle className="h-4 w-4 text-destructive" />}
        </div>
      </div>
      
      {showError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {validationError || externalError}
        </p>
      )}
    </div>
  );
}
