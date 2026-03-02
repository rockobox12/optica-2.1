/**
 * Advanced clinical intelligence module.
 * Extends the base diagnosis engine with:
 * - Keratoconus suspect detection
 * - Myopic progression analysis
 * - Lens type suggestions
 * - Clinical summary generation
 */

// ── Types ───────────────────────────────────────────────────────

export type AlertLevel = 'info' | 'warning' | 'danger';

export interface ClinicalAlert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  category: 'keratoconus' | 'progression' | 'general';
}

export interface LensSuggestion {
  id: string;
  label: string;
  reason: string;
  category: 'type' | 'material' | 'treatment';
}

export interface PreviousExamData {
  examDate: string;
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
  oiAxis: number | null;
}

export interface AdvancedDiagnosisResult {
  alerts: ClinicalAlert[];
  lensSuggestions: LensSuggestion[];
  clinicalSummary: string;
  progressionNotes: string[];
}

// ── Keratoconus Detection ───────────────────────────────────────

function detectKeratoconus(
  cyl: number | null,
  axis: number | null,
  eye: 'OD' | 'OI',
  prevAxis: number | null,
): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  if (cyl === null) return alerts;

  const absCyl = Math.abs(cyl);

  if (absCyl >= 4.00) {
    alerts.push({
      id: `keratoconus_severe_${eye}`,
      level: 'danger',
      title: `ALERTA ${eye}: Astigmatismo severo`,
      description: 'Sugerir topografía corneal para descartar queratocono.',
      category: 'keratoconus',
    });
  } else if (absCyl >= 3.00) {
    alerts.push({
      id: `keratoconus_suspect_${eye}`,
      level: 'warning',
      title: `${eye}: Sospecha de astigmatismo irregular`,
      description: 'Descartar queratocono. Considerar topografía corneal.',
      category: 'keratoconus',
    });
  } else if (absCyl >= 2.00) {
    alerts.push({
      id: `keratoconus_elevated_${eye}`,
      level: 'info',
      title: `${eye}: Astigmatismo elevado`,
      description: 'Evaluar irregularidad corneal en próxima visita.',
      category: 'keratoconus',
    });
  }

  // Axis change detection
  if (axis !== null && prevAxis !== null) {
    let axisDiff = Math.abs(axis - prevAxis);
    if (axisDiff > 90) axisDiff = 180 - axisDiff;
    if (axisDiff > 30) {
      alerts.push({
        id: `axis_change_${eye}`,
        level: 'warning',
        title: `${eye}: Cambio significativo de eje (${axisDiff}°)`,
        description: 'Evaluar estabilidad corneal. Comparar con examen anterior.',
        category: 'keratoconus',
      });
    }
  }

  return alerts;
}

// ── Myopic Progression ──────────────────────────────────────────

function detectMyopicProgression(
  currentSph: number | null,
  prevSph: number | null,
  prevDate: string | null,
  eye: 'OD' | 'OI',
  patientAge: number | null,
): { alerts: ClinicalAlert[]; notes: string[] } {
  const alerts: ClinicalAlert[] = [];
  const notes: string[] = [];

  if (currentSph === null || prevSph === null || prevDate === null) {
    // High myopia warning even without previous data
    if (currentSph !== null && currentSph <= -6.00) {
      alerts.push({
        id: `high_myopia_${eye}`,
        level: 'warning',
        title: `${eye}: Miopía alta (${currentSph.toFixed(2)}D)`,
        description: 'Seguimiento anual recomendado. Evaluar fondo de ojo.',
        category: 'progression',
      });
    }
    return { alerts, notes };
  }

  const diff = currentSph - prevSph; // negative = more myopic
  const examDate = new Date(prevDate);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - examDate.getFullYear()) * 12 + (now.getMonth() - examDate.getMonth());
  const withinYear = monthsDiff <= 12;

  if (withinYear && diff <= -1.00) {
    alerts.push({
      id: `progression_significant_${eye}`,
      level: 'warning',
      title: `${eye}: Progresión miópica significativa`,
      description: `Cambio de ${diff.toFixed(2)}D en ${monthsDiff} meses. Requiere seguimiento cercano.`,
      category: 'progression',
    });
    notes.push(`${eye}: Progresión miópica significativa (${diff.toFixed(2)}D en ${monthsDiff}m)`);
  } else if (withinYear && diff <= -0.50) {
    alerts.push({
      id: `progression_mild_${eye}`,
      level: 'info',
      title: `${eye}: Progresión miópica leve`,
      description: `Cambio de ${diff.toFixed(2)}D en ${monthsDiff} meses.`,
      category: 'progression',
    });
    notes.push(`${eye}: Progresión miópica leve (${diff.toFixed(2)}D en ${monthsDiff}m)`);
  }

  if (patientAge !== null && patientAge < 18 && diff <= -0.50 && withinYear) {
    alerts.push({
      id: `myopia_control_${eye}`,
      level: 'warning',
      title: `${eye}: Paciente joven con progresión`,
      description: 'Evaluar control de miopía (lentes especiales / seguimiento cada 6 meses).',
      category: 'progression',
    });
  }

  if (currentSph <= -6.00) {
    alerts.push({
      id: `high_myopia_${eye}`,
      level: 'warning',
      title: `${eye}: Miopía alta (${currentSph.toFixed(2)}D)`,
      description: 'Seguimiento anual recomendado. Evaluar fondo de ojo.',
      category: 'progression',
    });
  }

  return { alerts, notes };
}

// ── Lens Suggestions ────────────────────────────────────────────

function generateLensSuggestions(
  odSph: number | null,
  oiSph: number | null,
  odCyl: number | null,
  oiCyl: number | null,
  odAdd: number | null,
  oiAdd: number | null,
  patientAge: number | null,
): LensSuggestion[] {
  const suggestions: LensSuggestion[] = [];
  const maxAbsSph = Math.max(Math.abs(odSph ?? 0), Math.abs(oiSph ?? 0));
  const maxAbsCyl = Math.max(Math.abs(odCyl ?? 0), Math.abs(oiCyl ?? 0));
  const hasPresbyopia = (odAdd !== null && odAdd >= 0.75) || (oiAdd !== null && oiAdd >= 0.75);
  const isMyopic = (odSph !== null && odSph < -0.50) || (oiSph !== null && oiSph < -0.50);
  const isHyperopic = (odSph !== null && odSph > 0.50) || (oiSph !== null && oiSph > 0.50);
  const isChild = patientAge !== null && patientAge < 18;

  // Lens type
  if (hasPresbyopia) {
    suggestions.push({
      id: 'lens_progressive',
      label: 'Progresivo',
      reason: 'Presbicia detectada – lente progresivo recomendado para visión a todas las distancias.',
      category: 'type',
    });
    suggestions.push({
      id: 'lens_bifocal',
      label: 'Bifocal',
      reason: 'Opción económica para presbicia.',
      category: 'type',
    });
    suggestions.push({
      id: 'lens_occupational',
      label: 'Ocupacional',
      reason: 'Ideal si trabaja en oficina (visión intermedia y cerca).',
      category: 'type',
    });
  } else {
    suggestions.push({
      id: 'lens_monofocal',
      label: 'Monofocal',
      reason: 'Sin presbicia – lente monofocal estándar.',
      category: 'type',
    });
    if (isHyperopic && patientAge !== null && patientAge > 40) {
      suggestions.push({
        id: 'lens_progressive_eval',
        label: 'Evaluar progresivo',
        reason: 'Hipermétrope mayor de 40 años – evaluar necesidad de progresivo.',
        category: 'type',
      });
    }
  }

  // Material
  if (maxAbsSph >= 6.00) {
    suggestions.push({
      id: 'material_high_index',
      label: 'Índice alto (1.67+)',
      reason: `Graduación alta (${maxAbsSph.toFixed(2)}D) – lente de índice alto para reducir grosor y peso.`,
      category: 'material',
    });
  } else if (maxAbsSph >= 3.00) {
    suggestions.push({
      id: 'material_mid_index',
      label: 'Índice medio (1.60)',
      reason: 'Graduación moderada – índice medio para mejor estética.',
      category: 'material',
    });
  }

  // Treatments
  if (maxAbsCyl >= 1.00) {
    suggestions.push({
      id: 'treatment_ar',
      label: 'Antirreflejante',
      reason: `Astigmatismo > 1.00D – AR recomendado para mejor calidad óptica.`,
      category: 'treatment',
    });
  }
  if (maxAbsCyl >= 2.00) {
    suggestions.push({
      id: 'treatment_ar_premium',
      label: 'AR Premium',
      reason: 'Astigmatismo elevado – AR de alta calidad obligatorio para nitidez.',
      category: 'treatment',
    });
  }

  // Child myopia control
  if (isChild && isMyopic) {
    suggestions.push({
      id: 'lens_myopia_control',
      label: 'Control de miopía',
      reason: 'Paciente menor de 18 años con miopía – evaluar lentes de control de miopía.',
      category: 'type',
    });
  }

  return suggestions;
}

// ── Clinical Summary ────────────────────────────────────────────

function buildClinicalSummary(
  globalDiagnosis: string,
  alerts: ClinicalAlert[],
  progressionNotes: string[],
): string {
  const parts: string[] = [];

  if (globalDiagnosis) {
    parts.push(`Paciente con ${globalDiagnosis.replace(/\.$/, '')}`);
  }

  if (progressionNotes.length > 0) {
    parts.push(progressionNotes.join('; '));
  }

  const dangerAlerts = alerts.filter(a => a.level === 'danger');
  if (dangerAlerts.length > 0) {
    parts.push('Se requiere evaluación especializada');
  }

  const followUp = alerts.some(a => a.category === 'progression');
  if (followUp) {
    parts.push('Se recomienda seguimiento cercano');
  }

  return parts.length > 0 ? parts.join('. ') + '.' : '';
}

// ── Main Entry Point ────────────────────────────────────────────

export function computeAdvancedDiagnosis(
  odSph: number | null,
  odCyl: number | null,
  odAxis: number | null,
  odAdd: number | null,
  oiSph: number | null,
  oiCyl: number | null,
  oiAxis: number | null,
  oiAdd: number | null,
  patientAge: number | null,
  previousExam: PreviousExamData | null,
  globalDiagnosis: string,
): AdvancedDiagnosisResult {
  const alerts: ClinicalAlert[] = [];
  const progressionNotes: string[] = [];

  // Keratoconus detection
  alerts.push(...detectKeratoconus(odCyl, odAxis, 'OD', previousExam?.odAxis ?? null));
  alerts.push(...detectKeratoconus(oiCyl, oiAxis, 'OI', previousExam?.oiAxis ?? null));

  // Myopic progression
  const odProg = detectMyopicProgression(
    odSph, previousExam?.odSphere ?? null,
    previousExam?.examDate ?? null, 'OD', patientAge,
  );
  alerts.push(...odProg.alerts);
  progressionNotes.push(...odProg.notes);

  const oiProg = detectMyopicProgression(
    oiSph, previousExam?.oiSphere ?? null,
    previousExam?.examDate ?? null, 'OI', patientAge,
  );
  alerts.push(...oiProg.alerts);
  progressionNotes.push(...oiProg.notes);

  // Deduplicate alerts by id
  const uniqueAlerts = Array.from(new Map(alerts.map(a => [a.id, a])).values());

  // Sort: danger first, then warning, then info
  const levelOrder: Record<AlertLevel, number> = { danger: 0, warning: 1, info: 2 };
  uniqueAlerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);

  // Lens suggestions
  const lensSuggestions = generateLensSuggestions(
    odSph, oiSph, odCyl, oiCyl, odAdd, oiAdd, patientAge,
  );

  // Clinical summary
  const clinicalSummary = buildClinicalSummary(globalDiagnosis, uniqueAlerts, progressionNotes);

  return {
    alerts: uniqueAlerts,
    lensSuggestions,
    clinicalSummary,
    progressionNotes,
  };
}
