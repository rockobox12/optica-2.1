/**
 * Advanced clinical diagnosis engine for optical prescriptions.
 * Uses meridian-based analysis for precise astigmatism classification
 * (simple/compound myopic, simple/compound hyperopic, mixed).
 */

// ── Configurable thresholds ─────────────────────────────────────

export interface DiagnosisThresholds {
  myopiaLowMax: number;
  myopiaModerateMax: number;
  hyperopiaLowMax: number;
  hyperopiaModerateMax: number;
  astigmatismMildMax: number;
  astigmatismModerateMax: number;
  presbyopiaMinAdd: number;
  presbyopiaMinAge: number;
  refractiveThreshold: number;
  astigmatismThreshold: number;
  /** Values within ±zeroTolerance are considered plano */
  zeroTolerance: number;
}

export const DEFAULT_THRESHOLDS: DiagnosisThresholds = {
  myopiaLowMax: 2.75,
  myopiaModerateMax: 5.75,
  hyperopiaLowMax: 2.75,
  hyperopiaModerateMax: 5.00,
  astigmatismMildMax: 0.99,
  astigmatismModerateMax: 1.99,
  presbyopiaMinAdd: 0.75,
  presbyopiaMinAge: 40,
  refractiveThreshold: 0.50,
  astigmatismThreshold: 0.50,
  zeroTolerance: 0.49,
};

// ── Types ───────────────────────────────────────────────────────

export type DiagnosisTag =
  | 'myopia_simple_low' | 'myopia_simple_moderate' | 'myopia_simple_high'
  | 'hyperopia_simple_low' | 'hyperopia_simple_moderate' | 'hyperopia_simple_high'
  | 'emmetropia'
  | 'astigmatism_myopic_simple' | 'astigmatism_myopic_compound'
  | 'astigmatism_hyperopic_simple' | 'astigmatism_hyperopic_compound'
  | 'astigmatism_mixed'
  | 'astigmatism_severity_mild' | 'astigmatism_severity_moderate' | 'astigmatism_severity_severe'
  | 'presbyopia';

export interface DiagnosisChip {
  tag: DiagnosisTag;
  label: string;
  color: 'blue' | 'amber' | 'green' | 'purple' | 'rose' | 'indigo';
  explanation: string;
}

export interface EyeDiagnosis {
  chips: DiagnosisChip[];
  se: number | null;
  m1: number | null;
  m2: number | null;
}

export interface FullDiagnosis {
  od: EyeDiagnosis;
  oi: EyeDiagnosis;
  globalSummary: string;
  suggestions: string[];
}

// ── Helpers ─────────────────────────────────────────────────────

function computeSE(sph: number | null, cyl: number | null): number | null {
  if (sph === null) return null;
  return sph + (cyl ?? 0) / 2;
}

function fmtD(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}D`;
}

function isPlano(val: number, t: DiagnosisThresholds): boolean {
  return Math.abs(val) <= t.zeroTolerance;
}

// ── Severity classifiers ────────────────────────────────────────

function myopiaSeverityLabel(absVal: number, t: DiagnosisThresholds): string {
  if (absVal <= t.myopiaLowMax) return 'baja';
  if (absVal <= t.myopiaModerateMax) return 'moderada';
  return 'alta';
}

function hyperopiaSeverityLabel(val: number, t: DiagnosisThresholds): string {
  if (val <= t.hyperopiaLowMax) return 'baja';
  if (val <= t.hyperopiaModerateMax) return 'moderada';
  return 'alta';
}

function astigmatismSeverityChip(absCyl: number, t: DiagnosisThresholds): DiagnosisChip {
  if (absCyl <= t.astigmatismMildMax) {
    return { tag: 'astigmatism_severity_mild', label: 'CYL leve', color: 'purple', explanation: `|CYL| = ${absCyl.toFixed(2)}D → Astigmatismo leve` };
  }
  if (absCyl <= t.astigmatismModerateMax) {
    return { tag: 'astigmatism_severity_moderate', label: 'CYL moderado', color: 'purple', explanation: `|CYL| = ${absCyl.toFixed(2)}D → Astigmatismo moderado` };
  }
  return { tag: 'astigmatism_severity_severe', label: 'CYL severo', color: 'rose', explanation: `|CYL| = ${absCyl.toFixed(2)}D → Astigmatismo severo (≥ 2.00)` };
}

// ── Core engine (meridian-based) ────────────────────────────────

export function diagnoseEye(
  sph: number | null,
  cyl: number | null,
  add: number | null,
  patientAge: number | null,
  t: DiagnosisThresholds = DEFAULT_THRESHOLDS,
): EyeDiagnosis {
  if (sph === null) return { chips: [], se: null, m1: null, m2: null };

  const se = computeSE(sph, cyl);
  const m1 = sph;
  const m2 = sph + (cyl ?? 0);
  const absCyl = Math.abs(cyl ?? 0);
  const chips: DiagnosisChip[] = [];

  const hasCyl = absCyl >= t.astigmatismThreshold;

  if (!hasCyl) {
    // ─── No significant astigmatism → simple refractive error ───
    if (sph <= -t.refractiveThreshold) {
      const sev = myopiaSeverityLabel(Math.abs(sph), t);
      chips.push({
        tag: `myopia_simple_${sev}` as DiagnosisTag,
        label: `Miopía simple ${sev}`,
        color: sev === 'alta' ? 'rose' : 'blue',
        explanation: `SPH = ${fmtD(sph)}, CYL ≈ 0 → Miopía simple ${sev}`,
      });
    } else if (sph >= t.refractiveThreshold) {
      const sev = hyperopiaSeverityLabel(sph, t);
      chips.push({
        tag: `hyperopia_simple_${sev}` as DiagnosisTag,
        label: `Hipermetropía simple ${sev}`,
        color: sev === 'alta' ? 'rose' : 'amber',
        explanation: `SPH = ${fmtD(sph)}, CYL ≈ 0 → Hipermetropía simple ${sev}`,
      });
    } else {
      chips.push({
        tag: 'emmetropia',
        label: 'Emétrope',
        color: 'green',
        explanation: `SPH = ${fmtD(sph)}, CYL ≈ 0 → Sin ametropía significativa`,
      });
    }
  } else {
    // ─── Astigmatism present → meridian analysis ───
    const m1Neg = m1 < -t.zeroTolerance;
    const m1Pos = m1 > t.zeroTolerance;
    const m1Zero = isPlano(m1, t);
    const m2Neg = m2 < -t.zeroTolerance;
    const m2Pos = m2 > t.zeroTolerance;
    const m2Zero = isPlano(m2, t);

    const meridianExpl = `M1(SPH) = ${fmtD(m1)}, M2(SPH+CYL) = ${fmtD(m2)}`;

    if (m1Neg && m2Neg) {
      chips.push({
        tag: 'astigmatism_myopic_compound',
        label: 'Astigmatismo miópico compuesto',
        color: 'indigo',
        explanation: `${meridianExpl} → Ambos meridianos negativos`,
      });
    } else if ((m1Neg && m2Zero) || (m1Zero && m2Neg)) {
      chips.push({
        tag: 'astigmatism_myopic_simple',
        label: 'Astigmatismo miópico simple',
        color: 'blue',
        explanation: `${meridianExpl} → Un meridiano negativo, otro plano`,
      });
    } else if (m1Pos && m2Pos) {
      chips.push({
        tag: 'astigmatism_hyperopic_compound',
        label: 'Astigmatismo hipermetrópico compuesto',
        color: 'amber',
        explanation: `${meridianExpl} → Ambos meridianos positivos`,
      });
    } else if ((m1Pos && m2Zero) || (m1Zero && m2Pos)) {
      chips.push({
        tag: 'astigmatism_hyperopic_simple',
        label: 'Astigmatismo hipermetrópico simple',
        color: 'amber',
        explanation: `${meridianExpl} → Un meridiano positivo, otro plano`,
      });
    } else if ((m1Pos && m2Neg) || (m1Neg && m2Pos)) {
      chips.push({
        tag: 'astigmatism_mixed',
        label: 'Astigmatismo mixto',
        color: 'rose',
        explanation: `${meridianExpl} → Un meridiano positivo y otro negativo`,
      });
    }

    // Severity chip for CYL
    chips.push(astigmatismSeverityChip(absCyl, t));
  }

  // ─── Presbyopia ───
  if (add !== null && add >= t.presbyopiaMinAdd) {
    chips.push({
      tag: 'presbyopia',
      label: 'Presbicia',
      color: 'amber',
      explanation: `ADD = ${fmtD(add)} → Presbicia`,
    });
  }

  return { chips, se, m1, m2 };
}

// ── Global summary builder ──────────────────────────────────────

function primaryLabel(chips: DiagnosisChip[]): string {
  return chips
    .filter(c => !c.tag.startsWith('presbyopia') && !c.tag.startsWith('astigmatism_severity'))
    .map(c => c.label)
    .join(' con ');
}

export function buildGlobalSummary(od: EyeDiagnosis, oi: EyeDiagnosis): string {
  if (od.chips.length === 0 && oi.chips.length === 0) return '';

  const odMain = od.chips.filter(c => !c.tag.startsWith('presbyopia') && !c.tag.startsWith('astigmatism_severity'));
  const oiMain = oi.chips.filter(c => !c.tag.startsWith('presbyopia') && !c.tag.startsWith('astigmatism_severity'));
  const hasPresbyopia = od.chips.some(c => c.tag === 'presbyopia') || oi.chips.some(c => c.tag === 'presbyopia');

  const parts: string[] = [];

  const odPrimary = odMain[0]?.tag;
  const oiPrimary = oiMain[0]?.tag;

  if (odPrimary && odPrimary === oiPrimary) {
    parts.push(`${odMain[0].label} bilateral`);
  } else {
    if (odMain.length > 0) parts.push(`${odMain.map(c => c.label).join(' ')} OD`);
    if (oiMain.length > 0) parts.push(`${oiMain.map(c => c.label).join(' ')} OI`);
  }

  if (hasPresbyopia) parts.push('Presbicia');

  return parts.join('. ') + '.';
}

// ── Full diagnosis from form data ───────────────────────────────

export interface EyeInputData {
  sphereValue: string;
  sphereSign: '+' | '-' | '';
  cylinderValue: string;
  cylinderSign: '+' | '-' | '';
  add: string;
}

function parseSignedValue(value: string, sign: '+' | '-' | ''): number | null {
  if (!value || value.trim() === '') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (sign === '') return num === 0 ? 0 : null;
  return sign === '-' ? -Math.abs(num) : Math.abs(num);
}

function parseAdd(value: string): number | null {
  if (!value || value.trim() === '') return null;
  const num = parseFloat(value.replace(/[+-]/g, ''));
  return isNaN(num) || num <= 0 ? null : num;
}

export function computeFullDiagnosis(
  odInput: EyeInputData,
  oiInput: EyeInputData,
  patientAge: number | null,
  thresholds: DiagnosisThresholds = DEFAULT_THRESHOLDS,
): FullDiagnosis {
  const odSph = parseSignedValue(odInput.sphereValue, odInput.sphereSign);
  const odCyl = parseSignedValue(odInput.cylinderValue, odInput.cylinderSign);
  const odAdd = parseAdd(odInput.add);

  const oiSph = parseSignedValue(oiInput.sphereValue, oiInput.sphereSign);
  const oiCyl = parseSignedValue(oiInput.cylinderValue, oiInput.cylinderSign);
  const oiAdd = parseAdd(oiInput.add);

  const od = diagnoseEye(odSph, odCyl, odAdd, patientAge, thresholds);
  const oi = diagnoseEye(oiSph, oiCyl, oiAdd, patientAge, thresholds);

  const globalSummary = buildGlobalSummary(od, oi);

  const suggestions: string[] = [];
  if (patientAge !== null && patientAge >= thresholds.presbyopiaMinAge && odAdd === null && oiAdd === null) {
    suggestions.push('Evaluar posible presbicia por edad (≥ 40 años). Capture ADD si aplica.');
  }

  // Anisometropia detection
  if (od.se !== null && oi.se !== null) {
    const seDiff = Math.abs(od.se - oi.se);
    if (seDiff > 2.00) {
      suggestions.push(`Posible anisometropía significativa: diferencia de SE entre OD y OI = ${seDiff.toFixed(2)}D (> 2.00D).`);
    }
  }

  return { od, oi, globalSummary, suggestions };
}
