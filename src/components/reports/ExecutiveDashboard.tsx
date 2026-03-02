import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, TrendingUp, Users, ShoppingCart, 
  Package, CreditCard, RefreshCw, LayoutDashboard,
  BarChart3, AlertTriangle, Zap
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ExecutiveKPICard,
  ExecutiveAlerts,
  SalesTrendChart,
  BranchComparisonChart,
  ProductMixChart,
  CustomerAnalysisChart,
  GoalGaugeChart,
  ExecutiveQuickActions,
} from './executive';

export function ExecutiveDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch main KPIs
  const { data: kpis, isLoading: loadingKPIs, refetch: refetchKPIs } = useQuery({
    queryKey: ['executive-kpis'],
    queryFn: async () => {
      const now = new Date();
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

      // Current month sales
      const { data: currentSales } = await supabase
        .from('sales')
        .select('id, total, subtotal, patient_id')
        .gte('created_at', currentMonthStart.toISOString())
        .lte('created_at', currentMonthEnd.toISOString());

      // Last month sales for comparison
      const { data: lastSales } = await supabase
        .from('sales')
        .select('id, total')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      const currentTotal = currentSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const lastTotal = lastSales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
      const salesChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

      // Gross profit (estimated at 35% margin)
      const grossProfit = currentTotal * 0.35;
      const lastGrossProfit = lastTotal * 0.35;
      const profitChange = lastGrossProfit > 0 ? ((grossProfit - lastGrossProfit) / lastGrossProfit) * 100 : 0;

      // Unique customers
      const uniqueCustomers = new Set(currentSales?.map(s => s.patient_id).filter(Boolean)).size;
      
      // Average ticket
      const avgTicket = currentSales?.length ? currentTotal / currentSales.length : 0;

      // Inventory value
      const { data: inventory } = await supabase
        .from('inventory')
        .select(`
          quantity,
          products!inner(cost_price)
        `);
      
      const inventoryValue = inventory?.reduce((sum: number, item: any) => {
        return sum + (item.quantity * (item.products?.cost_price || 0));
      }, 0) || 0;

      // Accounts receivable
      const { data: creditSales } = await supabase
        .from('sales')
        .select('balance')
        .eq('is_credit', true)
        .gt('balance', 0);
      
      const accountsReceivable = creditSales?.reduce((sum, s) => sum + (s.balance || 0), 0) || 0;

      return {
        monthlySales: currentTotal,
        salesChange,
        grossProfit,
        profitChange,
        customersServed: uniqueCustomers,
        avgTicket,
        inventoryValue,
        accountsReceivable,
        salesCount: currentSales?.length || 0,
      };
    },
  });

  const getKPIStatus = (change: number | undefined): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (change === undefined) return 'neutral';
    if (change >= 10) return 'success';
    if (change >= 0) return 'neutral';
    if (change >= -10) return 'warning';
    return 'danger';
  };

  const getTrend = (change: number | undefined): 'up' | 'down' | 'neutral' => {
    if (change === undefined || change === 0) return 'neutral';
    return change > 0 ? 'up' : 'down';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">
            Vista general del negocio • {format(new Date(), 'MMMM yyyy', { locale: es })}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetchKPIs()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Análisis</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Acciones</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Main KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ExecutiveKPICard
              title="Ventas del Mes"
              value={`$${(kpis?.monthlySales || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              change={kpis?.salesChange}
              trend={getTrend(kpis?.salesChange)}
              status={getKPIStatus(kpis?.salesChange)}
              icon={DollarSign}
              loading={loadingKPIs}
            />
            <ExecutiveKPICard
              title="Utilidad Bruta"
              value={`$${(kpis?.grossProfit || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              change={kpis?.profitChange}
              trend={getTrend(kpis?.profitChange)}
              status={getKPIStatus(kpis?.profitChange)}
              icon={TrendingUp}
              subtitle="Margen estimado: 35%"
              loading={loadingKPIs}
            />
            <ExecutiveKPICard
              title="Clientes Atendidos"
              value={(kpis?.customersServed || 0).toString()}
              icon={Users}
              subtitle={`${kpis?.salesCount || 0} transacciones`}
              status="neutral"
              loading={loadingKPIs}
            />
            <ExecutiveKPICard
              title="Ticket Promedio"
              value={`$${(kpis?.avgTicket || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              icon={ShoppingCart}
              status="neutral"
              loading={loadingKPIs}
            />
            <ExecutiveKPICard
              title="Inventario Valorizado"
              value={`$${(kpis?.inventoryValue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              icon={Package}
              status="neutral"
              loading={loadingKPIs}
            />
            <ExecutiveKPICard
              title="Cuentas por Cobrar"
              value={`$${(kpis?.accountsReceivable || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
              icon={CreditCard}
              status={kpis?.accountsReceivable && kpis.accountsReceivable > 50000 ? 'warning' : 'neutral'}
              loading={loadingKPIs}
            />
          </div>

          {/* Goal Gauge and Quick Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SalesTrendChart />
            </div>
            <GoalGaugeChart 
              currentValue={kpis?.monthlySales || 0} 
              goalValue={100000} 
            />
          </div>

          {/* Branch Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BranchComparisonChart />
            <ProductMixChart />
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SalesTrendChart />
            <CustomerAnalysisChart />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BranchComparisonChart />
            <ProductMixChart />
          </div>
          <GoalGaugeChart 
            currentValue={kpis?.monthlySales || 0} 
            goalValue={100000} 
          />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="mt-6">
          <ExecutiveAlerts />
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ExecutiveQuickActions />
            <div className="lg:col-span-2">
              <ExecutiveAlerts />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
