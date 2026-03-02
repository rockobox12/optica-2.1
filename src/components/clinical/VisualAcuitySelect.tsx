import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const AV_VALUES = [
  '20/10',
  '20/15',
  '20/20',
  '20/25',
  '20/30',
  '20/40',
  '20/50',
  '20/60',
  '20/70',
  '20/80',
  '20/100',
  '20/200',
] as const;

type AVValue = typeof AV_VALUES[number];

/** Returns a semantic color class based on the AV value */
function getAVColor(value: string): string {
  if (!value) return '';
  const denominator = parseInt(value.split('/')[1]);
  if (isNaN(denominator)) return '';
  if (denominator <= 20) return 'text-blue-600 dark:text-blue-400 font-semibold';
  if (denominator <= 40) return 'text-foreground';
  return 'text-orange-600 dark:text-orange-400 font-semibold';
}

interface VisualAcuitySelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  tabIndex?: number;
  className?: string;
  placeholder?: string;
}

export function VisualAcuitySelect({
  label,
  value,
  onChange,
  tabIndex,
  className,
  placeholder = '20/XX',
}: VisualAcuitySelectProps) {
  const colorClass = getAVColor(value);

  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <Label className="text-xs text-muted-foreground">{label}</Label>
      )}
      <TooltipProvider delayDuration={400}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                  tabIndex={tabIndex}
                  className={cn(
                    'h-10 text-center text-base md:text-sm',
                    colorClass,
                  )}
                >
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {/* Allow clearing */}
                  <SelectItem value="none" className="text-muted-foreground italic">
                    — Sin dato —
                  </SelectItem>
                  {AV_VALUES.map((av) => (
                    <SelectItem
                      key={av}
                      value={av}
                      className={cn('text-center', getAVColor(av))}
                    >
                      {av}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Agudeza visual estandarizada</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
