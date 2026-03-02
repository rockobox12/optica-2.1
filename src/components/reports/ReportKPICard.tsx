import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportKPICardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  currentValue?: number;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

export function ReportKPICard({
  title,
  value,
  previousValue,
  currentValue,
  icon,
  subtitle,
  trend,
  trendValue,
  variant = 'default',
  loading = false,
}: ReportKPICardProps) {
  // Calculate trend if previous and current values provided
  let calculatedTrend = trend;
  let calculatedTrendValue = trendValue;
  
  if (previousValue !== undefined && currentValue !== undefined && !trend) {
    const change = previousValue !== 0 
      ? ((currentValue - previousValue) / previousValue) * 100 
      : currentValue > 0 ? 100 : 0;
    calculatedTrendValue = Math.abs(change);
    calculatedTrend = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';
  }

  const variantStyles = {
    default: 'border-border',
    success: 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-900/10',
    warning: 'border-l-4 border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-900/10',
    danger: 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
    info: 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  return (
    <Card className={cn('transition-all hover:shadow-md', variantStyles[variant])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1 truncate">
                {typeof value === 'number' 
                  ? value.toLocaleString('es-MX', { maximumFractionDigits: 0 })
                  : value
                }
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-1.5">
              {calculatedTrend && calculatedTrendValue !== undefined && (
                <div className={cn('flex items-center gap-0.5 text-xs', trendColors[calculatedTrend])}>
                  {calculatedTrend === 'up' && <TrendingUp className="h-3 w-3" />}
                  {calculatedTrend === 'down' && <TrendingDown className="h-3 w-3" />}
                  {calculatedTrend === 'neutral' && <Minus className="h-3 w-3" />}
                  <span className="font-medium">
                    {calculatedTrend !== 'neutral' && (calculatedTrend === 'up' ? '+' : '-')}
                    {calculatedTrendValue.toFixed(1)}%
                  </span>
                </div>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
          
          {icon && (
            <div className="shrink-0 p-2 rounded-lg bg-muted/50">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
