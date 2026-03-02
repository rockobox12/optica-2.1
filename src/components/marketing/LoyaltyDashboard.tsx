import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Gift, TrendingUp, Wallet, Award, Crown, Medal, Star, Gem } from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  Bronce: '#cd7f32',
  Plata: '#c0c0c0',
  Oro: '#ffd700',
  Platino: '#e5e4e2',
};

const TIER_ICONS: Record<string, React.ElementType> = {
  Bronce: Award,
  Plata: Medal,
  Oro: Crown,
  Platino: Gem,
};

export function LoyaltyDashboard() {
  // Fetch loyalty stats
  const { data: stats } = useQuery({
    queryKey: ['loyalty-stats'],
    queryFn: async () => {
      const { data: enrollments, error } = await supabase
        .from('customer_loyalty')
        .select(`
          *,
          loyalty_tiers(name, color),
          patients(first_name, last_name)
        `)
        .eq('is_active', true);

      if (error) throw error;

      const totalMembers = enrollments?.length || 0;
      const totalPoints = enrollments?.reduce((sum, e) => sum + (e.current_points || 0), 0) || 0;
      const totalWallet = enrollments?.reduce((sum, e) => sum + (e.wallet_balance || 0), 0) || 0;
      const lifetimePoints = enrollments?.reduce((sum, e) => sum + (e.lifetime_points || 0), 0) || 0;

      // Group by tier
      const tierCounts: Record<string, number> = {};
      enrollments?.forEach(e => {
        const tierName = (e.loyalty_tiers as any)?.name || 'Sin nivel';
        tierCounts[tierName] = (tierCounts[tierName] || 0) + 1;
      });

      return {
        totalMembers,
        totalPoints,
        totalWallet,
        lifetimePoints,
        tierCounts,
        enrollments,
      };
    },
  });

  // Fetch recent transactions
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['loyalty-recent-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select(`
          *,
          customer_loyalty(
            patients(first_name, last_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch campaign stats
  const { data: campaignStats } = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      const { data: campaigns } = await supabase
        .from('marketing_campaigns')
        .select('status, sent_count, opened_count, clicked_count');

      const active = campaigns?.filter(c => c.status === 'active').length || 0;
      const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
      const totalOpened = campaigns?.reduce((sum, c) => sum + (c.opened_count || 0), 0) || 0;

      return { active, totalSent, totalOpened };
    },
  });

  const tierChartData = Object.entries(stats?.tierCounts || {}).map(([name, value]) => ({
    name,
    value,
    color: TIER_COLORS[name] || '#6b7280',
  }));

  // Top members
  const topMembers = [...(stats?.enrollments || [])]
    .sort((a, b) => (b.lifetime_points || 0) - (a.lifetime_points || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Miembros</p>
                <p className="text-2xl font-bold">{stats?.totalMembers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Puntos Activos</p>
                <p className="text-2xl font-bold">{(stats?.totalPoints || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Wallet className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Wallets</p>
                <p className="text-2xl font-bold">${(stats?.totalWallet || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Puntos Históricos</p>
                <p className="text-2xl font-bold">{(stats?.lifetimePoints || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución por Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tierChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {tierChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Top Miembros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMembers.map((member, index) => {
                const tierName = (member.loyalty_tiers as any)?.name || 'Bronce';
                const TierIcon = TIER_ICONS[tierName] || Star;
                const tierColor = TIER_COLORS[tierName] || '#6b7280';
                
                return (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <TierIcon className="h-5 w-5" style={{ color: tierColor }} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {(member.patients as any)?.first_name} {(member.patients as any)?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.lifetime_points?.toLocaleString()} pts totales
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{member.current_points?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">disponibles</p>
                    </div>
                  </div>
                );
              })}
              {topMembers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No hay miembros inscritos aún
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    tx.transaction_type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {tx.transaction_type === 'earn' ? <TrendingUp className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {(tx.customer_loyalty as any)?.patients?.first_name} {(tx.customer_loyalty as any)?.patients?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.points > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No hay transacciones recientes
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
