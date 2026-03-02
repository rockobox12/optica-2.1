import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, Trophy, DollarSign, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT_PROMOTOR_ID = '00000000-0000-0000-0000-000000000001';

export function ComisionesWidget() {
  const currentPeriod = format(new Date(), 'yyyy-MM');

  // Fetch pending commissions
  const { data: pendingData } = useQuery({
    queryKey: ['comisiones-summary', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotor_comisiones')
        .select('monto_comision, status, promotor_id')
        .eq('periodo', currentPeriod);

      if (error) throw error;

      const pending = data.filter(c => c.status === 'PENDIENTE');
      const paid = data.filter(c => c.status === 'PAGADA');

      return {
        pendingCount: pending.length,
        pendingTotal: pending.reduce((sum, c) => sum + (Number(c.monto_comision) || 0), 0),
        paidCount: paid.length,
        paidTotal: paid.reduce((sum, c) => sum + (Number(c.monto_comision) || 0), 0),
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Fetch top promotores
  const { data: topPromotores = [] } = useQuery({
    queryKey: ['top-promotores-comisiones', currentPeriod],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotor_comisiones')
        .select(`
          promotor_id,
          monto_comision,
          promotores(nombre_completo)
        `)
        .eq('periodo', currentPeriod);

      if (error) throw error;

      // Aggregate by promotor
      const aggregated = data.reduce((acc: Record<string, { nombre: string; comision: number }>, item) => {
        const id = item.promotor_id;
        if (!acc[id]) {
          acc[id] = {
            nombre: (item.promotores as any)?.nombre_completo || 'Desconocido',
            comision: 0,
          };
        }
        acc[id].comision += Number(item.monto_comision) || 0;
        return acc;
      }, {});

      return Object.entries(aggregated)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.comision - a.comision)
        .slice(0, 5);
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Pending Commissions */}
      <Card className="border-orange-200 bg-orange-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-orange-100">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes de Pago</p>
              <p className="text-2xl font-bold text-orange-600">
                ${(pendingData?.pendingTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingData?.pendingCount || 0} comisiones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paid This Month */}
      <Card className="border-success/20 bg-success/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-success/10">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagadas este Mes</p>
              <p className="text-2xl font-bold text-success">
                ${(pendingData?.paidTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingData?.paidCount || 0} comisiones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Promotores */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm flex items-center gap-1">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Top 5 Promotores
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {topPromotores.length > 0 ? (
            <div className="space-y-2">
              {topPromotores.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-yellow-500 text-white' :
                      i === 1 ? 'bg-gray-400 text-white' :
                      i === 2 ? 'bg-amber-600 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="truncate max-w-[120px]">{p.nombre}</span>
                  </div>
                  <span className="font-medium text-primary">
                    ${p.comision.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Sin datos este mes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
