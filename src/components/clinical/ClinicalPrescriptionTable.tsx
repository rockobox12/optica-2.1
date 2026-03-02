import { useRef, useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Lightbulb, AlertTriangle, Check } from 'lucide-react';
import { useIsMobile, useIsTablet } from '@/hooks/use-mobile';
import { useAddClinicalConfig, calculateAge } from '@/hooks/useAddClinicalConfig';
import { hasValue, formatOpticalValue, type ValidationErrors } from '@/lib/prescription-validation';

interface EyeFormData {
  sphereValue: string;
  sphereSign: '+' | '-' | '';
  cylinderValue: string;
  cylinderSign: '+' | '-' | '';
  axis: string;
  add: string;
  pupilDistance: string;
  alt: string;
}

interface ClinicalPrescriptionTableProps {
  odData: EyeFormData;
  oiData: EyeFormData;
  onOdChange: (field: keyof EyeFormData, value: string) => void;
  onOiChange: (field: keyof EyeFormData, value: string) => void;
  onOdSignChange: (field: 'sphereSign' | 'cylinderSign', value: '+' | '-' | '') => void;
  onOiSignChange: (field: 'sphereSign' | 'cylinderSign', value: '+' | '-' | '') => void;
  onOdBlur: () => void;
  onOiBlur: () => void;
  odErrors: ValidationErrors;
  oiErrors: ValidationErrors;
  touched: { od: boolean; oi: boolean };
  patientBirthDate: string | null;
  odAxisFocus?: boolean;
  oiAxisFocus?: boolean;
}

/**
 * Professional optical value input.
 * Accepts typed values, auto-formats to ±X.XX on blur.
 * Updates both sign and value fields in parent.
 */
function OpticalCellInput({
  value,
  sign,
  onChange,
  onSignChange,
  onBlur,
  onKeyDown,
  placeholder = '0.00',
  hasError,
  isValid,
  errorMessage,
  disabled,
  inputRef,
}: {
  value: string;
  sign: '+' | '-' | '';
  onChange: (v: string) => void;
  onSignChange: (s: '+' | '-' | '') => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  hasError?: boolean;
  isValid?: boolean;
  errorMessage?: string;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Compute displayed value: when not focused, show formatted ±X.XX
  const getDisplayValue = () => {
    if (isFocused) return displayValue;
    if (!value && sign === '') return '';
    if (value === '' && sign === '') return '';
    const num = parseFloat(value);
    if (isNaN(num) && !value) return '';
    if (!isNaN(num)) {
      return num.toFixed(2);
    }
    return value;
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        setDisplayValue(num.toFixed(2));
      } else {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow: digits, dot only (sign is handled by toggle buttons)
    raw = raw.replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 1) {
      const parts = raw.split('.');
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    setDisplayValue(raw);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const raw = displayValue.trim();

    if (!raw) {
      onChange('');
      onSignChange('');
      onBlur?.();
      return;
    }

    const num = parseFloat(raw);
    if (!isNaN(num)) {
      onChange(num.toFixed(2));
      // Auto-assign + if no sign selected
      if (sign === '') onSignChange('+');
    } else {
      onChange(raw);
      onSignChange('');
    }
    onBlur?.();
  };

  const handleSignToggle = (newSign: '+' | '-') => {
    if (disabled) return;
    onSignChange(sign === newSign ? '' : newSign);
  };

  // Keyboard shortcuts: + and - keys toggle sign
  const handleKeyDownInternal = (e: React.KeyboardEvent) => {
    if (e.key === '+') {
      e.preventDefault();
      handleSignToggle('+');
    } else if (e.key === '-') {
      e.preventDefault();
      handleSignToggle('-');
    }
    onKeyDown?.(e);
  };

  const shown = getDisplayValue();

  return (
    <div className="flex items-center gap-0.5">
      {/* Sign toggle buttons */}
      <div className="flex flex-col gap-px shrink-0">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleSignToggle('+')}
          disabled={disabled}
          className={cn(
            'h-[17px] w-6 flex items-center justify-center rounded-sm text-[10px] font-bold transition-colors select-none',
            sign === '+'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground',
            disabled && 'opacity-40 pointer-events-none'
          )}
        >
          +
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleSignToggle('-')}
          disabled={disabled}
          className={cn(
            'h-[17px] w-6 flex items-center justify-center rounded-sm text-[10px] font-bold transition-colors select-none',
            sign === '-'
              ? 'bg-destructive text-destructive-foreground shadow-sm'
              : 'bg-muted hover:bg-muted/80 text-muted-foreground',
            disabled && 'opacity-40 pointer-events-none'
          )}
        >
          −
        </button>
      </div>

      {/* Value input */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={isFocused ? displayValue : shown}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDownInternal}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full h-9 px-2 text-center text-sm font-mono rounded-md border bg-background',
            'focus:outline-none focus:ring-2 transition-all',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            hasError
              ? 'border-destructive bg-destructive/5 focus:ring-destructive/30 text-destructive'
              : isValid
              ? 'border-green-500 bg-green-50/50 focus:ring-green-500/30 dark:bg-green-950/20'
              : 'border-input focus:ring-primary/30 focus:border-primary'
          )}
        />
        {/* Valid checkmark */}
        {isValid && !hasError && !isFocused && shown && (
          <Check className="absolute right-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-green-600" />
        )}
      </div>
    </div>
  );
}

/**
 * ADD-specific cell input. Always positive, shows + prefix.
 */
function AddCellInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  hasError,
  isValid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  hasError?: boolean;
  isValid?: boolean;
  disabled?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const getDisplayValue = () => {
    if (isFocused) return displayValue;
    if (!value) return '';
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) return `+${num.toFixed(2)}`;
    if (!isNaN(num) && num === 0) return '+0.00';
    return value;
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (value) {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) {
        setDisplayValue(`+${num.toFixed(2)}`);
      } else {
        setDisplayValue(value);
      }
    } else {
      setDisplayValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Block minus
    raw = raw.replace(/-/g, '');
    // Only numbers, dot, +
    raw = raw.replace(/[^0-9.+]/g, '');
    // Remove extra + signs
    if (raw.startsWith('+')) {
      raw = '+' + raw.slice(1).replace(/\+/g, '');
    } else {
      raw = raw.replace(/\+/g, '');
    }
    // Single dot
    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 1) {
      const parts = raw.split('.');
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    setDisplayValue(raw);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const raw = displayValue.trim().replace(/^\+/, '');

    if (!raw) {
      onChange('');
      onBlur?.();
      return;
    }

    const num = parseFloat(raw);
    if (!isNaN(num) && num >= 0) {
      onChange(num.toFixed(2));
    } else {
      onChange(raw);
    }
    onBlur?.();
  };

  const shown = getDisplayValue();

  return (
    <input
      type="text"
      inputMode="decimal"
      value={isFocused ? displayValue : shown}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === '-') e.preventDefault();
        onKeyDown?.(e);
      }}
      placeholder="+1.50"
      disabled={disabled}
      className={cn(
        'w-full h-9 px-2 text-center text-sm font-mono rounded-md border bg-background',
        'focus:outline-none focus:ring-2 transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        hasError
          ? 'border-destructive bg-destructive/5 focus:ring-destructive/30 text-destructive'
          : isValid
          ? 'border-green-500 bg-green-50/50 focus:ring-green-500/30 dark:bg-green-950/20'
          : 'border-input focus:ring-primary/30 focus:border-primary'
      )}
    />
  );
}

// Compact axis cell input (unchanged logic)
function AxisCellInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  hasError,
  isValid,
  disabled,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  hasError?: boolean;
  isValid?: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <input
      ref={inputRef}
      type="number"
      min="0"
      max="180"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 180)) onChange(v);
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder="0-180"
      disabled={disabled}
      className={cn(
        'w-full h-9 px-2 text-center text-sm font-mono rounded-md border bg-background',
        'focus:outline-none focus:ring-2 transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        hasError
          ? 'border-destructive bg-destructive/5 focus:ring-destructive/30'
          : isValid
          ? 'border-green-500 bg-green-50/50 focus:ring-green-500/30 dark:bg-green-950/20'
          : 'border-input focus:ring-primary/30 focus:border-primary'
      )}
    />
  );
}

// Simple numeric cell (DP, ALT)
function PlainCellInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  step,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(
        'w-full h-9 px-2 text-center text-sm font-mono rounded-md border bg-background border-input',
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all',
      )}
    />
  );
}

export function ClinicalPrescriptionTable({
  odData,
  oiData,
  onOdChange,
  onOiChange,
  onOdSignChange,
  onOiSignChange,
  onOdBlur,
  onOiBlur,
  odErrors,
  oiErrors,
  touched,
  patientBirthDate,
  odAxisFocus,
  oiAxisFocus,
}: ClinicalPrescriptionTableProps) {
  const odAxisRef = useRef<HTMLInputElement>(null);
  const oiAxisRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const { config, getSuggestionForAge, shouldShowAdd } = useAddClinicalConfig();
  const patientAge = calculateAge(patientBirthDate);
  const addVisibility = shouldShowAdd(patientAge);
  const suggestedAdd = patientAge ? getSuggestionForAge(patientAge) : null;
  const showAdd = patientAge === null || patientAge >= 38;

  // Focus axis on error
  if (odAxisFocus && odAxisRef.current) odAxisRef.current.focus();
  if (oiAxisFocus && oiAxisRef.current) oiAxisRef.current.focus();

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef?.current?.focus();
    }
  }, []);

  // Helper: check if a field is valid
  const isFieldValid = (val: string, sign: '+' | '-' | '', errorKey: keyof ValidationErrors, errors: ValidationErrors, isTouched: boolean) => {
    if (!isTouched) return false;
    return hasValue(val) && sign !== '' && !errors[errorKey];
  };

  const isAxisValid = (axisVal: string, cylVal: string, errors: ValidationErrors, isTouched: boolean) => {
    if (!isTouched) return false;
    return hasValue(cylVal) && axisVal !== '' && !errors.axis;
  };

  const isAddValid = (addVal: string, errors: ValidationErrors, isTouched: boolean) => {
    if (!isTouched) return false;
    const num = parseFloat(addVal);
    return !isNaN(num) && num > 0 && !errors.add;
  };

  // Format prescription summary line
  const formatEyeLine = (data: EyeFormData, label: string) => {
    const parts: string[] = [];
    if (hasValue(data.sphereValue) && data.sphereSign) {
      parts.push(`${data.sphereSign}${parseFloat(data.sphereValue).toFixed(2)}`);
    } else {
      parts.push('—');
    }
    if (hasValue(data.cylinderValue) && data.cylinderSign) {
      parts.push(`${data.cylinderSign}${parseFloat(data.cylinderValue).toFixed(2)}`);
    } else {
      parts.push('—');
    }
    if (data.axis) {
      parts.push(`x ${data.axis}°`);
    } else {
      parts.push('—');
    }
    if (data.add && parseFloat(data.add) > 0) {
      parts.push(`ADD +${parseFloat(data.add).toFixed(2)}`);
    }
    if (data.pupilDistance) {
      parts.push(`DP ${data.pupilDistance}`);
    }
    if (data.alt) {
      parts.push(`ALT ${data.alt}`);
    }
    return { label, text: parts.join('   ') };
  };

  const odSummary = formatEyeLine(odData, 'OD');
  const oiSummary = formatEyeLine(oiData, 'OI');

  const hasSomeData = hasValue(odData.sphereValue) || hasValue(odData.cylinderValue) ||
    hasValue(oiData.sphereValue) || hasValue(oiData.cylinderValue);

  // Collect all errors for display
  const allErrors = useMemo(() => {
    const errors: string[] = [];
    if (touched.od) {
      if (odErrors.sphereSign) errors.push(`OD Esfera: ${odErrors.sphereSign}`);
      if (odErrors.sphere) errors.push(`OD Esfera: ${odErrors.sphere}`);
      if (odErrors.cylinderSign) errors.push(`OD Cilindro: ${odErrors.cylinderSign}`);
      if (odErrors.cylinder) errors.push(`OD Cilindro: ${odErrors.cylinder}`);
      if (odErrors.axis) errors.push(`OD: ${odErrors.axis}`);
      if (odErrors.add) errors.push(`OD: ${odErrors.add}`);
    }
    if (touched.oi) {
      if (oiErrors.sphereSign) errors.push(`OI Esfera: ${oiErrors.sphereSign}`);
      if (oiErrors.sphere) errors.push(`OI Esfera: ${oiErrors.sphere}`);
      if (oiErrors.cylinderSign) errors.push(`OI Cilindro: ${oiErrors.cylinderSign}`);
      if (oiErrors.cylinder) errors.push(`OI Cilindro: ${oiErrors.cylinder}`);
      if (oiErrors.axis) errors.push(`OI: ${oiErrors.axis}`);
      if (oiErrors.add) errors.push(`OI: ${oiErrors.add}`);
    }
    return errors;
  }, [odErrors, oiErrors, touched]);

  const showAddAgeWarning = patientAge !== null && patientAge < 38 && showAdd;

  // ===== MOBILE: Card layout =====
  const renderMobileEyeCard = (
    eyeLabel: 'OD' | 'OI',
    data: EyeFormData,
    onChange: (field: keyof EyeFormData, value: string) => void,
    onSignChange: (field: 'sphereSign' | 'cylinderSign', value: '+' | '-' | '') => void,
    onBlurFn: () => void,
    errors: ValidationErrors,
    isTouched: boolean,
    axisRef: React.RefObject<HTMLInputElement>,
  ) => {
    const isOD = eyeLabel === 'OD';
    return (
      <div className={cn(
        'rounded-xl border-2 p-3 space-y-3',
        isOD ? 'border-primary/40 bg-primary/5' : 'border-secondary/40 bg-secondary/5'
      )}>
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-bold px-2.5 py-0.5 rounded-full',
            isOD ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
          )}>
            {eyeLabel}
          </span>
          <span className="text-xs text-muted-foreground">{isOD ? 'Ojo Derecho' : 'Ojo Izquierdo'}</span>
        </div>

        {/* SPH + CYL row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SPH</label>
            <OpticalCellInput
              value={data.sphereValue}
              sign={data.sphereSign}
              onChange={(v) => onChange('sphereValue', v)}
              onSignChange={(s) => onSignChange('sphereSign', s)}
              onBlur={onBlurFn}
              placeholder="±0.00"
              hasError={isTouched && !!(errors.sphereSign || errors.sphere)}
              isValid={isFieldValid(data.sphereValue, data.sphereSign, 'sphere', errors, isTouched)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CYL</label>
            <OpticalCellInput
              value={data.cylinderValue}
              sign={data.cylinderSign}
              onChange={(v) => onChange('cylinderValue', v)}
              onSignChange={(s) => onSignChange('cylinderSign', s)}
              onBlur={onBlurFn}
              placeholder="±0.00"
              hasError={isTouched && !!(errors.cylinderSign || errors.cylinder)}
              isValid={isFieldValid(data.cylinderValue, data.cylinderSign, 'cylinder', errors, isTouched)}
            />
          </div>
        </div>

        {/* EJE + DP row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">EJE°</label>
            <AxisCellInput
              inputRef={axisRef}
              value={data.axis}
              onChange={(v) => onChange('axis', v)}
              onBlur={onBlurFn}
              hasError={isTouched && !!errors.axis}
              isValid={isAxisValid(data.axis, data.cylinderValue, errors, isTouched)}
              disabled={!hasValue(data.cylinderValue)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">DP</label>
            <PlainCellInput
              value={data.pupilDistance}
              onChange={(v) => onChange('pupilDistance', v)}
              onBlur={onBlurFn}
              placeholder="32"
              step="0.5"
              min="20"
              max="40"
            />
          </div>
        </div>

        {/* ADD + ALT row (conditional) */}
        <div className="grid grid-cols-2 gap-2">
          {showAdd && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ADD</label>
              <AddCellInput
                value={data.add}
                onChange={(v) => onChange('add', v)}
                onBlur={onBlurFn}
                hasError={isTouched && !!errors.add}
                isValid={isAddValid(data.add, errors, isTouched)}
                disabled={addVisibility.disabled}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ALT</label>
            <PlainCellInput
              value={data.alt}
              onChange={(v) => onChange('alt', v)}
              placeholder="—"
              step="0.5"
            />
          </div>
        </div>
      </div>
    );
  };

  // ===== Desktop/Tablet table row =====
  const renderTableRow = (
    eyeLabel: 'OD' | 'OI',
    data: EyeFormData,
    onChange: (field: keyof EyeFormData, value: string) => void,
    onSignChange: (field: 'sphereSign' | 'cylinderSign', value: '+' | '-' | '') => void,
    onBlurFn: () => void,
    errors: ValidationErrors,
    isTouched: boolean,
    axisRef: React.RefObject<HTMLInputElement>,
  ) => {
    const isOD = eyeLabel === 'OD';
    return (
      <div className={cn(
        'grid',
        isOD ? 'border-b border-border' : '',
        'bg-card',
        showAdd ? 'grid-cols-[60px_1fr_1fr_80px_90px_70px_60px]' : 'grid-cols-[60px_1fr_1fr_80px_70px_60px]'
      )}>
        <div className={cn(
          'flex items-center justify-center sticky left-0 z-10 bg-card',
          isOD
            ? 'border-l-4 border-l-primary bg-primary/5'
            : 'border-l-4 border-l-secondary bg-secondary/10'
        )}>
          <span className={cn('text-sm font-bold', isOD ? 'text-primary' : 'text-secondary-foreground')}>{eyeLabel}</span>
        </div>

        <div className="p-1.5 border-l border-border/50">
          <OpticalCellInput
            value={data.sphereValue} sign={data.sphereSign}
            onChange={(v) => onChange('sphereValue', v)}
            onSignChange={(s) => onSignChange('sphereSign', s)}
            onBlur={onBlurFn} placeholder="±0.00"
            hasError={isTouched && !!(errors.sphereSign || errors.sphere)}
            isValid={isFieldValid(data.sphereValue, data.sphereSign, 'sphere', errors, isTouched)}
          />
        </div>

        <div className="p-1.5 border-l border-border/50">
          <OpticalCellInput
            value={data.cylinderValue} sign={data.cylinderSign}
            onChange={(v) => onChange('cylinderValue', v)}
            onSignChange={(s) => onSignChange('cylinderSign', s)}
            onBlur={onBlurFn} placeholder="±0.00"
            hasError={isTouched && !!(errors.cylinderSign || errors.cylinder)}
            isValid={isFieldValid(data.cylinderValue, data.cylinderSign, 'cylinder', errors, isTouched)}
          />
        </div>

        <div className="p-1.5 border-l border-border/50">
          <AxisCellInput
            inputRef={axisRef} value={data.axis}
            onChange={(v) => onChange('axis', v)} onBlur={onBlurFn}
            hasError={isTouched && !!errors.axis}
            isValid={isAxisValid(data.axis, data.cylinderValue, errors, isTouched)}
            disabled={!hasValue(data.cylinderValue)}
          />
        </div>

        {showAdd && (
          <div className="p-1.5 border-l border-border/50">
            <AddCellInput
              value={data.add} onChange={(v) => onChange('add', v)} onBlur={onBlurFn}
              hasError={isTouched && !!errors.add}
              isValid={isAddValid(data.add, errors, isTouched)}
              disabled={addVisibility.disabled}
            />
          </div>
        )}

        <div className="p-1.5 border-l border-border/50">
          <PlainCellInput
            value={data.pupilDistance} onChange={(v) => onChange('pupilDistance', v)}
            onBlur={onBlurFn} placeholder="32" step="0.5" min="20" max="40"
          />
        </div>

        <div className="p-1.5 border-l border-border/50">
          <PlainCellInput
            value={data.alt} onChange={(v) => onChange('alt', v)}
            placeholder="—" step="0.5"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ===== MOBILE: Card view ===== */}
      {isMobile && (
        <div className="space-y-3">
          {renderMobileEyeCard('OD', odData, onOdChange, onOdSignChange, onOdBlur, odErrors, touched.od, odAxisRef)}
          {renderMobileEyeCard('OI', oiData, onOiChange, onOiSignChange, onOiBlur, oiErrors, touched.oi, oiAxisRef)}
        </div>
      )}

      {/* ===== TABLET: Scrollable table ===== */}
      {isTablet && (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="min-w-[520px]">
              {/* Header */}
              <div className={cn(
                'grid bg-primary/5 border-b border-border',
                showAdd ? 'grid-cols-[60px_1fr_1fr_80px_90px_70px_60px]' : 'grid-cols-[60px_1fr_1fr_80px_70px_60px]'
              )}>
                <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center sticky left-0 z-10 bg-primary/5">RX</div>
                <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">SPH</div>
                <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">CYL</div>
                <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">EJE°</div>
                {showAdd && <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">ADD</div>}
                <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">DP</div>
                <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">ALT</div>
              </div>
              {renderTableRow('OD', odData, onOdChange, onOdSignChange, onOdBlur, odErrors, touched.od, odAxisRef)}
              {renderTableRow('OI', oiData, onOiChange, onOiSignChange, onOiBlur, oiErrors, touched.oi, oiAxisRef)}
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP: Full table ===== */}
      {!isMobile && !isTablet && (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div className={cn(
            'grid bg-primary/5 border-b border-border',
            showAdd ? 'grid-cols-[60px_1fr_1fr_80px_90px_70px_60px]' : 'grid-cols-[60px_1fr_1fr_80px_70px_60px]'
          )}>
            <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center">RX</div>
            <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">SPH</div>
            <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">CYL</div>
            <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">EJE°</div>
            {showAdd && <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">ADD</div>}
            <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">DP</div>
            <div className="px-2 py-2.5 text-xs font-bold text-primary uppercase tracking-wider text-center border-l border-border/50">ALT</div>
          </div>
          {renderTableRow('OD', odData, onOdChange, onOdSignChange, onOdBlur, odErrors, touched.od, odAxisRef)}
          {renderTableRow('OI', oiData, onOiChange, onOiSignChange, onOiBlur, oiErrors, touched.oi, oiAxisRef)}
        </div>
      )}

      {/* ADD Age Warning */}
      {showAddAgeWarning && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-xs text-warning font-medium">
            ADD normalmente aplica después de los 38 años (paciente: {patientAge} años)
          </p>
        </div>
      )}

      {/* ADD Suggestion */}
      {showAdd && suggestedAdd && !addVisibility.disabled && config?.mostrar_sugerencia_add && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-accent">
          <div className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-accent-foreground" />
            <span>
              Sugerencia ADD por edad ({patientAge} años): <strong className="font-mono">+{suggestedAdd.toFixed(2)}</strong>
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => {
              const val = suggestedAdd.toFixed(2);
              onOdChange('add', val);
              onOiChange('add', val);
            }}
          >
            Aplicar ambos
          </Button>
        </div>
      )}

      {/* Validation Errors */}
      {allErrors.length > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {allErrors.map((err, i) => (
              <p key={i} className="text-xs text-destructive font-medium">{err}</p>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Summary */}
      {hasSomeData && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Resumen de Graduación
          </h4>
          <div className="space-y-2 font-mono">
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-primary w-8 shrink-0">OD:</span>
              <span className="text-sm sm:text-base tracking-wide break-all">{odSummary.text}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-sm font-bold text-secondary-foreground w-8 shrink-0">OI:</span>
              <span className="text-sm sm:text-base tracking-wide break-all">{oiSummary.text}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
