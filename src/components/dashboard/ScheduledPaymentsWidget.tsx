import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarClock, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2,
  Banknote,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast, startOfDay } from 'date-fns';
import { handleApiError } from '@/lib/api-error-handler';

export function ScheduledPaymentsWidget() {
  const navigate = useNavigate();
  
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-scheduled-payments'],
    queryFn: async () => {
      const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
      
      // Fetch all scheduled payments
      const { data, error } = await supabase
        .from('sales')
        .select('id, next_payment_date, balance')
        .eq('is_credit', true)
        .gt('balance', 0)
        .not('next_payment_date', 'is', null);

      if (error) {
        handleApiError(error, 'cargar cobros programados', { showToast: false });
        throw error;
      }

      let todayCount = 0;
      let overdueCount = 0;
      let todayAmount = 0;
      let overdueAmount = 0;

      data?.forEach((sale) => {
        const paymentDate = new Date(sale.next_payment_date);
        const balance = Number(sale.balance) || 0;
        
        if (isToday(paymentDate)) {
          todayCount++;
          todayAmount += balance;
        } else if (isPast(paymentDate)) {
          overdueCount++;
          overdueAmount += balance;
        }
      });

      return {
        todayCount,
        overdueCount,
        todayAmount,
        overdueAmount,
      };
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No se pudieron cargar los cobros programados
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasScheduled = (stats?.todayCount || 0) > 0 || (stats?.overdueCount || 0) > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          Cobros Programados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasScheduled ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No hay cobros pendientes para hoy
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Today's Payments */}
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-xs text-muted-foreground">Hoy</span>
                </div>
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats?.todayCount || 0}
                </p>
                {(stats?.todayAmount || 0) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${stats?.todayAmount?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                )}
              </div>

              {/* Overdue Payments */}
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-muted-foreground">Atrasados</span>
                </div>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {stats?.overdueCount || 0}
                </p>
                {(stats?.overdueAmount || 0) > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ${stats?.overdueAmount?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                )}
              </div>
            </div>

            {/* Alert for overdue */}
            {(stats?.overdueCount || 0) > 0 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    {stats?.overdueCount} cobro{stats?.overdueCount !== 1 ? 's' : ''} atrasado{stats?.overdueCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Action Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/cobro-rapido')}
        >
          <Banknote className="h-4 w-4 mr-2" />
          Ir a Cobro Rápido
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
