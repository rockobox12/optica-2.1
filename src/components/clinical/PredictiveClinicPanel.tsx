import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Glasses,
  Info,
  Lightbulb,
  TrendingDown,
} from 'lucide-react';
import {
  computePredictiveAnalysis,
  riskLevelConfig,
  type HistoricalExam,
  type MyopicProjection,
  type PredictiveAnalysisResult,
  type TreatmentRecommendation,
} from '@/lib/clinical-predictive';

interface PredictiveClinicPanelProps {
  odSphere: number | null;
  odCylinder: number | null;
  odAdd: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
  oiAdd: number | null;
  patientAge: number | null;
  examHistory: HistoricalExam[];
}

function fmtD(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}D`;
}

// ── Risk Bar ────────────────────────────────────────────────────

function RiskBar({ score, level }: { score: number; level: string }) {
  const config = riskLevelConfig[level as keyof typeof riskLevelConfig];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-bold', config.color)}>{config.label}</span>
        <span className="text-xs font-mono text-muted-foreground">{score}/100</span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', config.barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ── Projection Card ─────────────────────────────────────────────

function ProjectionCard({ proj }: { proj: MyopicProjection }) {
  return (
    <div className={cn(
      'rounded-lg border px-3 py-2 space-y-1',
      proj.isSignificant ? 'bg-warning/10 border-warning/30' : 'bg-muted/50 border-border/50',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">{proj.eye}</span>
        <Badge variant="outline" className="text-[10px]">
          {proj.dataPoints} exámenes
        </Badge>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground">Actual:</span>
        <span className="text-sm font-mono font-medium">{fmtD(proj.currentSph)}</span>
        <TrendingDown className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Proyección 3 años:</span>
        <span className={cn('text-sm font-mono font-bold', proj.isSignificant ? 'text-warning' : '')}>
          {fmtD(proj.projected3yr)}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Tasa: {fmtD(proj.annualRate)}/año
        {proj.isSignificant && ' — Alta probabilidad de progresión'}
      </p>
    </div>
  );
}

// ── Treatment Checklist ─────────────────────────────────────────

function TreatmentItem({ tx }: { tx: TreatmentRecommendation }) {
  const priorityConfig = {
    high: 'border-destructive/30 bg-destructive/5',
    medium: 'border-warning/30 bg-warning/5',
    low: 'border-border bg-muted/30',
  };
  const priorityBadge = {
    high: { label: 'Alta', variant: 'destructive' as const },
    medium: { label: 'Media', variant: 'outline' as const },
    low: { label: 'Baja', variant: 'secondary' as const },
  };

  const catIcons = {
    lens: Glasses,
    treatment: Activity,
    followup: BarChart3,
  };
  const Icon = catIcons[tx.category];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-default',
            priorityConfig[tx.priority],
          )}>
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium flex-1">{tx.label}</span>
            <Badge variant={priorityBadge[tx.priority].variant} className="text-[9px] px-1.5 py-0">
              {priorityBadge[tx.priority].label}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p>{tx.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main Panel ──────────────────────────────────────────────────

export function PredictiveClinicPanel({
  odSphere,
  odCylinder,
  odAdd,
  oiSphere,
  oiCylinder,
  oiAdd,
  patientAge,
  examHistory,
}: PredictiveClinicPanelProps) {
  const result = useMemo<PredictiveAnalysisResult>(
    () =>
      computePredictiveAnalysis(
        odSphere, odCylinder, odAdd,
        oiSphere, oiCylinder, oiAdd,
        patientAge, examHistory,
      ),
    [odSphere, odCylinder, odAdd, oiSphere, oiCylinder, oiAdd, patientAge, examHistory],
  );

  const hasProjections = result.projections.length > 0;
  const hasTreatments = result.treatments.length > 0;
  const hasScore = result.riskScore.score > 0;

  if (!hasProjections && !hasTreatments && !hasScore) return null;

  const lensTx = result.treatments.filter(t => t.category === 'lens');
  const treatTx = result.treatments.filter(t => t.category === 'treatment');
  const followTx = result.treatments.filter(t => t.category === 'followup');

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Análisis Predictivo Clínico</h4>
        </div>
        {!result.hasEnoughHistory && (
          <Badge variant="outline" className="text-[10px]">
            Historial limitado
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Risk Score */}
        {hasScore && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Score de Riesgo Visual
              </span>
            </div>
            <RiskBar score={result.riskScore.score} level={result.riskScore.level} />
            <div className="flex flex-wrap gap-1">
              {result.riskScore.breakdown
                .filter(f => f.active)
                .map((f, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                    {f.label} (+{f.points})
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {/* Projections */}
        {hasProjections && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Proyección a 3 Años
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.projections.map(proj => (
                <ProjectionCard key={proj.eye} proj={proj} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground italic pl-1">
              Proyección basada en tendencia histórica. No sustituye criterio clínico.
            </p>
          </div>
        )}

        {/* Treatment Recommendations */}
        {hasTreatments && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recomendaciones Inteligentes
              </span>
            </div>
            <div className="space-y-1.5">
              {lensTx.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground pl-1">Lentes</p>
                  {lensTx.map(tx => <TreatmentItem key={tx.id} tx={tx} />)}
                </div>
              )}
              {treatTx.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground pl-1">Tratamientos</p>
                  {treatTx.map(tx => <TreatmentItem key={tx.id} tx={tx} />)}
                </div>
              )}
              {followTx.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground pl-1">Seguimiento</p>
                  {followTx.map(tx => <TreatmentItem key={tx.id} tx={tx} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 pt-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-tight">
            Las proyecciones, scores y recomendaciones son orientativos. No reemplazan el diagnóstico del especialista.
          </p>
        </div>
      </div>
    </div>
  );
}
