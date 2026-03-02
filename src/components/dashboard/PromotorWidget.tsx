import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, Trophy, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT_PROMOTOR_ID = '00000000-0000-0000-0000-000000000001';

export function PromotorWidget() {
  const currentPeriod = format(new Date(), 'yyyy-MM');

  // Fetch top promotores this month
  const { data: topPromotores = [] } = useQuery({
    queryKey: ['top-promotores', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotor_comisiones')
        .select(`
          promotor_id,
          monto_venta,
          monto_comision,
          promotores(nombre_completo)
        `)
        .eq('periodo', currentPeriod)
        .neq('promotor_id', DEFAULT_PROMOTOR_ID);

      if (error) throw error;

      // Aggregate by promotor
      const aggregated = data.reduce((acc: Record<string, { nombre: string; ventas: number; comision: number; count: number }>, item) => {
        const id = item.promotor_id;
        if (!acc[id]) {
          acc[id] = {
            nombre: (item.promotores as any)?.nombre_completo || 'Desconocido',
            ventas: 0,
            comision: 0,
            count: 0,
          };
        }
        acc[id].ventas += Number(item.monto_venta) || 0;
        acc[id].comision += Number(item.monto_comision) || 0;
        acc[id].count += 1;
        return acc;
      }, {});

      return Object.entries(aggregated)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch pending commissions summary
  const { data: pendingCommissions } = useQuery({
    queryKey: ['pending-commissions-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotor_comisiones')
        .select('monto_comision')
        .eq('status', 'PENDIENTE');

      if (error) throw error;
      
      const total = data.reduce((sum, item) => sum + (Number(item.monto_comision) || 0), 0);
      return { total, count: data.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch direct vs referral sales comparison
  const { data: salesComparison } = useQuery({
    queryKey: ['sales-comparison', currentPeriod],
    queryFn: async () => {
      const startOfMonth = `${currentPeriod}-01`;
      const { data, error } = await supabase
        .from('sales')
        .select('promotor_id, total')
        .gte('created_at', `${startOfMonth}T00:00:00`)
        .in('status', ['completed', 'partial']);

      if (error) throw error;

      let directSales = 0;
      let referralSales = 0;

      data.forEach(sale => {
        if (sale.promotor_id === DEFAULT_PROMOTOR_ID) {
          directSales += Number(sale.total) || 0;
        } else {
          referralSales += Number(sale.total) || 0;
        }
      });

      return { directSales, referralSales };
    },
    staleTime: 5 * 60 * 1000,
  });

  const totalSales = (salesComparison?.directSales || 0) + (salesComparison?.referralSales || 0);
  const referralPercentage = totalSales > 0 
    ? ((salesComparison?.referralSales || 0) / totalSales * 100).toFixed(1)
    : '0';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Promotores del Mes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pending Commissions Alert */}
        {pendingCommissions && pendingCommissions.count > 0 && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-warning" />
            <div className="flex-1">
              <p className="text-sm font-medium">Comisiones Pendientes</p>
              <p className="text-xs text-muted-foreground">
                {pendingCommissions.count} comisiones por pagar
              </p>
            </div>
            <span className="text-lg font-bold text-warning">
              ${pendingCommissions.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Sales Comparison */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Ventas Directas</p>
            <p className="text-lg font-bold">
              ${(salesComparison?.directSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-primary/10 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Por Promotores</p>
            <p className="text-lg font-bold text-primary">
              ${(salesComparison?.referralSales || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-primary">{referralPercentage}% del total</p>
          </div>
        </div>

        {/* Top Promotores Ranking */}
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Ranking del Mes
          </h4>
          {topPromotores.length > 0 ? (
            <ScrollArea className="h-[180px]">
              <div className="space-y-2">
                {topPromotores.map((promotor, index) => (
                  <div
                    key={promotor.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{promotor.nombre}</p>
                      <p className="text-xs text-muted-foreground">{promotor.count} ventas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        ${promotor.ventas.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-success">
                        +${promotor.comision.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin datos de promotores este mes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
