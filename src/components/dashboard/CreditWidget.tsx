import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, AlertTriangle, DollarSign, ArrowRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { handleApiError } from '@/lib/api-error-handler';

export function CreditWidget() {
  const navigate = useNavigate();
  const { data: creditStats, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard-credit-stats'],
    queryFn: async () => {
      const now = new Date();

      // Fetch all credit sales with balance
      const { data: creditSales, error } = await supabase
        .from('sales')
        .select('id, balance, credit_due_date')
        .eq('is_credit', true)
        .gt('balance', 0);

      if (error) {
        handleApiError(error, 'cargar estadísticas de crédito', { showToast: false });
        throw error;
      }

      let activeCredits = 0;
      let overdueCredits = 0;
      let totalReceivable = 0;
      let overdueAmount = 0;

      creditSales?.forEach((sale) => {
        const balance = Number(sale.balance) || 0;
        totalReceivable += balance;

        if (sale.credit_due_date) {
          const dueDate = new Date(sale.credit_due_date);
          if (dueDate < now) {
            overdueCredits++;
            overdueAmount += balance;
          } else {
            activeCredits++;
          }
        } else {
          activeCredits++;
        }
      });

      return {
        activeCredits,
        overdueCredits,
        totalReceivable,
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

  // Graceful degradation: show error state but don't break the app
  if (isError) {
    return (
      <Card className="border-destructive/20">
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              No se pudieron cargar las estadísticas de crédito
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Crédito y Cobranza
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Active Credits */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-muted-foreground">Créditos Activos</span>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {creditStats?.activeCredits || 0}
            </p>
          </div>

          {/* Overdue Credits */}
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-muted-foreground">Vencidos</span>
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {creditStats?.overdueCredits || 0}
            </p>
          </div>
        </div>

        {/* Total Receivable */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border border-orange-200 dark:border-orange-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total por Cobrar</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                ${(creditStats?.totalReceivable || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-10 w-10 text-orange-300 dark:text-orange-700" />
          </div>
          {(creditStats?.overdueAmount || 0) > 0 && (
            <Badge variant="destructive" className="mt-2">
              ${(creditStats?.overdueAmount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} vencidos
            </Badge>
          )}
        </div>

        {/* Action Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => navigate('/credito-cobranza')}
        >
          Ver Módulo Completo
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
