import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RISK_CONFIG, type PaymentRiskLevel } from '@/hooks/usePaymentProbability';
import { ShieldCheck } from 'lucide-react';

interface PaymentProbabilityBadgeProps {
  score: number;
  riskLevel: PaymentRiskLevel;
  compact?: boolean;
  showScore?: boolean;
}

export function PaymentProbabilityBadge({ score, riskLevel, compact = false, showScore = true }: PaymentProbabilityBadgeProps) {
  const cfg = RISK_CONFIG[riskLevel];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={`text-[10px] px-1.5 py-0 cursor-default ${cfg.badgeClass}`}>
              {cfg.icon} {showScore ? `${score}%` : cfg.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs font-medium">Probabilidad de pago: {score}%</p>
            <p className="text-xs text-muted-foreground">{cfg.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${cfg.badgeClass}`}>
      <ShieldCheck className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{score}%</span>
          <span className="text-xs">{cfg.icon} {cfg.label}</span>
        </div>
        <p className="text-[10px] opacity-75">Probabilidad de pago</p>
      </div>
    </div>
  );
}
