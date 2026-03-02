import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Activity,
  Eye,
  Glasses,
  Info,
  Layers,
  Shield,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  User,
} from 'lucide-react';
import type { PredictiveAnalysisResult } from '@/lib/clinical-predictive';
import type { AdvancedDiagnosisResult } from '@/lib/clinical-advanced-diagnosis';

interface VisualProfilePanelProps {
  odSphere: number | null;
  odCylinder: number | null;
  odAdd: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
  oiAdd: number | null;
  patientAge: number | null;
  diagnosis: string;
  predictive: PredictiveAnalysisResult;
  advanced: AdvancedDiagnosisResult;
}

// ── Visual profile analysis ────────────────────────────────────

interface VisualProfileItem {
  label: string;
  value: string;
  icon: typeof Eye;
  color: string;
}

interface LensSuggestion {
  lensType: string;
  treatments: string[];
  justification: string;
}

function analyzeVisualProfile(
  odSph: number | null, odCyl: number | null, odAdd: number | null,
  oiSph: number | null, oiCyl: number | null, oiAdd: number | null,
  age: number | null, diagnosis: string,
  predictive: PredictiveAnalysisResult,
  advanced: AdvancedDiagnosisResult,
): { profile: VisualProfileItem[]; suggestion: LensSuggestion } {
  const profile: VisualProfileItem[] = [];

  // 1. Ametropía predominante
  const avgSph = avg(odSph, oiSph);
  const avgCyl = avg(odCyl, oiCyl);
  const se = avgSph !== null && avgCyl !== null ? avgSph + avgCyl / 2 : null;

  if (se !== null) {
    if (se <= -6) profile.push({ label: 'Ametropía', value: 'Miopía alta', icon: TrendingDown, color: 'text-destructive' });
    else if (se <= -3) profile.push({ label: 'Ametropía', value: 'Miopía moderada', icon: TrendingDown, color: 'text-warning' });
    else if (se < -0.25) profile.push({ label: 'Ametropía', value: 'Miopía leve', icon: TrendingDown, color: 'text-primary' });
    else if (se <= 0.25) profile.push({ label: 'Ametropía', value: 'Emetropía', icon: Eye, color: 'text-emerald-500' });
    else if (se <= 3) profile.push({ label: 'Ametropía', value: 'Hipermetropía leve', icon: TrendingUp, color: 'text-primary' });
    else if (se <= 6) profile.push({ label: 'Ametropía', value: 'Hipermetropía moderada', icon: TrendingUp, color: 'text-warning' });
    else profile.push({ label: 'Ametropía', value: 'Hipermetropía alta', icon: TrendingUp, color: 'text-destructive' });
  }

  // 2. Astigmatismo
  if (avgCyl !== null && Math.abs(avgCyl) >= 0.25) {
    const absCyl = Math.abs(avgCyl);
    const severity = absCyl >= 3 ? 'Alto' : absCyl >= 1.5 ? 'Moderado' : 'Leve';
    profile.push({ label: 'Astigmatismo', value: severity, icon: Activity, color: absCyl >= 3 ? 'text-destructive' : absCyl >= 1.5 ? 'text-warning' : 'text-muted-foreground' });
  }

  // 3. Presbicia
  const hasAdd = (odAdd !== null && odAdd > 0) || (oiAdd !== null && oiAdd > 0);
  if (hasAdd) {
    const maxAdd = Math.max(odAdd ?? 0, oiAdd ?? 0);
    const level = maxAdd >= 2.5 ? 'Avanzada' : maxAdd >= 1.5 ? 'Moderada' : 'Inicial';
    profile.push({ label: 'Presbicia', value: level, icon: Glasses, color: 'text-amber-500' });
  }

  // 4. Riesgo visual
  const risk = predictive.riskScore;
  profile.push({
    label: 'Riesgo visual',
    value: `${risk.score}/100 — ${risk.level === 'low' ? 'Bajo' : risk.level === 'moderate' ? 'Moderado' : risk.level === 'high' ? 'Alto' : 'Muy alto'}`,
    icon: Shield,
    color: risk.level === 'low' ? 'text-emerald-500' : risk.level === 'moderate' ? 'text-warning' : 'text-destructive',
  });

  // 5. Progresión
  if (predictive.projections.length > 0) {
    const maxRate = Math.max(...predictive.projections.map(p => Math.abs(p.annualRate)));
    const progLabel = maxRate >= 0.75 ? 'Rápida' : maxRate >= 0.25 ? 'Moderada' : 'Estable';
    profile.push({ label: 'Progresión', value: progLabel, icon: TrendingDown, color: maxRate >= 0.75 ? 'text-destructive' : maxRate >= 0.25 ? 'text-warning' : 'text-emerald-500' });
  }

  // 6. Grupo etario
  if (age !== null) {
    const grupo = age < 12 ? 'Pediátrico' : age < 18 ? 'Adolescente' : age < 40 ? 'Adulto joven' : age < 60 ? 'Adulto' : 'Adulto mayor';
    profile.push({ label: 'Grupo etario', value: grupo, icon: User, color: 'text-muted-foreground' });
  }

  // ── Lens suggestion ──
  const suggestion = computeLensSuggestion(odSph, odCyl, odAdd, oiSph, oiCyl, oiAdd, age, se, hasAdd, predictive, advanced);

  return { profile, suggestion };
}

function computeLensSuggestion(
  odSph: number | null, odCyl: number | null, odAdd: number | null,
  oiSph: number | null, oiCyl: number | null, oiAdd: number | null,
  age: number | null, se: number | null, hasAdd: boolean,
  predictive: PredictiveAnalysisResult, advanced: AdvancedDiagnosisResult,
): LensSuggestion {
  const treatments: string[] = [];
  let lensType = 'Monofocal';
  let justification = '';

  const absSe = se !== null ? Math.abs(se) : 0;
  const avgCyl = avg(odCyl, oiCyl);
  const absCyl = avgCyl !== null ? Math.abs(avgCyl) : 0;
  const maxAdd = Math.max(odAdd ?? 0, oiAdd ?? 0);
  const isHighRx = absSe >= 4 || absCyl >= 2;

  // Lens type
  if (hasAdd && maxAdd > 0) {
    if (maxAdd <= 1.25) {
      lensType = 'Progresivo o Bifocal (ADD baja)';
      justification = 'ADD baja detectada; progresivo suave o bifocal según preferencia del paciente.';
    } else {
      lensType = 'Progresivo';
      justification = `ADD de ${maxAdd.toFixed(2)}D requiere corrección para visión intermedia y cercana.`;
    }
  } else if (age !== null && age >= 40) {
    lensType = 'Monofocal (considerar progresivo preventivo)';
    justification = 'Paciente en rango presbicia sin ADD registrada; evaluar necesidades de visión cercana.';
  } else {
    justification = 'Corrección de visión lejana sin necesidad de ADD.';
  }

  // Treatments
  if (isHighRx) {
    treatments.push('Alto índice (1.67+)');
    justification += ' Graduación elevada, se recomienda material de alto índice para confort y estética.';
  }

  // High astigmatism → toric design
  if (absCyl >= 2) {
    treatments.push('Diseño tórico optimizado');
  }

  // Digital fatigue for young adults
  if (age !== null && age >= 18 && age <= 45 && !hasAdd) {
    treatments.push('Filtro luz azul');
  }

  // Progression alerts
  const hasProgression = predictive.projections.some(p => Math.abs(p.annualRate) >= 0.5);
  if (hasProgression && age !== null && age < 25) {
    treatments.push('Control de miopía');
    justification += ' Progresión activa detectada en paciente joven.';
  }

  // UV always
  treatments.push('Protección UV');

  // Antirreflejante
  treatments.push('Antirreflejante');

  // Keratoconus suspicion
  const hasKeratoconus = advanced.alerts.some(a => a.title.toLowerCase().includes('queratocono'));
  if (hasKeratoconus) {
    treatments.push('Referir a especialista en córnea');
    justification += ' Sospecha de queratocono detectada; valorar topografía corneal.';
  }

  return { lensType, treatments, justification: justification.trim() };
}

function avg(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return (a + b) / 2;
  return a ?? b;
}

// ── Component ──────────────────────────────────────────────────

export function VisualProfilePanel({
  odSphere, odCylinder, odAdd,
  oiSphere, oiCylinder, oiAdd,
  patientAge, diagnosis,
  predictive, advanced,
}: VisualProfilePanelProps) {
  const { profile, suggestion } = useMemo(
    () => analyzeVisualProfile(
      odSphere, odCylinder, odAdd,
      oiSphere, oiCylinder, oiAdd,
      patientAge, diagnosis, predictive, advanced,
    ),
    [odSphere, odCylinder, odAdd, oiSphere, oiCylinder, oiAdd, patientAge, diagnosis, predictive, advanced],
  );

  const hasData = odSphere !== null || oiSphere !== null;
  if (!hasData) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Análisis Visual Inteligente</h4>
      </div>

      <div className="p-4 space-y-4">
        {/* ── Perfil Visual ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Perfil Visual del Paciente
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {profile.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                  <Icon className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', item.color)} />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className="text-xs font-semibold">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sugerencia Técnica de Lente ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sugerencia Técnica de Lente
            </span>
          </div>

          <div className="rounded-lg border border-border p-3 bg-gradient-to-br from-primary/5 to-primary/0">
            <div className="flex items-center gap-2 mb-2">
              <Glasses className={cn('h-5 w-5 text-primary')} />
              <p className="text-sm font-bold">{suggestion.lensType}</p>
            </div>

            <p className="text-xs text-muted-foreground mb-2">{suggestion.justification}</p>

            <div className="flex items-center gap-1.5 mb-1">
              <Sun className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tratamientos sugeridos</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {suggestion.treatments.map((t, i) => (
                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 pt-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-tight">
            Sugerencias basadas en datos clínicos. El especialista determina la indicación final.
          </p>
        </div>
      </div>
    </div>
  );
}
