/**
 * Shared patient search utilities.
 * Used across Expediente (PatientTable), Ventas (CustomerSelector), and Cobro Rápido.
 */

/**
 * Remove diacritics/accents from a string.
 * E.g. "Jiménez" → "Jimenez", "García" → "Garcia"
 */
export function removeDiacritics(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize a search query: trim, collapse spaces, lowercase, remove diacritics.
 */
export function normalizeSearchQuery(raw: string): string {
  return removeDiacritics(raw.trim().replace(/\s+/g, ' ').toLowerCase());
}

/**
 * Split a normalized query into individual tokens.
 */
export function tokenizeQuery(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

/**
 * Normalize a field value for comparison: lowercase + remove diacritics.
 */
function normalizeField(value: string): string {
  return removeDiacritics(value.toLowerCase());
}

/**
 * Check if a record matches ALL tokens against any of the provided fields.
 * Each token must appear in at least one field (AND logic across tokens).
 * Both tokens and fields are diacritic-normalized for accent-insensitive matching.
 */
export function matchesAllTokens(
  tokens: string[],
  fields: (string | null | undefined)[]
): boolean {
  if (tokens.length === 0) return true;

  // Concatenate all fields into a single searchable string (normalized)
  const composite = fields
    .filter((f): f is string => !!f)
    .map(normalizeField)
    .join(' ');

  return tokens.every((token) => composite.includes(token));
}

/**
 * Build a Supabase `.or()` filter string for multi-token patient search.
 *
 * Strategy: fetch a broader set using the FIRST token, then filter client-side with all tokens.
 * Uses the longest token for selectivity.
 */
export function buildBroadFilter(tokens: string[]): string {
  if (tokens.length === 0) return '';

  // Use the longest token for the server-side filter (most selective)
  const primaryToken = tokens.reduce((a, b) => (a.length >= b.length ? a : b));

  return [
    `first_name.ilike.%${primaryToken}%`,
    `last_name.ilike.%${primaryToken}%`,
    `phone.ilike.%${primaryToken}%`,
    `mobile.ilike.%${primaryToken}%`,
    `whatsapp.ilike.%${primaryToken}%`,
    `email.ilike.%${primaryToken}%`,
  ].join(',');
}

/**
 * Client-side multi-token filter for patient records.
 * Each token must match somewhere in the patient's name, phone, or email.
 * Accent-insensitive (diacritics are stripped before comparison).
 */
export function filterPatientByTokens<
  T extends {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    mobile?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    customer_name?: string | null;
    customer_phone?: string | null;
  }
>(patient: T, tokens: string[]): boolean {
  if (tokens.length === 0) return true;

  const fullName = [patient.first_name, patient.last_name].filter(Boolean).join(' ');

  return matchesAllTokens(tokens, [
    fullName,
    patient.customer_name,
    patient.phone,
    patient.mobile,
    patient.whatsapp,
    patient.customer_phone,
    patient.email,
  ]);
}
