import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Clock, CheckCircle, AlertTriangle, Eye, Package, Timer } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReportFilters } from '@/hooks/useReportFilters';
import { ReportFiltersPanel } from './ReportFiltersPanel';
import { ReportExporter } from './ReportExporter';
import { ReportKPICard } from './ReportKPICard';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function LabOrdersReport() {
  const { filters, setFilter, applyDatePreset, resetFilters } = useReportFilters();

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_production', label: 'En Producción' },
    { value: 'ready', label: 'Listo' },
    { value: 'delivered', label: 'Entregado' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  // Fetch lab orders
  const { data: labOrders = [], isLoading } = useQuery({
    queryKey: ['lab-orders-report', filters.dateFrom, filters.dateTo, filters.branchId, filters.status],
    queryFn: async () => {
      let query = supabase
        .from('lab_orders')
        .select(`
          *,
          patients(first_name, last_name),
          branches(name)
        `)
        .gte('created_at', filters.dateFrom)
        .lte('created_at', `${filters.dateTo}T23:59:59`)
        .order('created_at', { ascending: false });

      if (filters.branchId !== 'all') {
        query = query.eq('branch_id', filters.branchId);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Status labels and colors
  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    in_production: 'En Producción',
    ready: 'Listo para Entrega',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    in_production: 'bg-blue-100 text-blue-800 border-blue-300',
    ready: 'bg-green-100 text-green-800 border-green-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  // Summary calculations
  const summary = {
    total: labOrders.length,
    pending: labOrders.filter(o => o.status === 'pending').length,
    inProduction: labOrders.filter(o => o.status === 'in_production').length,
    ready: labOrders.filter(o => o.status === 'ready').length,
    delivered: labOrders.filter(o => o.status === 'delivered').length,
    cancelled: labOrders.filter(o => o.status === 'cancelled').length,
  };

  // Calculate average completion time for delivered orders
  const deliveredOrders = labOrders.filter(o => o.status === 'delivered' && o.actual_delivery_date);
  const avgCompletionDays = deliveredOrders.length > 0
    ? deliveredOrders.reduce((sum, o) => {
        const days = differenceInDays(new Date(o.actual_delivery_date!), new Date(o.created_at));
        return sum + days;
      }, 0) / deliveredOrders.length
    : 0;

  // On-time delivery rate
  const ordersWithDueDate = labOrders.filter(o => o.estimated_delivery_date && o.actual_delivery_date);
  const onTimeDeliveries = ordersWithDueDate.filter(o => 
    new Date(o.actual_delivery_date!) <= new Date(o.estimated_delivery_date!)
  ).length;
  const onTimeRate = ordersWithDueDate.length > 0 
    ? (onTimeDeliveries / ordersWithDueDate.length) * 100 
    : 0;

  // Overdue orders
  const overdueOrders = labOrders.filter(o => {
    if (o.status === 'delivered' || o.status === 'cancelled') return false;
    if (!o.estimated_delivery_date) return false;
    return new Date() > new Date(o.estimated_delivery_date);
  });

  // Status distribution for pie chart
  const statusData = [
    { name: 'Pendiente', value: summary.pending },
    { name: 'En Producción', value: summary.inProduction },
    { name: 'Listo', value: summary.ready },
    { name: 'Entregado', value: summary.delivered },
    { name: 'Cancelado', value: summary.cancelled },
  ].filter(d => d.value > 0);

  // Daily orders chart
  const dailyOrders = labOrders.reduce((acc: Record<string, number>, order) => {
    const day = format(parseISO(order.created_at), 'dd/MM');
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(dailyOrders)
    .map(([day, count]) => ({ day, ordenes: count }))
    .slice(-14);

  // Export columns
  const exportColumns = [
    { key: 'order_number', header: 'Número' },
    { key: 'created_at', header: 'Fecha', formatter: (v: string) => format(parseISO(v), 'dd/MM/yyyy HH:mm') },
    { key: 'patients', header: 'Paciente', formatter: (v: any) => v ? `${v.first_name} ${v.last_name}` : 'N/A' },
    { key: 'branches', header: 'Sucursal', formatter: (v: any) => v?.name || 'N/A' },
    { key: 'estimated_delivery_date', header: 'Entrega Estimada', formatter: (v: string) => v ? format(parseISO(v), 'dd/MM/yyyy') : 'N/A' },
    { key: 'status', header: 'Estado', formatter: (v: string) => statusLabels[v] || v },
    { key: 'total', header: 'Total', formatter: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'N/A' },
  ];

  // Filter by search
  const filteredOrders = labOrders.filter(order => {
    if (!filters.searchTerm) return true;
    const search = filters.searchTerm.toLowerCase();
    const patient = order.patients as any;
    const patientName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';
    return (
      order.order_number?.toLowerCase().includes(search) ||
      patientName.includes(search)
    );
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <ReportFiltersPanel
          filters={filters}
          onFilterChange={setFilter}
          onPresetChange={applyDatePreset}
          onReset={resetFilters}
          showCategory={false}
          showSeller={false}
          statusOptions={statusOptions}
          searchPlaceholder="Buscar orden o paciente..."
        />
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Órdenes de Laboratorio</h2>
            <p className="text-sm text-muted-foreground">Seguimiento y cumplimiento de tiempos</p>
          </div>
          <ReportExporter
            data={filteredOrders}
            columns={exportColumns}
            filename={`ordenes-laboratorio-${filters.dateFrom}-${filters.dateTo}`}
            title="Reporte de Órdenes de Laboratorio"
            subtitle={`Período: ${format(new Date(filters.dateFrom), 'dd/MM/yyyy')} - ${format(new Date(filters.dateTo), 'dd/MM/yyyy')}`}
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ReportKPICard
            title="Total Órdenes"
            value={summary.total}
            icon={<Package className="h-5 w-5 text-primary" />}
          />
          <ReportKPICard
            title="En Proceso"
            value={summary.pending + summary.inProduction}
            subtitle={`${summary.pending} pend. + ${summary.inProduction} prod.`}
            icon={<Clock className="h-5 w-5 text-blue-600" />}
            variant="info"
          />
          <ReportKPICard
            title="Listas"
            value={summary.ready}
            icon={<CheckCircle className="h-5 w-5 text-green-600" />}
            variant="success"
          />
          <ReportKPICard
            title="Atrasadas"
            value={overdueOrders.length}
            icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
            variant={overdueOrders.length > 0 ? 'danger' : 'default'}
          />
          <ReportKPICard
            title="Cumplimiento"
            value={`${onTimeRate.toFixed(0)}%`}
            subtitle={`${avgCompletionDays.toFixed(1)} días prom.`}
            icon={<Timer className="h-5 w-5 text-purple-600" />}
            variant={onTimeRate >= 80 ? 'success' : onTimeRate >= 60 ? 'warning' : 'danger'}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Órdenes por Día</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="ordenes" fill="hsl(var(--primary))" name="Órdenes" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribución por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(summary)
            .filter(([key]) => key !== 'total')
            .map(([key, value]) => (
              <Card key={key} className="p-3 text-center">
                <Badge variant="outline" className={statusColors[key] || ''}>
                  {statusLabels[key] || key}
                </Badge>
                <p className="text-2xl font-bold mt-2">{value}</p>
                <Progress 
                  value={summary.total > 0 ? (value / summary.total) * 100 : 0} 
                  className="h-1.5 mt-2"
                />
              </Card>
            ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalle de Órdenes ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Entrega Est.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Tiempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const patient = order.patients as any;
                    const isOverdue = order.estimated_delivery_date && 
                      !['delivered', 'cancelled'].includes(order.status) &&
                      new Date() > new Date(order.estimated_delivery_date);
                    
                    const daysElapsed = differenceInDays(new Date(), parseISO(order.created_at));

                    return (
                      <TableRow key={order.id} className={isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>{format(parseISO(order.created_at), 'dd/MM/yy')}</TableCell>
                        <TableCell>
                          {patient ? `${patient.first_name} ${patient.last_name}` : 'N/A'}
                        </TableCell>
                        <TableCell>{(order.branches as any)?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {order.estimated_delivery_date 
                            ? format(parseISO(order.estimated_delivery_date), 'dd/MM/yy')
                            : <span className="text-muted-foreground">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[order.status] || ''}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {daysElapsed} días
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron órdenes en el periodo
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
