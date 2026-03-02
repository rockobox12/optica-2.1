/**
 * SmartDateInput - Unified Date Input Component
 * 
 * Uses masked input dd/MM/yyyy format without calendar popup.
 * This is a wrapper around MaskedDateInput for backward compatibility.
 */

import { MaskedDateInput, DateInputMode as MaskedDateInputMode } from './MaskedDateInput';

export type DateInputMode = MaskedDateInputMode;

interface SmartDateInputProps {
  value: string; // ISO format: yyyy-MM-dd
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  placeholder?: string;
  mode?: DateInputMode;
  showAge?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SmartDateInput({ 
  value, 
  onChange, 
  error, 
  label,
  placeholder,
  mode = 'general',
  showAge = false,
  disabled = false,
  className,
}: SmartDateInputProps) {
  return (
    <MaskedDateInput
      value={value}
      onChange={onChange}
      error={error}
      label={label}
      placeholder={placeholder}
      mode={mode}
      showAge={showAge}
      disabled={disabled}
      className={className}
    />
  );
}

// Re-export utilities from smart-date-parser for backward compatibility
export { parseFlexibleDate, formatToDisplay } from '@/lib/smart-date-parser';
