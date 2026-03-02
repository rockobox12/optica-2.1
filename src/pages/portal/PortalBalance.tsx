import { useState, useEffect } from 'react';
import { useTouchScroll } from '@/hooks/useTouchScroll';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Wallet, Loader2, CalendarClock } from 'lucide-react';

export default function PortalBalance() {
  const { session, loading, fetchPortalData } = usePatientPortal();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const touchRef = useTouchScroll<HTMLDivElement>();

  useEffect(() => {
    if (session) {
      fetchPortalData('balance').then(setData).catch(console.error).finally(() => setDataLoading(false));
    }
  }, [session, fetchPortalData]);

  if (loading) return null;
  if (!session) return <Navigate to="/portal" replace />;

  const totalBalance = (data?.pending_sales || []).reduce((sum: number, s: any) => sum + (s.balance || 0), 0);

  return (
    <div ref={touchRef} className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold">Saldo Pendiente</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Total balance card */}
        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-5 text-center">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-80" />
            <p className="text-sm opacity-80">Total Pendiente</p>
            <p className="text-3xl font-bold">${totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>

        {dataLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (data?.pending_sales || []).length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            <p>🎉 No tienes saldos pendientes</p>
          </CardContent></Card>
        ) : (
          data.pending_sales.map((sale: any) => (
            <Card key={sale.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono text-muted-foreground">{sale.sale_number}</span>
                  <span className="font-bold text-orange-500">${sale.balance?.toLocaleString()}</span>
                </div>
                {sale.next_payment_date && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    Próximo pago: {new Date(sale.next_payment_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    {sale.next_payment_amount && ` · $${sale.next_payment_amount.toLocaleString()}`}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
