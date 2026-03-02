import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTodayDeliveriesStats } from '@/hooks/useTodayDeliveriesStats';

export function TodayDeliveriesCard() {
  const navigate = useNavigate();
  const { stats, isLoading, canSeeDeliveries } = useTodayDeliveriesStats();

  if (!canSeeDeliveries) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasHighRisk = stats.red > 0;

  return (
    <Card className={hasHighRisk ? 'border-destructive/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${hasHighRisk ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              <Package className={`h-5 w-5 ${hasHighRisk ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Entregas hoy:</span>
                <span className="text-xl font-bold">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {stats.red > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {stats.red} riesgo
                  </Badge>
                )}
                {stats.yellow > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                    {stats.yellow} atención
                  </Badge>
                )}
                {stats.green > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 gap-1 bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    <CheckCircle className="h-2.5 w-2.5" />
                    {stats.green} listas
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1"
            onClick={() => navigate('/agenda?tab=deliveries')}
          >
            Ir a entregas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
