/**
 * Smart Date Parser for Spanish natural language dates
 * Handles formats like: 12mayo1982, 12 mayo 1982, 12-may-82, 12/05/1982
 * Also supports: hoy, mañana, pasado mañana, year-only (1982), month+year (sep 2020)
 */

import { addDays, format } from 'date-fns';

// Spanish month mappings (including common abbreviations and variations)
export const SPANISH_MONTHS: Record<string, number> = {
  // January
  'enero': 1, 'ene': 1, 'en': 1,
  // February
  'febrero': 2, 'feb': 2,
  // March
  'marzo': 3, 'mar': 3,
  // April
  'abril': 4, 'abr': 4, 'ab': 4,
  // May
  'mayo': 5, 'may': 5,
  // June
  'junio': 6, 'jun': 6,
  // July
  'julio': 7, 'jul': 7,
  // August
  'agosto': 8, 'ago': 8, 'ag': 8,
  // September (including common misspelling)
  'septiembre': 9, 'setiembre': 9, 'sep': 9, 'sept': 9, 'set': 9,
  // October
  'octubre': 10, 'oct': 10,
  // November
  'noviembre': 11, 'nov': 11,
  // December
  'diciembre': 12, 'dic': 12,
};

// Full month names for suggestions
export const MONTH_FULL_NAMES: Record<number, string> = {
  1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril', 5: 'mayo', 6: 'junio',
  7: 'julio', 8: 'agosto', 9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
};

// Month abbreviations for display
export const MONTH_ABBR: Record<number, string> = {
  1: 'ene', 2: 'feb', 3: 'mar', 4: 'abr', 5: 'may', 6: 'jun',
  7: 'jul', 8: 'ago', 9: 'sep', 10: 'oct', 11: 'nov', 12: 'dic',
};

// Relative date keywords
const RELATIVE_DATES: Record<string, () => Date> = {
  'hoy': () => new Date(),
  'manana': () => addDays(new Date(), 1),
  'mañana': () => addDays(new Date(), 1),
  'pasado manana': () => addDays(new Date(), 2),
  'pasado mañana': () => addDays(new Date(), 2),
  'ayer': () => addDays(new Date(), -1),
  'anteayer': () => addDays(new Date(), -2),
};

export interface ParseResult {
  success: boolean;
  date?: Date;
  isoDate?: string; // yyyy-MM-dd
  displayDate?: string; // dd/mmm/yyyy
  error?: string;
  isEstimated?: boolean; // True if date was estimated (e.g., year-only)
  estimationNote?: string; // Explanation of estimation
}

export interface DateSuggestion {
  display: string; // What to show the user
  isoDate: string; // The actual date value
  type: 'completion' | 'relative' | 'estimated';
}

/**
 * Normalize year: 2-digit years are converted based on rules
 * 00-29 → 2000-2029
 * 30-99 → 1930-1999
 */
function normalizeYear(yearStr: string): number {
  const year = parseInt(yearStr, 10);
  
  if (yearStr.length === 4) {
    return year;
  }
  
  if (yearStr.length === 2 || yearStr.length === 1) {
    if (year >= 0 && year <= 29) {
      return 2000 + year;
    }
    return 1900 + year;
  }
  
  return year;
}

/**
 * Get days in a given month/year
 */
function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Validate if a date is valid
 */
function validateDate(day: number, month: number, year: number, allowFuture: boolean = false): { valid: boolean; error?: string } {
  // Basic range checks
  if (month < 1 || month > 12) {
    return { valid: false, error: 'Mes inválido (debe ser 1-12)' };
  }
  
  const maxDays = getDaysInMonth(month, year);
  if (day < 1 || day > maxDays) {
    return { valid: false, error: `Día inválido para ese mes (máximo ${maxDays})` };
  }
  
  if (year < 1900 || year > 2100) {
    return { valid: false, error: 'Año fuera de rango (1900-2100)' };
  }
  
  // Check for future dates (only if not allowed)
  if (!allowFuture) {
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (date > today) {
      return { valid: false, error: 'No se permiten fechas futuras' };
    }
  }
  
  return { valid: true };
}

/**
 * Try to extract month from text (Spanish name or number)
 */
function parseMonth(monthStr: string): number | null {
  // Remove accents
  const normalized = monthStr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Check if it's a Spanish month name
  if (SPANISH_MONTHS[normalized]) {
    return SPANISH_MONTHS[normalized];
  }
  
  // Check if it's a number
  const num = parseInt(normalized, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return num;
  }
  
  return null;
}

/**
 * Get month suggestion based on partial input
 */
export function getMonthSuggestion(input: string): { month: number; fullName: string } | null {
  const normalized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Find matching month
  for (const [abbr, monthNum] of Object.entries(SPANISH_MONTHS)) {
    if (abbr.startsWith(normalized) && normalized.length >= 2) {
      return { month: monthNum, fullName: MONTH_FULL_NAMES[monthNum] };
    }
  }
  
  return null;
}

/**
 * Generate smart suggestions based on current input
 */
export function generateSuggestions(input: string, allowFuture: boolean = true): DateSuggestion[] {
  if (!input || input.trim().length < 2) return [];
  
  const suggestions: DateSuggestion[] = [];
  const cleaned = input.toLowerCase().trim();
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Check for relative date matches
  for (const [keyword, dateFn] of Object.entries(RELATIVE_DATES)) {
    if (keyword.startsWith(cleaned) && cleaned.length >= 2) {
      const date = dateFn();
      if (allowFuture || date <= today) {
        suggestions.push({
          display: `${keyword} (${formatToDisplay(format(date, 'yyyy-MM-dd'))})`,
          isoDate: format(date, 'yyyy-MM-dd'),
          type: 'relative',
        });
      }
    }
  }
  
  // Check for partial date with month name (e.g., "12 sep" → "12/sep/2024")
  const partialMatch = cleaned.match(/^(\d{1,2})\s*([a-z]+)$/);
  if (partialMatch) {
    const day = parseInt(partialMatch[1], 10);
    const monthSuggestion = getMonthSuggestion(partialMatch[2]);
    if (monthSuggestion && day >= 1 && day <= 31) {
      const isoDate = `${currentYear}-${String(monthSuggestion.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      suggestions.push({
        display: `${day} ${monthSuggestion.fullName} ${currentYear}`,
        isoDate,
        type: 'completion',
      });
    }
  }
  
  // Check for month-only input (e.g., "sep" → "01/sep/2024")
  const monthOnly = getMonthSuggestion(cleaned);
  if (monthOnly && !partialMatch) {
    const isoDate = `${currentYear}-${String(monthOnly.month).padStart(2, '0')}-01`;
    suggestions.push({
      display: `1 ${monthOnly.fullName} ${currentYear}`,
      isoDate,
      type: 'completion',
    });
  }
  
  return suggestions.slice(0, 3); // Limit to 3 suggestions
}

/**
 * Main parser function - tries multiple strategies to parse the date
 */
export function parseFlexibleDate(input: string, allowFuture: boolean = false): ParseResult {
  if (!input || input.trim().length === 0) {
    return { success: false, error: 'Fecha vacía' };
  }
  
  // Clean the input
  const cleaned = input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[,\.]/g, '') // Remove commas and periods
    .replace(/\s+/g, ' '); // Normalize spaces
  
  // Strategy 0: Check for relative dates (hoy, mañana, etc.)
  for (const [keyword, dateFn] of Object.entries(RELATIVE_DATES)) {
    const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (cleaned === normalizedKeyword) {
      const date = dateFn();
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (!allowFuture && date > today) {
        return { success: false, error: 'No se permiten fechas futuras' };
      }
      
      const isoDate = format(date, 'yyyy-MM-dd');
      return {
        success: true,
        date,
        isoDate,
        displayDate: formatToDisplay(isoDate),
      };
    }
  }
  
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  let isEstimated = false;
  let estimationNote = '';
  
  // Strategy 1: Year-only input (e.g., "1982" or "82")
  const yearOnlyMatch = cleaned.match(/^(\d{2}|\d{4})$/);
  if (yearOnlyMatch) {
    year = normalizeYear(yearOnlyMatch[1]);
    if (year >= 1900 && year <= new Date().getFullYear()) {
      day = 1;
      month = 1;
      isEstimated = true;
      estimationNote = 'Fecha estimada a partir del año capturado';
    }
  }
  
  // Strategy 2: Month + year only (e.g., "sep 2020", "septiembre 82")
  if (!day || !month || !year) {
    const monthYearMatch = cleaned.match(/^([a-z]+)\s*(\d{2,4})$/);
    if (monthYearMatch) {
      const parsedMonth = parseMonth(monthYearMatch[1]);
      if (parsedMonth) {
        month = parsedMonth;
        year = normalizeYear(monthYearMatch[2]);
        day = 1;
        isEstimated = true;
        estimationNote = 'Fecha estimada (día 1 del mes)';
      }
    }
  }
  
  // Strategy 3: Standard formats with separators (dd/mm/yyyy, dd-mm-yyyy, dd mm yyyy)
  if (!day || !month || !year) {
    const separatorPatterns = [
      /^(\d{1,2})[\s\/\-](\d{1,2})[\s\/\-](\d{2,4})$/,  // dd/mm/yy or dd/mm/yyyy
      /^(\d{1,2})[\s\/\-]([a-z]+)[\s\/\-](\d{2,4})$/,   // dd/mon/yyyy
    ];
    
    for (const pattern of separatorPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        day = parseInt(match[1], 10);
        month = parseMonth(match[2]);
        year = normalizeYear(match[3]);
        
        if (day && month && year) {
          isEstimated = false;
          break;
        }
      }
    }
  }
  
  // Strategy 4: No separators with text month (12mayo1982, 12may82)
  if (!day || !month || !year) {
    const textMonthPattern = /^(\d{1,2})([a-z]+)(\d{2,4})$/;
    const match = cleaned.match(textMonthPattern);
    if (match) {
      day = parseInt(match[1], 10);
      month = parseMonth(match[2]);
      year = normalizeYear(match[3]);
      isEstimated = false;
    }
  }
  
  // Strategy 5: All numeric no separators (12051982 = dd mm yyyy)
  if (!day || !month || !year) {
    // 8 digits: ddmmyyyy
    const allNumeric8 = /^(\d{2})(\d{2})(\d{4})$/;
    let match = cleaned.match(allNumeric8);
    if (match) {
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
      isEstimated = false;
    }
    
    // 6 digits: ddmmyy
    if (!match) {
      const allNumeric6 = /^(\d{2})(\d{2})(\d{2})$/;
      match = cleaned.match(allNumeric6);
      if (match) {
        day = parseInt(match[1], 10);
        month = parseInt(match[2], 10);
        year = normalizeYear(match[3]);
        isEstimated = false;
      }
    }
  }
  
  // Strategy 6: Partial input with text month and spaces (12 mayo 1982)
  if (!day || !month || !year) {
    const parts = cleaned.split(/[\s\/\-]+/);
    if (parts.length >= 2) {
      // Try different combinations
      for (let i = 0; i < parts.length; i++) {
        const potentialMonth = parseMonth(parts[i]);
        if (potentialMonth) {
          month = potentialMonth;
          // Day is usually before month in Spanish
          if (i > 0) {
            const potentialDay = parseInt(parts[i - 1], 10);
            if (!isNaN(potentialDay) && potentialDay >= 1 && potentialDay <= 31) {
              day = potentialDay;
            }
          }
          // Year is usually after month
          if (i < parts.length - 1) {
            const potentialYear = parts[i + 1];
            if (/^\d{2,4}$/.test(potentialYear)) {
              year = normalizeYear(potentialYear);
            }
          }
          break;
        }
      }
      
      // If we still don't have day, try first part
      if (!day && parts.length > 0) {
        const firstPart = parseInt(parts[0], 10);
        if (!isNaN(firstPart) && firstPart >= 1 && firstPart <= 31) {
          day = firstPart;
        }
      }
      
      // If we still don't have year, try last part
      if (!year && parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        if (/^\d{2,4}$/.test(lastPart)) {
          year = normalizeYear(lastPart);
        }
      }
      
      isEstimated = false;
    }
  }
  
  // Check if we got all components
  if (!day || !month || !year) {
    return {
      success: false,
      error: 'No se pudo interpretar la fecha. Ejemplos: 12mayo1982, 12/05/1982, hoy, mañana',
    };
  }
  
  // Validate the date
  const validation = validateDate(day, month, year, allowFuture);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  
  // Create the date object
  const date = new Date(year, month - 1, day);
  
  // Format outputs
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const displayDate = `${String(day).padStart(2, '0')}/${MONTH_ABBR[month]}/${year}`;
  
  return {
    success: true,
    date,
    isoDate,
    displayDate,
    isEstimated,
    estimationNote: isEstimated ? estimationNote : undefined,
  };
}

/**
 * Format an ISO date string to display format
 */
export function formatToDisplay(isoDate: string): string {
  if (!isoDate) return '';
  
  const date = new Date(isoDate + 'T00:00:00');
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_ABBR[date.getMonth() + 1];
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Get the month abbreviation for display
 */
export function getMonthAbbr(month: number): string {
  return MONTH_ABBR[month] || '';
}
