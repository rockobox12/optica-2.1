import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutiveKPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'success' | 'warning' | 'danger' | 'neutral';
  onClick?: () => void;
  loading?: boolean;
}

export function ExecutiveKPICard({
  title,
  value,
  change,
  changeLabel = 'vs mes anterior',
  subtitle,
  icon: Icon,
  trend,
  status = 'neutral',
  onClick,
  loading = false,
}: ExecutiveKPICardProps) {
  const statusColors = {
    success: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
    warning: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
    danger: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
    neutral: 'border-l-primary bg-card',
  };

  const trendIcon = {
    up: <TrendingUp className="h-4 w-4 text-green-600" />,
    down: <TrendingDown className="h-4 w-4 text-red-600" />,
    neutral: <Minus className="h-4 w-4 text-muted-foreground" />,
  };

  const changeColor = change !== undefined
    ? change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
    : 'text-muted-foreground';

  if (loading) {
    return (
      <Card className={cn('border-l-4 transition-all', statusColors[status])}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'border-l-4 transition-all hover:shadow-md',
        statusColors[status],
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            
            {change !== undefined && (
              <div className="flex items-center gap-1.5">
                {trend && trendIcon[trend]}
                <span className={cn('text-sm font-semibold', changeColor)}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              </div>
            )}
            
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className={cn(
              'p-3 rounded-xl',
              status === 'success' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
              status === 'warning' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
              status === 'danger' && 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
              status === 'neutral' && 'bg-primary/10 text-primary',
            )}>
              <Icon className="h-6 w-6" />
            </div>
            {onClick && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
