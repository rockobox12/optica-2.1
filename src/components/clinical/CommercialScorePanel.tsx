import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Crown, Gem, Star, TrendingUp, Info } from 'lucide-react';
import {
  computeCommercialScore,
  type CommercialScore,
  type CommercialScoringInput,
  type CommercialTier,
} from '@/lib/clinical-commercial-scoring';

interface CommercialScorePanelProps {
  patientId: string;
  patientAge: number | null;
  clinicalRiskScore: number;
  occupation: string | null;
  compact?: boolean;
}

const tierConfig: Record<CommercialTier, { icon: typeof Star; color: string; bg: string }> = {
  basico: { icon: Star, color: 'text-muted-foreground', bg: 'bg-muted' },
  intermedio: { icon: Gem, color: 'text-primary', bg: 'bg-primary/10' },
  premium: { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  premium_alto: { icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

export function CommercialScorePanel({ patientId, patientAge, clinicalRiskScore, occupation, compact }: CommercialScorePanelProps) {
  const [scoringInput, setScoringInput] = useState<CommercialScoringInput | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [salesRes, itemsRes] = await Promise.all([
          supabase.from('sales').select('id, total, created_at, status').eq('patient_id', patientId).order('created_at', { ascending: false }).limit(50),
          supabase.from('sale_items').select('unit_price, sale_id').in('sale_id', []),
        ]);

        const sales = salesRes.data || [];
        const totalPurchases = sales.length;
        const totalSpent = sales.reduce((s, sale) => s + (sale.total || 0), 0);
        const averageTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

        let lastPurchaseDaysAgo: number | null = null;
        if (sales.length > 0) {
          const lastDate = new Date(sales[0].created_at);
          lastPurchaseDaysAgo = Math.floor((Date.now() - lastDate.getTime()) / (86400000));
        }

        // Check if any sale had premium items (total > 5000)
        const hasPremiumLens = sales.some(s => (s.total || 0) > 5000);

        setScoringInput({
          totalPurchases,
          totalSpent,
          averageTicket,
          lastPurchaseDaysAgo,
          hasPremiumLens,
          clinicalRiskScore,
          patientAge,
          hasOccupation: !!occupation,
          campaignResponses: 0, // TODO: integrate with campaign module
        });
      } catch (e) {
        console.error('CommercialScorePanel error:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [patientId, patientAge, clinicalRiskScore, occupation]);

  const result = useMemo<CommercialScore | null>(() => {
    if (!scoringInput) return null;
    return computeCommercialScore(scoringInput);
  }, [scoringInput]);

  if (loading || !result) return null;

  const config = tierConfig[result.tier];
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn('gap-1 text-[10px] cursor-help', config.color)}>
              <Icon className="h-3 w-3" />
              {result.tierLabel}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs max-w-[200px]">
            <p className="font-semibold mb-1">Score Comercial: {result.score}/100</p>
            {result.breakdown.filter(b => b.active).map((b, i) => (
              <p key={i} className="text-muted-foreground">+{b.points} {b.label}</p>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Perfil Comercial</span>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full', config.bg)}>
          <Icon className={cn('h-3.5 w-3.5', config.color)} />
          <span className={cn('text-xs font-bold', config.color)}>{result.tierLabel}</span>
        </div>
      </div>

      <div className="p-4">
        {/* Score bar */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', 
                result.score >= 81 ? 'bg-emerald-500' :
                result.score >= 61 ? 'bg-amber-500' :
                result.score >= 31 ? 'bg-primary' : 'bg-muted-foreground'
              )}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">{result.score}</span>
        </div>

        {/* Breakdown */}
        <div className="space-y-1">
          {result.breakdown.map((item, i) => (
            <div key={i} className={cn('flex items-center justify-between text-[11px]', !item.active && 'opacity-40')}>
              <span className="text-muted-foreground">{item.label}</span>
              <span className={cn('font-medium', item.active ? 'text-foreground' : 'text-muted-foreground')}>
                +{item.points}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-1 mt-3 pt-2 border-t border-border">
          <Info className="h-2.5 w-2.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[9px] text-muted-foreground">Solo visible para Admin y Doctor. No visible al paciente.</p>
        </div>
      </div>
    </div>
  );
}
