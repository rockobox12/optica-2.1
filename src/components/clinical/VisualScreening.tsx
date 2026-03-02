import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, ShieldCheck, AlertTriangle } from 'lucide-react';

export interface VisualScreeningData {
  distanceVision: string;
  nearVision: string;
  amblyopiaDetection: string;
  strabismus: string;
  contrastSensitivity: string;
  screeningNotes: string;
  requiresFullEval: boolean;
  patientApt: boolean;
}

interface VisualScreeningProps {
  data: VisualScreeningData;
  onChange: (field: keyof VisualScreeningData, value: string | boolean) => void;
}

const screeningOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'alterado', label: 'Alterado' },
  { value: 'no_evaluado', label: 'No evaluado' },
];

function ScreeningSelect({ label, value, onChange, icon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-accent flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-card">
          <SelectValue placeholder="Seleccionar" />
        </SelectTrigger>
        <SelectContent>
          {screeningOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                {opt.value === 'normal' && <span className="w-2 h-2 rounded-full bg-success" />}
                {opt.value === 'alterado' && <span className="w-2 h-2 rounded-full bg-destructive" />}
                {opt.value === 'no_evaluado' && <span className="w-2 h-2 rounded-full bg-muted-foreground" />}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function VisualScreening({ data, onChange }: VisualScreeningProps) {
  return (
    <div className="space-y-4">
      {/* Screening Grid */}
      <div className="rounded-xl border-l-4 border-l-primary bg-secondary/30 p-4 space-y-4">
        <h4 className="text-[13px] font-semibold text-accent flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Evaluación de Tamiz Visual
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ScreeningSelect
            label="Visión Lejana"
            value={data.distanceVision}
            onChange={(v) => onChange('distanceVision', v)}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <ScreeningSelect
            label="Visión Cercana"
            value={data.nearVision}
            onChange={(v) => onChange('nearVision', v)}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <ScreeningSelect
            label="Detección de Ambliopía"
            value={data.amblyopiaDetection}
            onChange={(v) => onChange('amblyopiaDetection', v)}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
          />
          <ScreeningSelect
            label="Estrabismo"
            value={data.strabismus}
            onChange={(v) => onChange('strabismus', v)}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <ScreeningSelect
            label="Sensibilidad al Contraste"
            value={data.contrastSensitivity}
            onChange={(v) => onChange('contrastSensitivity', v)}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl border-l-4 border-l-accent bg-secondary/30 p-4 space-y-3">
        <Label className="text-xs font-semibold text-accent">Observaciones del Tamiz</Label>
        <Textarea
          value={data.screeningNotes}
          onChange={(e) => onChange('screeningNotes', e.target.value)}
          placeholder="Hallazgos relevantes del tamiz visual..."
          rows={3}
          className="bg-card"
        />
      </div>

      {/* Checkboxes */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="requiresFullEval"
            checked={data.requiresFullEval}
            onCheckedChange={(checked) => onChange('requiresFullEval', !!checked)}
          />
          <div>
            <label htmlFor="requiresFullEval" className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Paciente requiere evaluación completa
            </label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marcar si se detectaron anomalías que requieren estudio especializado.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="patientApt"
            checked={data.patientApt}
            onCheckedChange={(checked) => onChange('patientApt', !!checked)}
          />
          <div>
            <label htmlFor="patientApt" className="text-sm font-semibold text-foreground cursor-pointer flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              Paciente apto
            </label>
            <p className="text-xs text-muted-foreground mt-0.5">
              El paciente aprobó el tamiz visual sin hallazgos significativos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
