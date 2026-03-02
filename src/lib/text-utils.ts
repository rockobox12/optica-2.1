/**
 * Converts a name string to Title Case with Spanish particle support.
 * - Trims and collapses multiple spaces to one.
 * - Splits on spaces, hyphens (-) and apostrophes (') preserving delimiters.
 * - Lowercases Spanish particles (de, del, la, las, los, y, da, do, dos, das, van, von)
 *   when they appear in the middle of the name.
 *
 * Examples:
 *   "juan de la cruz"    → "Juan de la Cruz"
 *   "DE LA CRUZ"         → "De la Cruz"  (first word always capitalized)
 *   "o'connor"           → "O'Connor"
 *   "ana-maria"          → "Ana-Maria"
 *   "  isela  "          → "Isela"
 */

const PARTICLES = new Set([
  'de', 'del', 'la', 'las', 'los', 'y',
  'da', 'do', 'dos', 'das', 'van', 'von',
]);

function capitalizeWord(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function toTitleCaseName(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  // Split preserving delimiters: spaces, hyphens, apostrophes
  const tokens = trimmed.split(/(\s|[-'])/);

  let isFirst = true;

  return tokens
    .map((token) => {
      // Delimiters pass through
      if (token === ' ' || token === '-' || token === "'") return token;
      if (token === '') return token;

      const lower = token.toLowerCase();

      if (isFirst) {
        isFirst = false;
        return capitalizeWord(token);
      }

      // Spanish particles stay lowercase in the middle
      if (PARTICLES.has(lower)) {
        return lower;
      }

      return capitalizeWord(token);
    })
    .join('');
}
