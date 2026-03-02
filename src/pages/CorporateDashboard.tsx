import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/dashboard/StatCard';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ModuleErrorFallback } from '@/components/error/ModuleErrorFallback';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  CalendarDays,
  CreditCard,
  AlertTriangle,
  Package,
  Truck,
  Building2,
  TrendingUp,
  Users,
  Award,
  ShoppingCart,
  BarChart3,
  Filter,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ── Types ──
interface BranchSalesData {
  branchName: string;
  ventaMensual: number;
  ticketPromedio: number;
  numVentas: number;
}

interface BranchProfitData {
  branchName: string;
  ventaTotal: number;
  costoTotal: number;
  utilidad: number;
  margenPct: number;
}

interface BranchDelinquency {
  branchName: string;
  pacientesMorosos: number;
  montoVencido: number;
  porcentajeRiesgo: number;
}

interface TopSeller {
  name: string;
  amount: number;
}

interface TopPromotor {
  name: string;
  patients: number;
}

interface StockAlert {
  productName: string;
  branchName: string;
  currentQty: number;
  reorderPoint: number;
  alertType: string;
}

interface CorporateMetrics {
  ventasDia: number;
  ventasMes: number;
  cuentasPorCobrar: number;
  morosidadActiva: number;
  labOrdersEnProceso: number;
  entregasHoy: number;
  branchSales: BranchSalesData[];
  branchDelinquency: BranchDelinquency[];
  branchProfit: BranchProfitData[];
  topSellers: TopSeller[];
  topPromotores: TopPromotor[];
  bestBranch: string;
  stockAlerts: StockAlert[];
  ticketPromedioGeneral: number;
  pctCredito: number;
  pctRecuperacion: number;
  pctConversion: number;
  utilidadMensual: number;
  margenPromedioGeneral: number;
  sucursalMasRentable: string;
  productoMasRentable: string;
}

// ── Helpers ──
const fmt = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

const pct = (n: number) => `${n.toFixed(1)}%`;

// ── Main Component ──
export default function CorporateDashboard() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<CorporateMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayStr = now.toISOString().split('T')[0];

      const [
        branchesRes,
        salesTodayRes,
        salesMonthRes,
        delinquentRes,
        labOrdersRes,
        deliveriesRes,
        promotoresRes,
        stockAlertsRes,
        consultasRes,
      ] = await Promise.all([
        supabase.from('branches').select('id, name').eq('is_active', true),
        supabase.from('sales').select('id, total, branch_id, seller_id, is_credit, patient_id').gte('created_at', startOfDay),
        supabase.from('sales').select('id, total, branch_id, seller_id, is_credit, patient_id').gte('created_at', startOfMonth),
        supabase.from('sales').select('id, patient_id, balance, branch_id, status').gt('balance', 0).in('status', ['pending', 'partial']),
        supabase.from('lab_orders').select('id').in('status', ['EN_PROCESO', 'ENVIADO_A_LAB', 'RECIBIDO_EN_LAB']),
        supabase.from('appointments').select('id').eq('appointment_type', 'delivery').in('status', ['scheduled', 'confirmed']).eq('appointment_date', todayStr),
        supabase.from('promotores').select('id, nombre_completo').eq('activo', true),
        supabase.from('stock_alerts').select('product_id, branch_id, alert_type, current_quantity, threshold_quantity').eq('is_resolved', false).in('alert_type', ['out_of_stock', 'low_stock']).limit(20),
        supabase.from('appointments').select('id, patient_id').eq('appointment_type', 'exam').gte('appointment_date', startOfMonth),
      ]);

      const branchList = branchesRes.data || [];
      setBranches(branchList);
      const branchMap = new Map(branchList.map(b => [b.id, b.name]));

      const salesToday = salesTodayRes.data || [];
      const salesMonth = salesMonthRes.data || [];
      const delinquent = delinquentRes.data || [];
      const labOrders = labOrdersRes.data || [];
      const deliveries = deliveriesRes.data || [];
      const consultas = consultasRes.data || [];

      // Summary
      const ventasDia = salesToday.reduce((s, r) => s + (r.total || 0), 0);
      const ventasMes = salesMonth.reduce((s, r) => s + (r.total || 0), 0);
      const cuentasPorCobrar = delinquent.reduce((s, r) => s + (r.balance || 0), 0);

      // Delinquency patients with overdue installments
      const morosidadActiva = new Set(delinquent.map(d => d.patient_id)).size;

      // Branch sales
      const branchSalesMap = new Map<string, { total: number; count: number }>();
      salesMonth.forEach(s => {
        const bid = s.branch_id || 'unknown';
        const prev = branchSalesMap.get(bid) || { total: 0, count: 0 };
        branchSalesMap.set(bid, { total: prev.total + (s.total || 0), count: prev.count + 1 });
      });

      const branchSales: BranchSalesData[] = Array.from(branchSalesMap.entries()).map(([bid, data]) => ({
        branchName: branchMap.get(bid) || 'Sin sucursal',
        ventaMensual: data.total,
        ticketPromedio: data.count > 0 ? data.total / data.count : 0,
        numVentas: data.count,
      })).sort((a, b) => b.ventaMensual - a.ventaMensual);

      // Branch delinquency
      const branchDelinqMap = new Map<string, { patients: Set<string>; monto: number }>();
      delinquent.forEach(s => {
        const bid = s.branch_id || 'unknown';
        const prev = branchDelinqMap.get(bid) || { patients: new Set<string>(), monto: 0 };
        if (s.patient_id) prev.patients.add(s.patient_id);
        prev.monto += s.balance || 0;
        branchDelinqMap.set(bid, prev);
      });

      const branchDelinquency: BranchDelinquency[] = Array.from(branchDelinqMap.entries()).map(([bid, data]) => {
        const branchSalesTotal = branchSalesMap.get(bid)?.total || 1;
        return {
          branchName: branchMap.get(bid) || 'Sin sucursal',
          pacientesMorosos: data.patients.size,
          montoVencido: data.monto,
          porcentajeRiesgo: Math.min((data.monto / branchSalesTotal) * 100, 100),
        };
      }).sort((a, b) => b.porcentajeRiesgo - a.porcentajeRiesgo);

      // Top sellers (by seller_id from sales)
      const sellerMap = new Map<string, number>();
      salesMonth.forEach(s => {
        if (s.seller_id) {
          sellerMap.set(s.seller_id, (sellerMap.get(s.seller_id) || 0) + (s.total || 0));
        }
      });
      const topSellers: TopSeller[] = Array.from(sellerMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([, amount], i) => ({ name: `Vendedor ${i + 1}`, amount }));

      // Top promotores
      const promotorSalesMap = new Map<string, Set<string>>();
      salesMonth.forEach(s => {
        if (s.patient_id) {
          // group patients by promotor later
        }
      });

      // Fetch promotor patient counts from sales table
      const { data: promotorSales } = await supabase
        .from('sales')
        .select('promotor_id, patient_id')
        .gte('created_at', startOfMonth)
        .not('promotor_id', 'is', null);

      const promMap = new Map<string, Set<string>>();
      (promotorSales || []).forEach(ps => {
        if (ps.promotor_id && ps.patient_id) {
          if (!promMap.has(ps.promotor_id)) promMap.set(ps.promotor_id, new Set());
          promMap.get(ps.promotor_id)!.add(ps.patient_id);
        }
      });

      const promotoresList = promotoresRes.data || [];
      const promotorNameMap = new Map(promotoresList.map(p => [p.id, p.nombre_completo]));

      const topPromotores: TopPromotor[] = Array.from(promMap.entries())
        .map(([pid, patients]) => ({ name: promotorNameMap.get(pid) || 'Promotor', patients: patients.size }))
        .sort((a, b) => b.patients - a.patients)
        .slice(0, 5);

      // Best branch (most growth – simplified: highest sales)
      const bestBranch = branchSales[0]?.branchName || 'N/A';

      // Stock alerts enrichment
      const productIds = [...new Set((stockAlertsRes.data || []).map(a => a.product_id))];
      let productNameMap = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await supabase.from('products').select('id, name').in('id', productIds.slice(0, 50));
        productNameMap = new Map((products || []).map(p => [p.id, p.name]));
      }

      const stockAlerts: StockAlert[] = (stockAlertsRes.data || []).map(a => ({
        productName: productNameMap.get(a.product_id) || 'Producto',
        branchName: branchMap.get(a.branch_id) || 'Sucursal',
        currentQty: a.current_quantity,
        reorderPoint: a.threshold_quantity,
        alertType: a.alert_type,
      }));

      // KPIs
      const ticketPromedioGeneral = salesMonth.length > 0 ? ventasMes / salesMonth.length : 0;
      const creditSales = salesMonth.filter(s => s.is_credit).length;
      const pctCredito = salesMonth.length > 0 ? (creditSales / salesMonth.length) * 100 : 0;

      // Recovery: amount paid on delinquent accounts this month
      const { data: paymentsMonth } = await supabase
        .from('credit_payments')
        .select('amount')
        .gte('payment_date', startOfMonth);
      const recovered = (paymentsMonth || []).reduce((s, p) => s + (p.amount || 0), 0);
      const pctRecuperacion = cuentasPorCobrar > 0 ? (recovered / (cuentasPorCobrar + recovered)) * 100 : 100;

      // Conversion: patients with consultation → sale
      const consultPatients = new Set(consultas.map(c => c.patient_id));
      const salePatients = new Set(salesMonth.map(s => s.patient_id));
      const conversions = [...consultPatients].filter(p => p && salePatients.has(p)).length;
      const pctConversion = consultPatients.size > 0 ? (conversions / consultPatients.size) * 100 : 0;

      // Profit from actual sales (sale_items snapshots)
      const { data: salesProfitData } = await supabase
        .from('sales')
        .select('branch_id, total, total_profit')
        .gte('created_at', startOfMonth);

      const profitByBranch = new Map<string, { venta: number; profit: number }>();
      (salesProfitData || []).forEach(s => {
        const bid = s.branch_id || 'unknown';
        const prev = profitByBranch.get(bid) || { venta: 0, profit: 0 };
        profitByBranch.set(bid, {
          venta: prev.venta + (s.total || 0),
          profit: prev.profit + (s.total_profit || 0),
        });
      });

      const branchProfit: BranchProfitData[] = Array.from(profitByBranch.entries()).map(([bid, d]) => ({
        branchName: branchMap.get(bid) || 'Sin sucursal',
        ventaTotal: d.venta,
        costoTotal: d.venta - d.profit,
        utilidad: d.profit,
        margenPct: d.venta > 0 ? (d.profit / d.venta) * 100 : 0,
      })).sort((a, b) => b.utilidad - a.utilidad);

      const utilidadMensual = branchProfit.reduce((s, b) => s + b.utilidad, 0);
      const totalVentasMesProfit = branchProfit.reduce((s, b) => s + b.ventaTotal, 0);
      const margenPromedioGeneral = totalVentasMesProfit > 0 ? (utilidadMensual / totalVentasMesProfit) * 100 : 0;
      const sucursalMasRentable = branchProfit[0]?.branchName || 'N/A';

      // Most profitable product
      const { data: topProfitProduct } = await supabase
        .from('sale_items')
        .select('product_name, profit_amount')
        .gt('profit_amount', 0)
        .order('profit_amount', { ascending: false })
        .limit(1);
      const productoMasRentable = topProfitProduct?.[0]?.product_name || 'N/A';

      setMetrics({
        ventasDia, ventasMes, cuentasPorCobrar, morosidadActiva,
        labOrdersEnProceso: labOrders.length,
        entregasHoy: deliveries.length,
        branchSales, branchDelinquency, branchProfit, topSellers, topPromotores,
        bestBranch, stockAlerts,
        ticketPromedioGeneral, pctCredito, pctRecuperacion, pctConversion,
        utilidadMensual, margenPromedioGeneral, sucursalMasRentable, productoMasRentable,
      });
    } catch (err) {
      console.error('[CorporateDashboard] Error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Apply filters to branch data
  const filteredBranchSales = useMemo(() => {
    if (!metrics) return [];
    if (filterBranch === 'all') return metrics.branchSales;
    return metrics.branchSales.filter(b => b.branchName === filterBranch);
  }, [metrics, filterBranch]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Cargando dashboard corporativo...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!metrics) {
    return (
      <MainLayout>
        <p className="text-center text-muted-foreground py-12">No se pudieron cargar las métricas.</p>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Dashboard Corporativo
          </h1>
          <p className="text-muted-foreground mt-1">
            Visión consolidada de todas las sucursales
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterBranch} onValueChange={setFilterBranch}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Contado y Crédito</SelectItem>
              <SelectItem value="cash">Solo Contado</SelectItem>
              <SelectItem value="credit">Solo Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ═══ 1) Summary Cards ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Ventas del Día" value={fmt(metrics.ventasDia)} icon={DollarSign} iconColor="bg-success/10 text-success" delay={0} />
        <StatCard title="Ventas del Mes" value={fmt(metrics.ventasMes)} icon={CalendarDays} iconColor="bg-primary/10 text-primary" delay={1} />
        <StatCard title="Cuentas por Cobrar" value={fmt(metrics.cuentasPorCobrar)} icon={CreditCard} iconColor="bg-warning/10 text-warning" delay={2} />
        <StatCard title="Morosidad Activa" value={`${metrics.morosidadActiva}`} change="Pacientes con deuda" icon={AlertTriangle} iconColor="bg-destructive/10 text-destructive" delay={3} />
        <StatCard title="Lab en Proceso" value={`${metrics.labOrdersEnProceso}`} icon={Package} iconColor="bg-ai/10 text-ai" delay={4} />
        <StatCard title="Entregas Hoy" value={`${metrics.entregasHoy}`} icon={Truck} iconColor="bg-accent/10 text-accent" delay={5} />
      </div>

      {/* ═══ 2) Sales by Branch Chart ═══ */}
      <ErrorBoundary fallback={<ModuleErrorFallback title="Error en gráfico" />}>
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Ventas por Sucursal (Mes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredBranchSales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredBranchSales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="branchName" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'ventaMensual') return [fmt(value), 'Venta Mensual'];
                      if (name === 'ticketPromedio') return [fmt(value), 'Ticket Promedio'];
                      return [value, name];
                    }}
                  />
                  <Legend formatter={(v) => v === 'ventaMensual' ? 'Venta Mensual' : v === 'numVentas' ? '# Ventas' : v} />
                  <Bar dataKey="ventaMensual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="numVentas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sin datos de ventas para el filtro seleccionado.</p>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ═══ 3) Delinquency Table ═══ */}
        <ErrorBoundary fallback={<ModuleErrorFallback title="Error en morosidad" />}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Morosidad por Sucursal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.branchDelinquency.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="text-left py-2 font-medium">Sucursal</th>
                        <th className="text-right py-2 font-medium">Morosos</th>
                        <th className="text-right py-2 font-medium">Monto</th>
                        <th className="text-right py-2 font-medium">% Riesgo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.branchDelinquency.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 font-medium">{row.branchName}</td>
                          <td className="py-2 text-right">{row.pacientesMorosos}</td>
                          <td className="py-2 text-right text-destructive font-medium">{fmt(row.montoVencido)}</td>
                          <td className="py-2 text-right">
                            <Badge variant={row.porcentajeRiesgo > 20 ? 'destructive' : row.porcentajeRiesgo > 10 ? 'secondary' : 'outline'} className="text-[10px]">
                              {pct(row.porcentajeRiesgo)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">Sin morosidad registrada 🎉</p>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* ═══ 4) Rankings ═══ */}
        <ErrorBoundary fallback={<ModuleErrorFallback title="Error en ranking" />}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                Ranking Interno
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Top Sellers */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Top 5 Vendedores</h4>
                {metrics.topSellers.length > 0 ? (
                  <div className="space-y-1.5">
                    {metrics.topSellers.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={cn(
                            'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                            i === 0 ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'
                          )}>{i + 1}</span>
                          {s.name}
                        </span>
                        <span className="font-medium">{fmt(s.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin datos</p>
                )}
              </div>

              {/* Top Promotores */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Top 5 Promotores</h4>
                {metrics.topPromotores.length > 0 ? (
                  <div className="space-y-1.5">
                    {metrics.topPromotores.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={cn(
                            'h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                            i === 0 ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                          )}>{i + 1}</span>
                          {p.name}
                        </span>
                        <span className="font-medium">{p.patients} pacientes</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin datos</p>
                )}
              </div>

              {/* Best branch */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">🏆 Mayor venta mensual</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">{metrics.bestBranch}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ═══ 5) Critical Inventory ═══ */}
        <ErrorBoundary fallback={<ModuleErrorFallback title="Error en inventario" />}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-warning" />
                Inventario Crítico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.stockAlerts.length > 0 ? (
                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {metrics.stockAlerts.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <p className="font-medium">{a.productName}</p>
                        <p className="text-xs text-muted-foreground">{a.branchName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={a.alertType === 'out_of_stock' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {a.alertType === 'out_of_stock' ? 'Agotado' : `Stock: ${a.currentQty}`}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Min: {a.reorderPoint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">Sin alertas de stock 🎉</p>
              )}
            </CardContent>
          </Card>
        </ErrorBoundary>

        {/* ═══ 6) KPIs ═══ */}
        <ErrorBoundary fallback={<ModuleErrorFallback title="Error en KPIs" />}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Indicadores Clave (KPIs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KPIBox label="Ticket Promedio" value={fmt(metrics.ticketPromedioGeneral)} icon={DollarSign} color="text-primary" />
                <KPIBox label="% Ventas a Crédito" value={pct(metrics.pctCredito)} icon={CreditCard} color="text-warning" />
                <KPIBox label="% Recuperación Mensual" value={pct(metrics.pctRecuperacion)} icon={TrendingUp} color="text-success" />
                <KPIBox label="% Conversión Consulta→Venta" value={pct(metrics.pctConversion)} icon={Users} color="text-accent" />
                <KPIBox label="Utilidad Mensual" value={fmt(metrics.utilidadMensual)} icon={DollarSign} color="text-success" />
                <KPIBox label="Margen Promedio %" value={pct(metrics.margenPromedioGeneral)} icon={TrendingUp} color="text-primary" />
                <KPIBox label="Sucursal + Rentable" value={metrics.sucursalMasRentable} icon={Building2} color="text-accent" />
                <KPIBox label="Producto + Rentable" value={metrics.productoMasRentable} icon={Package} color="text-warning" />
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>

      {/* ═══ 7) Utilidad por Sucursal ═══ */}
      <ErrorBoundary fallback={<ModuleErrorFallback title="Error en utilidad" />}>
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success" />
              Utilidad por Sucursal (Mes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.branchProfit.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 font-medium">Sucursal</th>
                      <th className="text-right py-2 font-medium">Venta Total</th>
                      <th className="text-right py-2 font-medium">Costo Total</th>
                      <th className="text-right py-2 font-medium">Utilidad</th>
                      <th className="text-right py-2 font-medium">Margen %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.branchProfit.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 font-medium">{row.branchName}</td>
                        <td className="py-2 text-right">{fmt(row.ventaTotal)}</td>
                        <td className="py-2 text-right text-muted-foreground">{fmt(row.costoTotal)}</td>
                        <td className="py-2 text-right text-success font-semibold">{fmt(row.utilidad)}</td>
                        <td className="py-2 text-right">
                          <Badge variant={row.margenPct >= 40 ? 'default' : row.margenPct >= 20 ? 'secondary' : 'destructive'} className="text-[10px]">
                            {pct(row.margenPct)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2 text-right">{fmt(metrics.branchProfit.reduce((s, r) => s + r.ventaTotal, 0))}</td>
                      <td className="py-2 text-right text-muted-foreground">{fmt(metrics.branchProfit.reduce((s, r) => s + r.costoTotal, 0))}</td>
                      <td className="py-2 text-right text-success">{fmt(metrics.utilidadMensual)}</td>
                      <td className="py-2 text-right">
                        <Badge className="text-[10px]">{pct(metrics.margenPromedioGeneral)}</Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">Sin datos de ventas este mes</p>
            )}
          </CardContent>
        </Card>
      </ErrorBoundary>

      <p className="text-[10px] text-muted-foreground text-center italic mt-4 mb-2">
        Datos consolidados de todas las sucursales activas • Actualización en tiempo real
      </p>
    </MainLayout>
  );
}

// ── KPI Mini Component ──
function KPIBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof DollarSign; color: string }) {
  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
