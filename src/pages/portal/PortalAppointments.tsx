import { useState, useEffect } from 'react';
import { useTouchScroll } from '@/hooks/useTouchScroll';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';

export default function PortalAppointments() {
  const { session, loading, fetchPortalData } = usePatientPortal();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const touchRef = useTouchScroll<HTMLDivElement>();

  useEffect(() => {
    if (session) {
      fetchPortalData('appointments').then(setData).catch(console.error).finally(() => setDataLoading(false));
    }
  }, [session, fetchPortalData]);

  if (loading) return null;
  if (!session) return <Navigate to="/portal" replace />;

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      scheduled: 'Programada', confirmed: 'Confirmada', completed: 'Completada',
      cancelled: 'Cancelada', no_show: 'No asistió', checked_in: 'En espera',
      in_progress: 'En curso'
    };
    return map[s] || s;
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      consultation: 'Consulta', follow_up: 'Seguimiento', delivery: 'Entrega',
      adjustment: 'Ajuste', emergency: 'Urgencia'
    };
    return map[t] || t;
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = (data?.appointments || []).filter((a: any) => a.appointment_date >= today && !['cancelled', 'no_show'].includes(a.status));
  const past = (data?.appointments || []).filter((a: any) => a.appointment_date < today || ['cancelled', 'no_show', 'completed'].includes(a.status));

  return (
    <div ref={touchRef} className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold">Mis Citas</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {dataLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">Próximas</h2>
                {upcoming.map((apt: any) => (
                  <Card key={apt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{typeLabel(apt.appointment_type)}</span>
                        </div>
                        <Badge>{statusLabel(apt.status)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(apt.appointment_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {' · '}{apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}
                      </p>
                      {apt.reason && <p className="text-xs text-muted-foreground mt-1">{apt.reason}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {past.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground">Historial</h2>
                {past.map((apt: any) => (
                  <Card key={apt.id} className="opacity-70">
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm">{typeLabel(apt.appointment_type)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(apt.appointment_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{statusLabel(apt.status)}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Sin citas registradas</p>
              </CardContent></Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
