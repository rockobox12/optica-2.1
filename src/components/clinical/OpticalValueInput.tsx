import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus, Minus } from 'lucide-react';

interface OpticalValueInputProps {
  label: string;
  value: string;
  sign: '+' | '-' | '';
  onChange: (value: string, sign: '+' | '-' | '') => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  step?: string;
  className?: string;
  tabIndex?: number;
}

export function OpticalValueInput({
  label,
  value,
  sign,
  onChange,
  onBlur,
  error,
  placeholder = '0.00',
  step = '0.25',
  className,
  tabIndex,
}: OpticalValueInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value !== '' && value !== '0' && parseFloat(value) !== 0;
  const needsSign = hasValue && sign === '';

  const handleSignChange = (newSign: '+' | '-') => {
    // Toggle off if clicking the same sign, or set the new sign
    const finalSign = sign === newSign ? '' : newSign;
    onChange(value, finalSign);
  };

  const handleValueChange = (newValue: string) => {
    // Clean the value - remove any signs that might be entered
    const cleanValue = newValue.replace(/[+-]/g, '');
    onChange(cleanValue, sign);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
      {/* Sign Buttons */}
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleSignChange('+')}
            className={cn(
              'h-4 w-6 flex items-center justify-center rounded-sm text-xs font-bold transition-colors',
              sign === '+' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleSignChange('-')}
            className={cn(
              'h-4 w-6 flex items-center justify-center rounded-sm text-xs font-bold transition-colors',
              sign === '-' 
                ? 'bg-destructive text-destructive-foreground' 
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            )}
          >
            <Minus className="h-3 w-3" />
          </button>
        </div>
        
        {/* Value Input */}
        <Input
          ref={inputRef}
          type="number"
          step={step}
          min="0"
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          tabIndex={tabIndex}
          className={cn(
            'h-9 flex-1',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
      
      {/* Sign Required Indicator */}
      {needsSign && !error && (
        <p className="text-xs text-warning font-medium animate-in fade-in">
          Selecciona + o −
        </p>
      )}
    </div>
  );
}
