import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Brain, HelpCircle, Info, Lightbulb, X } from 'lucide-react';
import {
  computeFullDiagnosis,
  type DiagnosisChip,
  type EyeInputData,
  type EyeDiagnosis,
  type FullDiagnosis,
} from '@/lib/clinical-diagnosis';

interface DiagnosisPanelProps {
  odData: EyeInputData;
  oiData: EyeInputData;
  patientAge: number | null;
  diagnosisText: string;
  onDiagnosisTextChange: (text: string) => void;
  diagnosisNotes: string;
  onDiagnosisNotesChange: (notes: string) => void;
}

const chipColorMap: Record<DiagnosisChip['color'], string> = {
  blue: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  amber: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  green: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  purple: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  rose: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800',
};

function fmtD(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}`;
}

function ChipWithTooltip({
  chip,
  removable,
  onRemove,
}: {
  chip: DiagnosisChip;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-default transition-all',
              chipColorMap[chip.color],
              removable && 'pr-1.5'
            )}
          >
            {chip.label}
            {removable && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-medium">¿Por qué?</p>
          <p className="text-muted-foreground">{chip.explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EyeMeridianTooltip({ eye, label }: { eye: EyeDiagnosis; label: string }) {
  if (eye.se === null) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-[10px] text-muted-foreground font-mono cursor-help flex items-center gap-0.5">
            SE: {fmtD(eye.se)}
            <HelpCircle className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-0.5">
          <p className="font-medium">{label} — Cálculo</p>
          {eye.m1 !== null && <p>M1 (SPH) = {fmtD(eye.m1)}</p>}
          {eye.m2 !== null && <p>M2 (SPH+CYL) = {fmtD(eye.m2)}</p>}
          <p>SE = SPH + CYL/2 = {fmtD(eye.se!)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function DiagnosisPanel({
  odData,
  oiData,
  patientAge,
  diagnosisText,
  onDiagnosisTextChange,
  diagnosisNotes,
  onDiagnosisNotesChange,
}: DiagnosisPanelProps) {
  const [manualEdit, setManualEdit] = useState(false);
  const [removedChips, setRemovedChips] = useState<Set<string>>(new Set());

  const diagnosis = useMemo<FullDiagnosis>(() => {
    return computeFullDiagnosis(odData, oiData, patientAge);
  }, [odData, oiData, patientAge]);

  const hasAnyDiagnosis = diagnosis.od.chips.length > 0 || diagnosis.oi.chips.length > 0;

  const filteredOdChips = diagnosis.od.chips.filter(c => !removedChips.has(`od_${c.tag}`));
  const filteredOiChips = diagnosis.oi.chips.filter(c => !removedChips.has(`oi_${c.tag}`));

  const handleRemoveChip = (eye: 'od' | 'oi', tag: string) => {
    setRemovedChips(prev => new Set(prev).add(`${eye}_${tag}`));
  };

  const autoSummary = diagnosis.globalSummary;

  if (!hasAnyDiagnosis && diagnosis.suggestions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Diagnóstico (auto)</h4>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="manual-edit" className="text-xs text-muted-foreground cursor-pointer">
            Editar manualmente
          </Label>
          <Switch
            id="manual-edit"
            checked={manualEdit}
            onCheckedChange={setManualEdit}
            className="scale-75"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {hasAnyDiagnosis && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OD */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">OD</span>
                <EyeMeridianTooltip eye={diagnosis.od} label="Ojo Derecho" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filteredOdChips.length > 0 ? (
                  filteredOdChips.map(chip => (
                    <ChipWithTooltip
                      key={chip.tag}
                      chip={chip}
                      removable={manualEdit}
                      onRemove={() => handleRemoveChip('od', chip.tag)}
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sin diagnóstico</span>
                )}
              </div>
            </div>

            {/* OI */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-secondary-foreground px-1.5 py-0.5 rounded bg-secondary/20">OI</span>
                <EyeMeridianTooltip eye={diagnosis.oi} label="Ojo Izquierdo" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {filteredOiChips.length > 0 ? (
                  filteredOiChips.map(chip => (
                    <ChipWithTooltip
                      key={chip.tag}
                      chip={chip}
                      removable={manualEdit}
                      onRemove={() => handleRemoveChip('oi', chip.tag)}
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sin diagnóstico</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global summary */}
        {autoSummary && (
          <div className="rounded-lg bg-muted/50 px-3 py-2.5 border border-border/50">
            <p className="text-sm font-medium">{autoSummary}</p>
          </div>
        )}

        {/* Suggestions */}
        {diagnosis.suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30">
            <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning">{s}</p>
          </div>
        ))}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notas de diagnóstico (opcional)</Label>
          <Textarea
            value={diagnosisNotes}
            onChange={(e) => onDiagnosisNotesChange(e.target.value)}
            placeholder="Observaciones adicionales del especialista..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 pt-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-tight">
            Diagnóstico sugerido automáticamente según graduación. Confirmar por el especialista.
          </p>
        </div>
      </div>
    </div>
  );
}
