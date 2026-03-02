import { useState, useEffect } from 'react';
import { useTouchScroll } from '@/hooks/useTouchScroll';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingBag, Loader2 } from 'lucide-react';

export default function PortalSales() {
  const { session, loading, fetchPortalData } = usePatientPortal();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const touchRef = useTouchScroll<HTMLDivElement>();

  useEffect(() => {
    if (session) {
      fetchPortalData('sales').then(setData).catch(console.error).finally(() => setDataLoading(false));
    }
  }, [session, fetchPortalData]);

  if (loading) return null;
  if (!session) return <Navigate to="/portal" replace />;

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { completed: 'Pagada', pending: 'Pendiente', partial: 'Parcial', cancelled: 'Cancelada' };
    return map[s] || s;
  };

  const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (s === 'completed') return 'default';
    if (s === 'partial') return 'secondary';
    if (s === 'cancelled') return 'destructive';
    return 'outline';
  };

  return (
    <div ref={touchRef} className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold">Historial de Compras</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {dataLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (data?.sales || []).length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Sin compras registradas</p>
          </CardContent></Card>
        ) : (
          data.sales.map((sale: any) => (
            <Card key={sale.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-muted-foreground">{sale.sale_number}</span>
                  <Badge variant={statusVariant(sale.status)}>{statusLabel(sale.status)}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {new Date(sale.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-lg font-bold">${sale.total?.toLocaleString()}</span>
                </div>
                {sale.balance > 0 && (
                  <p className="text-xs text-orange-500 mt-1">Saldo: ${sale.balance.toLocaleString()}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
