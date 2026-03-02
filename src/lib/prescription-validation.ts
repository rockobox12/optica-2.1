/**
 * Clinical validation rules for optical prescriptions
 * Professional optical format: ±X.XX (sign + digits + 2 decimals)
 */

export interface EyeData {
  sphereValue: string;
  sphereSign: '+' | '-' | '';
  cylinderValue: string;
  cylinderSign: '+' | '-' | '';
  axis: string;
  add?: string;
}

export interface ValidationErrors {
  sphereSign?: string;
  cylinderSign?: string;
  sphere?: string;
  cylinder?: string;
  axis?: string;
  add?: string;
}

export interface EyeValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
  requiresAxisFocus: boolean;
}

// Ranges
export const SPH_MIN = -20;
export const SPH_MAX = 20;
export const CYL_MIN = -10;
export const CYL_MAX = 10;
export const ADD_MIN = 0.25;
export const ADD_MAX = 4.00;
export const ADD_STEP = 0.25;

/**
 * Check if a value is considered "filled" (has a meaningful number)
 */
export function hasValue(value: string): boolean {
  if (!value || value.trim() === '') return false;
  const num = parseFloat(value);
  return !isNaN(num) && num !== 0;
}

/**
 * Format a raw input into professional optical format: ±X.XX
 * Returns { formatted, sign, absValue } or null if invalid
 */
export function formatOpticalValue(raw: string): {
  formatted: string;
  sign: '+' | '-';
  absValue: string;
} | null {
  if (!raw || raw.trim() === '') return null;

  const cleaned = raw.trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  const sign: '+' | '-' = num < 0 ? '-' : '+';
  const abs = Math.abs(num);
  const absStr = abs.toFixed(2);

  return {
    formatted: `${sign}${absStr}`,
    sign,
    absValue: absStr,
  };
}

/**
 * Validate SPH value (range: -20.00 to +20.00, step 0.25)
 */
export function validateSphereValue(value: string, sign: '+' | '-' | ''): { isValid: boolean; error?: string } {
  if (!value || value.trim() === '') return { isValid: true };

  const num = parseFloat(value);
  if (isNaN(num)) return { isValid: false, error: 'Formato inválido. Ejemplo: +0.25' };

  if (sign === '' && num !== 0) return { isValid: false, error: 'Selecciona signo + o −' };

  const signedVal = sign === '-' ? -num : num;
  if (signedVal < SPH_MIN || signedVal > SPH_MAX) {
    return { isValid: false, error: `SPH: rango ${SPH_MIN.toFixed(2)} a +${SPH_MAX.toFixed(2)}` };
  }

  const remainder = Math.round(num * 100) % 25;
  if (num > 0 && remainder !== 0) {
    return { isValid: false, error: 'Debe ser en incrementos de 0.25' };
  }

  return { isValid: true };
}

/**
 * Validate CYL value (range: -10.00 to +10.00, step 0.25)
 */
export function validateCylinderValue(value: string, sign: '+' | '-' | ''): { isValid: boolean; error?: string } {
  if (!value || value.trim() === '') return { isValid: true };

  const num = parseFloat(value);
  if (isNaN(num)) return { isValid: false, error: 'Formato inválido. Ejemplo: -0.50' };

  if (sign === '' && num !== 0) return { isValid: false, error: 'Selecciona signo + o −' };

  const signedVal = sign === '-' ? -num : num;
  if (signedVal < CYL_MIN || signedVal > CYL_MAX) {
    return { isValid: false, error: `CYL: rango ${CYL_MIN.toFixed(2)} a +${CYL_MAX.toFixed(2)}` };
  }

  const remainder = Math.round(num * 100) % 25;
  if (num > 0 && remainder !== 0) {
    return { isValid: false, error: 'Debe ser en incrementos de 0.25' };
  }

  return { isValid: true };
}

/**
 * Validate ADD value according to clinical rules
 * Range: +0.25 to +4.00, always positive, step 0.25
 */
export function validateAddValue(value: string): { isValid: boolean; error?: string } {
  if (!value || value.trim() === '') {
    return { isValid: true };
  }

  if (value.includes('-')) {
    return { isValid: false, error: 'ADD siempre es positivo (+)' };
  }

  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return { isValid: false, error: 'Formato inválido. Ejemplo: +1.50' };
  }

  if (numValue < 0) {
    return { isValid: false, error: 'ADD siempre es positivo (+)' };
  }

  if (numValue > 0 && numValue < ADD_MIN) {
    return { isValid: false, error: `ADD mínimo es +${ADD_MIN.toFixed(2)}` };
  }

  if (numValue > ADD_MAX) {
    return { isValid: false, error: `ADD máximo es +${ADD_MAX.toFixed(2)}` };
  }

  const remainder = Math.round(numValue * 100) % Math.round(ADD_STEP * 100);
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
  
  const cleanValue = value.replace(/[+-]/g, '').trim();
  const numValue = parseFloat(cleanValue);
  
  if (isNaN(numValue) || numValue <= 0) return null;
  
  return Math.abs(numValue);
}

/**
 * Validate a single eye's prescription data
 */
export function validateEyeData(data: EyeData): EyeValidationResult {
  const errors: ValidationErrors = {};
  let requiresAxisFocus = false;

  // Rule 1: Sphere sign + range validation
  if (hasValue(data.sphereValue)) {
    if (data.sphereSign === '') {
      errors.sphereSign = 'Selecciona + o −';
    } else {
      const sphValidation = validateSphereValue(data.sphereValue, data.sphereSign);
      if (!sphValidation.isValid) errors.sphere = sphValidation.error;
    }
  }

  // Rule 2: Cylinder sign + range validation
  if (hasValue(data.cylinderValue)) {
    if (data.cylinderSign === '') {
      errors.cylinderSign = 'Selecciona + o −';
    } else {
      const cylValidation = validateCylinderValue(data.cylinderValue, data.cylinderSign);
      if (!cylValidation.isValid) errors.cylinder = cylValidation.error;
    }
  }

  // Rule 3: Axis is required if cylinder has value
  if (hasValue(data.cylinderValue)) {
    if (!data.axis || data.axis.trim() === '') {
      errors.axis = 'Eje obligatorio (1–180) cuando hay Cilindro';
      requiresAxisFocus = true;
    } else {
      const axisNum = parseInt(data.axis);
      if (isNaN(axisNum) || axisNum < 1 || axisNum > 180) {
        errors.axis = 'Eje debe ser entre 1 y 180';
        requiresAxisFocus = true;
      }
    }
  }

  // Rule 4: Validate ADD if present
  if (data.add) {
    const addValidation = validateAddValue(data.add);
    if (!addValidation.isValid) {
      errors.add = addValidation.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    requiresAxisFocus,
  };
}

/**
 * Calculate the final signed value for database storage
 */
export function calculateSignedValue(value: string, sign: '+' | '-' | ''): number | null {
  if (!hasValue(value)) return null;
  
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  
  if (sign === '') return null;
  
  return sign === '-' ? -Math.abs(num) : Math.abs(num);
}

/**
 * Parse a signed value from database into separate value and sign
 */
export function parseSignedValue(dbValue: number | null): { value: string; sign: '+' | '-' | '' } {
  if (dbValue === null || dbValue === undefined) {
    return { value: '', sign: '' };
  }
  
  return {
    value: Math.abs(dbValue).toFixed(2),
    sign: dbValue >= 0 ? '+' : '-',
  };
}

/**
 * Validate both eyes and return combined result
 */
export function validatePrescription(od: EyeData, oi: EyeData): {
  isValid: boolean;
  odErrors: ValidationErrors;
  oiErrors: ValidationErrors;
  odRequiresAxisFocus: boolean;
  oiRequiresAxisFocus: boolean;
} {
  const odResult = validateEyeData(od);
  const oiResult = validateEyeData(oi);

  return {
    isValid: odResult.isValid && oiResult.isValid,
    odErrors: odResult.errors,
    oiErrors: oiResult.errors,
    odRequiresAxisFocus: odResult.requiresAxisFocus,
    oiRequiresAxisFocus: oiResult.requiresAxisFocus,
  };
}
