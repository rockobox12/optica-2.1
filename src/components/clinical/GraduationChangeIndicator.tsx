import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface GraduationChangeIndicatorProps {
  currentOdSph: number | null;
  currentOdCyl: number | null;
  currentOdAxis: number | null;
  currentOdAdd: number | null;
  currentOiSph: number | null;
  currentOiCyl: number | null;
  currentOiAxis: number | null;
  currentOiAdd: number | null;
  previousOdSph: number | null;
  previousOdCyl: number | null;
  previousOdAxis: number | null;
  previousOdAdd: number | null;
  previousOiSph: number | null;
  previousOiCyl: number | null;
  previousOiAxis: number | null;
  previousOiAdd: number | null;
  previousExamDate?: string;
  compact?: boolean;
}

type ChangeLevel = 'stable' | 'moderate' | 'significant';

const formatD = (v: number | null) => v !== null ? (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '—';

interface CriterionResult {
  label: string;
  diff: number;
  exceeded: boolean;
  strong: boolean; // >=1.00 for SPH/CYL
}

function getAxisDiff(current: number | null, previous: number | null): number {
  if (current === null || previous === null) return 0;
  const raw = Math.abs(current - previous);
  return Math.min(raw, 180 - raw); // Angular minimum difference 0-180
}

function analyzeCriteria(
  currentOdSph: number | null, currentOdCyl: number | null, currentOdAxis: number | null, currentOdAdd: number | null,
  currentOiSph: number | null, currentOiCyl: number | null, currentOiAxis: number | null, currentOiAdd: number | null,
  previousOdSph: number | null, previousOdCyl: number | null, previousOdAxis: number | null, previousOdAdd: number | null,
  previousOiSph: number | null, previousOiCyl: number | null, previousOiAxis: number | null, previousOiAdd: number | null,
) {
  const criteria: CriterionResult[] = [];

  // SPH checks (threshold 0.50, strong 1.00)
  const sphPairs: [string, number | null, number | null][] = [
    ['SPH OD', currentOdSph, previousOdSph],
    ['SPH OI', currentOiSph, previousOiSph],
  ];
  for (const [label, cur, prev] of sphPairs) {
    if (cur !== null && prev !== null) {
      const diff = Math.abs(cur - prev);
      criteria.push({ label, diff, exceeded: diff >= 0.50, strong: diff >= 1.00 });
    }
  }

  // CYL checks (threshold 0.50, strong 1.00)
  const cylPairs: [string, number | null, number | null][] = [
    ['CYL OD', currentOdCyl, previousOdCyl],
    ['CYL OI', currentOiCyl, previousOiCyl],
  ];
  for (const [label, cur, prev] of cylPairs) {
    if (cur !== null && prev !== null) {
      const diff = Math.abs(cur - prev);
      criteria.push({ label, diff, exceeded: diff >= 0.50, strong: diff >= 1.00 });
    }
  }

  // AXIS checks (threshold 15°, only if CYL ≠ 0)
  const axisPairs: [string, number | null, number | null, number | null][] = [
    ['EJE OD', currentOdAxis, previousOdAxis, currentOdCyl],
    ['EJE OI', currentOiAxis, previousOiAxis, currentOiCyl],
  ];
  for (const [label, cur, prev, cyl] of axisPairs) {
    if (cur !== null && prev !== null && cyl !== null && cyl !== 0) {
      const diff = getAxisDiff(cur, prev);
      criteria.push({ label, diff, exceeded: diff >= 15, strong: false });
    }
  }

  // ADD checks (threshold 0.50)
  const addPairs: [string, number | null, number | null][] = [
    ['ADD OD', currentOdAdd, previousOdAdd],
    ['ADD OI', currentOiAdd, previousOiAdd],
  ];
  for (const [label, cur, prev] of addPairs) {
    if (cur !== null && prev !== null) {
      const diff = Math.abs(cur - prev);
      criteria.push({ label, diff, exceeded: diff >= 0.50, strong: false });
    }
  }

  const exceededCount = criteria.filter(c => c.exceeded).length;
  const hasStrong = criteria.some(c => c.strong);

  let level: ChangeLevel = 'stable';
  if (hasStrong || exceededCount >= 2) level = 'significant';
  else if (exceededCount === 1) level = 'moderate';

  const maxDiff = criteria.length > 0 ? Math.max(...criteria.map(c => c.diff)) : 0;

  return { level, criteria, exceededCount, maxDiff };
}

export function GraduationChangeIndicator({
  currentOdSph, currentOdCyl, currentOdAxis, currentOdAdd,
  currentOiSph, currentOiCyl, currentOiAxis, currentOiAdd,
  previousOdSph, previousOdCyl, previousOdAxis, previousOdAdd,
  previousOiSph, previousOiCyl, previousOiAxis, previousOiAdd,
  previousExamDate,
  compact = false,
}: GraduationChangeIndicatorProps) {
  const analysis = useMemo(() => analyzeCriteria(
    currentOdSph, currentOdCyl, currentOdAxis, currentOdAdd,
    currentOiSph, currentOiCyl, currentOiAxis, currentOiAdd,
    previousOdSph, previousOdCyl, previousOdAxis, previousOdAdd,
    previousOiSph, previousOiCyl, previousOiAxis, previousOiAdd,
  ), [currentOdSph, currentOdCyl, currentOdAxis, currentOdAdd, currentOiSph, currentOiCyl, currentOiAxis, currentOiAdd,
      previousOdSph, previousOdCyl, previousOdAxis, previousOdAdd, previousOiSph, previousOiCyl, previousOiAxis, previousOiAdd]);

  const hasData = currentOdSph !== null || currentOiSph !== null;
  const hasPrevious = previousOdSph !== null || previousOiSph !== null;

  if (!hasData || !hasPrevious) return null;

  const config = {
    stable: {
      icon: CheckCircle2,
      label: 'Graduación estable',
      emoji: '🟢',
      badgeClass: 'bg-success/10 text-success border-success/30',
      cardClass: 'border-success/30 bg-success/5',
    },
    moderate: {
      icon: AlertTriangle,
      label: 'Cambio moderado',
      emoji: '🟠',
      badgeClass: 'bg-warning/10 text-warning border-warning/30',
      cardClass: 'border-warning/30 bg-warning/5',
    },
    significant: {
      icon: AlertTriangle,
      label: 'Cambio significativo',
      emoji: '🔴',
      badgeClass: 'bg-destructive/10 text-destructive border-destructive/30',
      cardClass: 'border-destructive/30 bg-destructive/5',
    },
  }[analysis.level];

  const Icon = config.icon;

  if (compact) {
    return (
      <Badge variant="outline" className={cn('text-[10px] gap-1', config.badgeClass)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  }

  const renderDiff = (label: string, current: number | null, previous: number | null, isAxis = false) => {
    if (current === null && previous === null) return null;
    const diff = isAxis ? getAxisDiff(current, previous) : (current !== null && previous !== null ? Math.abs(current - previous) : 0);
    const threshold = isAxis ? 15 : 0.50;
    const level: ChangeLevel = diff >= (isAxis ? 15 : 1.00) ? 'significant' : diff >= threshold ? 'moderate' : 'stable';
    const diffVal = current !== null && previous !== null ? current - previous : 0;

    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-muted-foreground">{isAxis ? (previous ?? '—') : formatD(previous)}</span>
          <span className="text-muted-foreground">→</span>
          <span className={cn(
            level === 'significant' ? 'text-destructive font-bold' :
            level === 'moderate' ? 'text-warning font-semibold' :
            'text-foreground'
          )}>
            {isAxis ? (current ?? '—') : formatD(current)}
            {isAxis && current !== null ? '°' : ''}
          </span>
          {diff > 0 && (
            <span className={cn(
              'text-[10px]',
              level === 'significant' ? 'text-destructive' : level === 'moderate' ? 'text-warning' : 'text-muted-foreground'
            )}>
              ({isAxis ? `${diff}°` : `${diffVal > 0 ? '+' : ''}${diffVal.toFixed(2)}`})
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', config.cardClass)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <div>
            <h4 className="text-sm font-bold">{config.emoji} {config.label}</h4>
            <div className="flex items-center gap-2">
              {previousExamDate && (
                <p className="text-[10px] text-muted-foreground">
                  vs. examen {new Date(previousExamDate).toLocaleDateString('es-MX')}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                ({analysis.exceededCount} criterio{analysis.exceededCount !== 1 ? 's' : ''} superado{analysis.exceededCount !== 1 ? 's' : ''})
              </p>
            </div>
          </div>
        </div>
        {analysis.maxDiff > 0 && (
          <span className="text-lg font-bold font-mono">
            Δ {analysis.maxDiff.toFixed(2)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-primary">OD</span>
          {renderDiff('SPH', currentOdSph, previousOdSph)}
          {renderDiff('CYL', currentOdCyl, previousOdCyl)}
          {renderDiff('EJE', currentOdAxis, previousOdAxis, true)}
          {(currentOdAdd !== null || previousOdAdd !== null) && renderDiff('ADD', currentOdAdd, previousOdAdd)}
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-success">OI</span>
          {renderDiff('SPH', currentOiSph, previousOiSph)}
          {renderDiff('CYL', currentOiCyl, previousOiCyl)}
          {renderDiff('EJE', currentOiAxis, previousOiAxis, true)}
          {(currentOiAdd !== null || previousOiAdd !== null) && renderDiff('ADD', currentOiAdd, previousOiAdd)}
        </div>
      </div>
    </div>
  );
}
