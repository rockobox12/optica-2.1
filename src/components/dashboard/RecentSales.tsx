import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useBranch } from '@/hooks/useBranchContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface RecentSale {
  id: string;
  customer_name: string | null;
  total: number;
  created_at: string;
  sale_number: string | null;
}

export function RecentSales() {
  const { activeBranchId } = useBranch();
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        let query = supabase
          .from('sales')
          .select('id, customer_name, total, created_at, sale_number')
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay)
          .order('created_at', { ascending: false })
          .limit(5);

        if (activeBranchId && activeBranchId !== 'all') {
          query = query.eq('branch_id', activeBranchId);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          console.error('Error fetching recent sales:', queryError);
          setError('No se pudieron cargar las ventas');
          return;
        }

        setSales(data || []);
      } catch (err) {
        console.error('Error fetching recent sales:', err);
        setError('Error al conectar con el servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [activeBranchId]);

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() || '')
      .join('');
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: false, locale: es });
    } catch {
      return '';
    }
  };

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <h3 className="font-display font-semibold text-lg">Ventas Recientes</h3>
        <p className="text-sm text-muted-foreground">Últimas transacciones del día</p>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <div className="space-y-2 text-right">
                <Skeleton className="h-4 w-20 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="p-6 text-center text-sm text-muted-foreground">{error}</div>
        ) : sales.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Sin ventas registradas hoy
          </div>
        ) : (
          sales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(sale.customer_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{sale.customer_name || 'Cliente sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">
                    {sale.sale_number || `Venta #${sale.id.slice(0, 8)}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{formatCurrency(sale.total)}</p>
                <p className="text-xs text-muted-foreground">Hace {getTimeAgo(sale.created_at)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
