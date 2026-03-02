import { useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AxisInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: string;
  className?: string;
  tabIndex?: number;
  focusOnError?: boolean;
}

export function AxisInput({
  label = 'Eje°',
  value,
  onChange,
  onBlur,
  required = false,
  error,
  className,
  tabIndex,
  focusOnError = false,
}: AxisInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnError && error && inputRef.current) {
      inputRef.current.focus();
    }
  }, [focusOnError, error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Only allow numbers 0-180
    if (newValue === '' || (parseInt(newValue) >= 0 && parseInt(newValue) <= 180)) {
      onChange(newValue);
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-xs flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        ref={inputRef}
        type="number"
        min="1"
        max="180"
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder="1-180"
        tabIndex={tabIndex}
        className={cn(
          'h-9',
          error && 'border-destructive focus-visible:ring-destructive'
        )}
      />
      
      {/* Error Message */}
      {error && (
        <p className="text-xs text-destructive font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
