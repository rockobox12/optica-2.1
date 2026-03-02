/**
 * Duplicate Patient Detection - Fuzzy Matching & Scoring
 * 
 * Calculates similarity scores (0-100) between patient data.
 * Uses phone matching, birth date, and fuzzy name comparison.
 */

// Normalize text: remove accents, lowercase, collapse whitespace
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract digits from phone number
function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Normalize phone to last 10 digits (Mexico format)
function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = extractDigits(phone);
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits.length > 0 ? digits : null;
}

// Tokenize a name into sorted words for comparison
function tokenize(name: string): string[] {
  return normalizeText(name)
    .split(' ')
    .filter(t => t.length > 1) // ignore single-char tokens
    .sort();
}

// Calculate Levenshtein distance between two strings
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

// Calculate similarity ratio (0-1) between two strings
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 0;
  const dist = levenshtein(na, nb);
  return 1 - dist / maxLen;
}

// Token-based name similarity (handles name order variations)
function tokenSimilarity(nameA: string, nameB: string): number {
  const tokensA = tokenize(nameA);
  const tokensB = tokenize(nameB);
  
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  
  // Check exact token matches
  const matchedB = new Set<number>();
  let matchCount = 0;
  
  for (const tokenA of tokensA) {
    let bestMatch = -1;
    let bestSim = 0;
    
    for (let j = 0; j < tokensB.length; j++) {
      if (matchedB.has(j)) continue;
      const sim = stringSimilarity(tokenA, tokensB[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = j;
      }
    }
    
    if (bestMatch >= 0 && bestSim >= 0.75) {
      matchedB.add(bestMatch);
      matchCount += bestSim;
    }
  }
  
  const maxTokens = Math.max(tokensA.length, tokensB.length);
  return matchCount / maxTokens;
}

export interface DuplicateCandidate {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  branch_id: string | null;
  email: string | null;
}

export interface DuplicateMatch {
  patient: DuplicateCandidate;
  score: number;
  reasons: string[];
}

export interface DuplicateInput {
  firstName: string;
  lastName: string;
  phone?: string | null;
  whatsapp?: string | null;
  birthDate?: string | null;
}

/**
 * Calculate duplicate score between input data and a candidate patient.
 * Returns score (0-100) and reasons for the match.
 */
export function calculateDuplicateScore(
  input: DuplicateInput,
  candidate: DuplicateCandidate
): DuplicateMatch | null {
  const reasons: string[] = [];
  let score = 0;

  // 1. Phone/WhatsApp match (weight: 50 points)
  const inputPhone = normalizePhone(input.phone) || normalizePhone(input.whatsapp);
  const candidatePhones = [
    normalizePhone(candidate.phone),
    normalizePhone(candidate.mobile),
    normalizePhone(candidate.whatsapp),
  ].filter(Boolean) as string[];

  if (inputPhone && candidatePhones.length > 0) {
    const phoneMatch = candidatePhones.some(cp => cp === inputPhone);
    if (phoneMatch) {
      score += 50;
      reasons.push('Coincide el teléfono/WhatsApp');
    }
  }

  // 2. Birth date match (weight: 20 points)
  if (input.birthDate && candidate.birth_date) {
    if (input.birthDate === candidate.birth_date) {
      score += 20;
      reasons.push('Coincide fecha de nacimiento');
    }
  }

  // 3. Name similarity (weight: 30 points)
  const fullNameInput = `${input.firstName} ${input.lastName}`;
  const fullNameCandidate = `${candidate.first_name} ${candidate.last_name}`;
  
  const nameSim = tokenSimilarity(fullNameInput, fullNameCandidate);
  
  if (nameSim >= 0.9) {
    score += 30;
    reasons.push('Nombre muy similar');
  } else if (nameSim >= 0.7) {
    score += Math.round(nameSim * 30);
    reasons.push('Nombre similar');
  } else if (nameSim >= 0.5) {
    score += Math.round(nameSim * 15);
  }

  // Only return if score >= 70
  if (score < 70) return null;

  return {
    patient: candidate,
    score: Math.min(score, 100),
    reasons,
  };
}

/**
 * Find duplicates from a list of candidates.
 * Returns matches sorted by score descending.
 */
export function findDuplicates(
  input: DuplicateInput,
  candidates: DuplicateCandidate[]
): DuplicateMatch[] {
  if (!input.firstName && !input.lastName) return [];
  
  const matches: DuplicateMatch[] = [];
  
  for (const candidate of candidates) {
    const match = calculateDuplicateScore(input, candidate);
    if (match) {
      matches.push(match);
    }
  }
  
  return matches.sort((a, b) => b.score - a.score);
}
