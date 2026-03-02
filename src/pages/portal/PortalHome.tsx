import { useState, useEffect } from 'react';
import { useTouchScroll } from '@/hooks/useTouchScroll';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, ShoppingBag, Calendar, Wallet, LogOut, Loader2, 
  Star, Trophy, ChevronRight, CreditCard 
} from 'lucide-react';

export default function PortalHome() {
  const { session, loading, logout, fetchPortalData } = usePatientPortal();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const touchRef = useTouchScroll<HTMLDivElement>();

  useEffect(() => {
    if (session) {
      fetchPortalData('home')
        .then(setData)
        .catch(console.error)
        .finally(() => setDataLoading(false));
    }
  }, [session, fetchPortalData]);

  if (loading) return <PortalLoader />;
  if (!session) return <Navigate to="/portal" replace />;

  const patientName = session.patient 
    ? `${session.patient.first_name} ${session.patient.last_name || ''}`.trim()
    : 'Paciente';

  const handleLogout = async () => {
    await logout();
    navigate('/portal');
  };

  return (
    <div ref={touchRef} className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-sm">Óptica Istmeña</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4 pb-20">
        {/* Welcome */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Hola, {patientName} 👋</h1>
          <p className="text-sm text-muted-foreground">Bienvenido(a) a tu portal</p>
        </div>

        {dataLoading ? (
          <PortalLoader />
        ) : (
          <>
            {/* Loyalty Card */}
            {data?.loyalty && (
              <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs opacity-80">Programa Visión Preferente</p>
                      <p className="text-2xl font-bold">{data.loyalty.current_points || 0} pts</p>
                    </div>
                    <div className="text-right">
                      <Trophy className="h-6 w-6 mb-1 ml-auto" />
                      <Badge variant="secondary" className="text-xs">
                        {data.loyalty.loyalty_tiers?.name || 'Bronce'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/portal/compras')}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                  <p className="text-xs text-muted-foreground">Mis Compras</p>
                  <p className="text-lg font-bold">{data?.recent_sales?.length || 0}</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/portal/saldo')}>
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <Wallet className="h-6 w-6 text-orange-500" />
                  <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
                  <p className="text-lg font-bold">${(data?.total_pending_balance || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium">Próximas Citas</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/portal/citas')}>
                  Ver todas <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.upcoming_appointments || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Sin citas programadas</p>
                ) : (
                  data.upcoming_appointments.slice(0, 3).map((apt: any) => (
                    <div key={apt.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{apt.appointment_type === 'consultation' ? 'Consulta' : apt.appointment_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(apt.appointment_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {apt.start_time?.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                        {apt.status === 'confirmed' ? 'Confirmada' : 'Programada'}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="space-y-2">
              {[
                { icon: Star, label: 'Mis Puntos y Nivel', path: '/portal/puntos', color: 'text-yellow-500' },
                { icon: ShoppingBag, label: 'Historial de Compras', path: '/portal/compras', color: 'text-primary' },
                { icon: CreditCard, label: 'Saldo Pendiente', path: '/portal/saldo', color: 'text-orange-500' },
                { icon: Calendar, label: 'Mis Citas', path: '/portal/citas', color: 'text-green-500' },
              ].map((item) => (
                <Card 
                  key={item.path} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(item.path)}
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function PortalLoader() {
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
