import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Package, TrendingUp, DollarSign, ShoppingCart, Award } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useReportFilters } from '@/hooks/useReportFilters';
import { ReportFiltersPanel } from './ReportFiltersPanel';
import { ReportExporter } from './ReportExporter';
import { ReportKPICard } from './ReportKPICard';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

type TopLimit = 10 | 20 | 50;

export function TopProductsReport() {
  const { filters, setFilter, applyDatePreset, resetFilters } = useReportFilters();
  const [topLimit, setTopLimit] = useState<TopLimit>(10);

  // Fetch sale items with product details
  const { data: saleItems = [], isLoading } = useQuery({
    queryKey: ['top-products-report', filters.dateFrom, filters.dateTo, filters.branchId],
    queryFn: async () => {
      let query = supabase
        .from('sale_items')
        .select(`
          *,
          sales!inner(created_at, branch_id, status),
          products(name, sku, category)
        `)
        .gte('sales.created_at', filters.dateFrom)
        .lte('sales.created_at', `${filters.dateTo}T23:59:59`)
        .in('sales.status', ['completed', 'partial']);

      if (filters.branchId !== 'all') {
        query = query.eq('sales.branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Aggregate products
  const productAggregates = saleItems.reduce((acc: Record<string, {
    id: string;
    name: string;
    sku: string;
    category: string;
    quantity: number;
    revenue: number;
    transactions: number;
  }>, item) => {
    const productId = item.product_code || item.product_name || 'unknown';
    const product = item.products as any;
    
    if (!acc[productId]) {
      acc[productId] = {
        id: productId,
        name: product?.name || item.product_name || 'Producto',
        sku: product?.sku || item.product_code || 'N/A',
        category: product?.category || item.product_type || 'Otros',
        quantity: 0,
        revenue: 0,
        transactions: 0,
      };
    }
    
    acc[productId].quantity += item.quantity || 0;
    acc[productId].revenue += item.subtotal || 0;
    acc[productId].transactions += 1;
    
    return acc;
  }, {});

  const topProducts = Object.values(productAggregates)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topLimit);

  const topByQuantity = Object.values(productAggregates)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, topLimit);

  // Summary
  const summary = {
    totalProducts: Object.keys(productAggregates).length,
    totalUnits: Object.values(productAggregates).reduce((sum, p) => sum + p.quantity, 0),
    totalRevenue: Object.values(productAggregates).reduce((sum, p) => sum + p.revenue, 0),
    avgUnitPrice: topProducts.length 
      ? Object.values(productAggregates).reduce((sum, p) => sum + p.revenue, 0) / 
        Object.values(productAggregates).reduce((sum, p) => sum + p.quantity, 0)
      : 0,
  };

  // Category breakdown
  const categoryLabels: Record<string, string> = {
    frame: 'Armazones',
    frames: 'Armazones',
    lens: 'Lentes',
    lenses: 'Lentes',
    contact_lens: 'Lentes Contacto',
    contact_lenses: 'Lentes Contacto',
    accessory: 'Accesorios',
    accessories: 'Accesorios',
    service: 'Servicios',
    other: 'Otros',
  };

  const byCategory = Object.values(productAggregates).reduce((acc: Record<string, number>, p) => {
    const cat = p.category;
    acc[cat] = (acc[cat] || 0) + p.revenue;
    return acc;
  }, {});

  const pieData = Object.entries(byCategory)
    .map(([category, value]) => ({
      name: categoryLabels[category] || category,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Chart data
  const chartData = topProducts.slice(0, 10).map(p => ({
    name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name,
    ingresos: p.revenue,
    unidades: p.quantity,
  }));

  // Export columns
  const exportColumns = [
    { key: 'rank', header: '#' },
    { key: 'sku', header: 'SKU' },
    { key: 'name', header: 'Producto' },
    { key: 'category', header: 'Categoría', formatter: (v: string) => categoryLabels[v] || v },
    { key: 'quantity', header: 'Unidades' },
    { key: 'transactions', header: 'Transacciones' },
    { key: 'revenue', header: 'Ingresos', formatter: (v: number) => `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
  ];

  const exportData = topProducts.map((p, i) => ({ ...p, rank: i + 1 }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <ReportFiltersPanel
          filters={filters}
          onFilterChange={setFilter}
          onPresetChange={applyDatePreset}
          onReset={resetFilters}
          showCategory={true}
          showSeller={false}
          showStatus={false}
        />
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Productos Más Vendidos</h2>
            <p className="text-sm text-muted-foreground">Análisis de rentabilidad por producto</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              {([10, 20, 50] as TopLimit[]).map(limit => (
                <Button
                  key={limit}
                  variant={topLimit === limit ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none h-8"
                  onClick={() => setTopLimit(limit)}
                >
                  Top {limit}
                </Button>
              ))}
            </div>
            <ReportExporter
              data={exportData}
              columns={exportColumns}
              filename={`top-${topLimit}-productos-${filters.dateFrom}-${filters.dateTo}`}
              title={`Top ${topLimit} Productos Más Vendidos`}
              subtitle={`Período: ${format(new Date(filters.dateFrom), 'dd/MM/yyyy')} - ${format(new Date(filters.dateTo), 'dd/MM/yyyy')}`}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReportKPICard
            title="Productos Vendidos"
            value={summary.totalProducts}
            icon={<Package className="h-5 w-5 text-primary" />}
          />
          <ReportKPICard
            title="Unidades Totales"
            value={summary.totalUnits}
            icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
            variant="info"
          />
          <ReportKPICard
            title="Ingresos Totales"
            value={`$${summary.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            variant="success"
          />
          <ReportKPICard
            title="Precio Promedio"
            value={`$${summary.avgUnitPrice.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 por Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Ingresos']} />
                    <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Total']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top {topLimit} Productos ({topProducts.length} mostrados)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-center">Unidades</TableHead>
                    <TableHead className="text-center">Transacciones</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Badge 
                          variant={index < 3 ? 'default' : 'secondary'}
                          className={index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : ''}
                        >
                          {index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {categoryLabels[product.category] || product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{product.quantity}</TableCell>
                      <TableCell className="text-center">{product.transactions}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        ${product.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron productos vendidos en el periodo
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
