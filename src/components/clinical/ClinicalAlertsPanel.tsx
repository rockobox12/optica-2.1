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
  AlertTriangle,
  Eye,
  Glasses,
  Lightbulb,
  Shield,
  TrendingDown,
  Info,
} from 'lucide-react';
import {
  computeAdvancedDiagnosis,
  type AdvancedDiagnosisResult,
  type AlertLevel,
  type ClinicalAlert,
  type LensSuggestion,
  type PreviousExamData,
} from '@/lib/clinical-advanced-diagnosis';

interface ClinicalAlertsPanelProps {
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  odAdd: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
  oiAxis: number | null;
  oiAdd: number | null;
  patientAge: number | null;
  previousExam: PreviousExamData | null;
  globalDiagnosis: string;
}

const alertLevelConfig: Record<AlertLevel, { bg: string; icon: typeof AlertTriangle; iconClass: string }> = {
  danger: {
    bg: 'bg-destructive/10 border-destructive/30',
    icon: Shield,
    iconClass: 'text-destructive',
  },
  warning: {
    bg: 'bg-warning/10 border-warning/30',
    icon: AlertTriangle,
    iconClass: 'text-warning',
  },
  info: {
    bg: 'bg-primary/10 border-primary/30',
    icon: Info,
    iconClass: 'text-primary',
  },
};

const categoryConfig: Record<LensSuggestion['category'], { label: string; color: string }> = {
  type: { label: 'Tipo', color: 'bg-primary/10 text-primary border-primary/30' },
  material: { label: 'Material', color: 'bg-accent text-accent-foreground border-accent' },
  treatment: { label: 'Tratamiento', color: 'bg-secondary text-secondary-foreground border-secondary' },
};

function AlertCard({ alert }: { alert: ClinicalAlert }) {
  const config = alertLevelConfig[alert.level];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border', config.bg)}>
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', config.iconClass)} />
      <div className="min-w-0">
        <p className="text-xs font-semibold">{alert.title}</p>
        <p className="text-[11px] text-muted-foreground">{alert.description}</p>
      </div>
    </div>
  );
}

function LensChip({ suggestion }: { suggestion: LensSuggestion }) {
  const catConfig = categoryConfig[suggestion.category];
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-default',
              catConfig.color,
            )}
          >
            <Glasses className="h-3 w-3" />
            {suggestion.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-medium">{catConfig.label}</p>
          <p className="text-muted-foreground">{suggestion.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ClinicalAlertsPanel({
  odSphere,
  odCylinder,
  odAxis,
  odAdd,
  oiSphere,
  oiCylinder,
  oiAxis,
  oiAdd,
  patientAge,
  previousExam,
  globalDiagnosis,
}: ClinicalAlertsPanelProps) {
  const result = useMemo<AdvancedDiagnosisResult>(
    () =>
      computeAdvancedDiagnosis(
        odSphere, odCylinder, odAxis, odAdd,
        oiSphere, oiCylinder, oiAxis, oiAdd,
        patientAge, previousExam, globalDiagnosis,
      ),
    [odSphere, odCylinder, odAxis, odAdd, oiSphere, oiCylinder, oiAxis, oiAdd, patientAge, previousExam, globalDiagnosis],
  );

  const hasAlerts = result.alerts.length > 0;
  const hasSuggestions = result.lensSuggestions.length > 0;
  const hasSummary = result.clinicalSummary.length > 0;

  if (!hasAlerts && !hasSuggestions && !hasSummary) return null;

  const typeSuggestions = result.lensSuggestions.filter(s => s.category === 'type');
  const materialSuggestions = result.lensSuggestions.filter(s => s.category === 'material');
  const treatmentSuggestions = result.lensSuggestions.filter(s => s.category === 'treatment');

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Inteligencia Clínica Avanzada</h4>
        </div>
        <div className="flex items-center gap-1">
          {result.alerts.filter(a => a.level === 'danger').length > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {result.alerts.filter(a => a.level === 'danger').length} alto riesgo
            </Badge>
          )}
          {result.alerts.filter(a => a.level === 'warning').length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning text-warning">
              {result.alerts.filter(a => a.level === 'warning').length} seguimiento
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Clinical Alerts */}
        {hasAlerts && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Alertas Clínicas
              </span>
            </div>
            <div className="space-y-1.5">
              {result.alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* Lens Suggestions */}
        {hasSuggestions && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sugerencia de Lente
              </span>
            </div>
            <div className="space-y-2">
              {typeSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {typeSuggestions.map(s => <LensChip key={s.id} suggestion={s} />)}
                </div>
              )}
              {materialSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {materialSuggestions.map(s => <LensChip key={s.id} suggestion={s} />)}
                </div>
              )}
              {treatmentSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {treatmentSuggestions.map(s => <LensChip key={s.id} suggestion={s} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Clinical Summary */}
        {hasSummary && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resumen Clínico
              </span>
            </div>
            <div className="rounded-lg bg-muted/50 px-3 py-2.5 border border-border/50">
              <p className="text-sm">{result.clinicalSummary}</p>
            </div>
          </div>
        )}

        {/* Progression comparison */}
        {previousExam && result.progressionNotes.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comparación con Examen Previo
              </span>
            </div>
            <div className="space-y-1">
              {result.progressionNotes.map((note, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-5">• {note}</p>
              ))}
              <p className="text-[10px] text-muted-foreground pl-5 italic">
                Último examen: {new Date(previousExam.examDate).toLocaleDateString('es-MX')}
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 pt-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-tight">
            Las alertas y sugerencias son orientativas. No reemplazan el criterio del especialista.
          </p>
        </div>
      </div>
    </div>
  );
}
