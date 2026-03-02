import { useState, useEffect } from 'react';
import { useTouchScroll } from '@/hooks/useTouchScroll';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star, Trophy, Loader2 } from 'lucide-react';

const TIER_CONFIG = [
  { name: 'Bronce', min: 0, max: 4999, icon: '🥉', color: 'from-amber-700 to-amber-600' },
  { name: 'Plata', min: 5000, max: 14999, icon: '🥈', color: 'from-gray-400 to-gray-500' },
  { name: 'Oro', min: 15000, max: 29999, icon: '🥇', color: 'from-yellow-500 to-yellow-600' },
  { name: 'VIP', min: 30000, max: Infinity, icon: '💎', color: 'from-purple-600 to-purple-700' },
];

export default function PortalPoints() {
  const { session, loading, fetchPortalData } = usePatientPortal();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const touchRef = useTouchScroll<HTMLDivElement>();

  useEffect(() => {
    if (session) {
      fetchPortalData('home').then(setData).catch(console.error).finally(() => setDataLoading(false));
    }
  }, [session, fetchPortalData]);

  if (loading) return null;
  if (!session) return <Navigate to="/portal" replace />;

  const loyalty = data?.loyalty;
  const currentPoints = loyalty?.current_points || 0;
  const lifetimePoints = loyalty?.lifetime_points || 0;
  const tierName = loyalty?.loyalty_tiers?.name || 'Bronce';
  const currentTier = TIER_CONFIG.find(t => t.name === tierName) || TIER_CONFIG[0];
  const nextTier = TIER_CONFIG.find(t => t.min > (currentTier?.max || 0));

  return (
    <div ref={touchRef} className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/home')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold">Mis Puntos y Nivel</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {dataLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Current Level Card */}
            <Card className={`bg-gradient-to-br ${currentTier.color} text-white`}>
              <CardContent className="p-6 text-center">
                <p className="text-4xl mb-2">{currentTier.icon}</p>
                <p className="text-xl font-bold">Nivel {currentTier.name}</p>
                <p className="text-sm opacity-80">Programa Visión Preferente</p>
              </CardContent>
            </Card>

            {/* Points */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-6 w-6 mx-auto text-yellow-500 mb-1" />
                  <p className="text-2xl font-bold">{currentPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Puntos Disponibles</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="h-6 w-6 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{lifetimePoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Puntos Históricos</p>
                </CardContent>
              </Card>
            </div>

            {/* Next Level */}
            {nextTier && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Siguiente nivel: {nextTier.icon} {nextTier.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${currentTier.max?.toLocaleString() || 0}</span>
                      <span>${nextTier.min.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all" 
                        style={{ width: `${Math.min(100, (lifetimePoints / nextTier.min) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Te faltan ${(nextTier.min - lifetimePoints).toLocaleString()} para el siguiente nivel
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Tiers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Niveles del Programa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {TIER_CONFIG.map(tier => (
                  <div key={tier.name} className={`flex items-center justify-between p-2 rounded-lg ${tier.name === currentTier.name ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-2">
                      <span>{tier.icon}</span>
                      <span className="text-sm font-medium">{tier.name}</span>
                      {tier.name === currentTier.name && <Badge className="text-xs">Tu nivel</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ${tier.min.toLocaleString()}{tier.max < Infinity ? ` – $${tier.max.toLocaleString()}` : '+'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
