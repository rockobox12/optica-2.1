import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Banknote, Receipt } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useReportFilters } from '@/hooks/useReportFilters';
import { ReportFiltersPanel } from './ReportFiltersPanel';
import { ReportExporter } from './ReportExporter';
import { ReportKPICard } from './ReportKPICard';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function CashRegisterReport() {
  const { filters, setFilter, applyDatePreset, resetFilters } = useReportFilters();

  // Fetch cash registers
  const { data: cashRegisters = [], isLoading } = useQuery({
    queryKey: ['cash-register-report', filters.dateFrom, filters.dateTo, filters.branchId],
    queryFn: async () => {
      let query = supabase
        .from('cash_registers')
        .select(`
          *,
          branches(name),
          profiles!cash_registers_opened_by_fkey(full_name)
        `)
        .gte('opening_date', filters.dateFrom)
        .lte('opening_date', `${filters.dateTo}T23:59:59`)
        .order('opening_date', { ascending: false });

      if (filters.branchId !== 'all') {
        query = query.eq('branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch cash movements
  const { data: movements = [] } = useQuery({
    queryKey: ['cash-movements-report', filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .gte('created_at', filters.dateFrom)
        .lte('created_at', `${filters.dateTo}T23:59:59`);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch sale payments for method breakdown
  const { data: salePayments = [] } = useQuery({
    queryKey: ['sale-payments-cash-report', filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_payments')
        .select('payment_method, amount, created_at')
        .gte('created_at', filters.dateFrom)
        .lte('created_at', `${filters.dateTo}T23:59:59`);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Summary calculations
  const summary = {
    totalRegisters: cashRegisters.length,
    openRegisters: cashRegisters.filter(r => r.status === 'open').length,
    totalOpening: cashRegisters.reduce((sum, r) => sum + (r.opening_amount || 0), 0),
    totalClosing: cashRegisters.filter(r => r.closing_amount).reduce((sum, r) => sum + (r.closing_amount || 0), 0),
    totalDifference: cashRegisters.reduce((sum, r) => sum + (r.difference || 0), 0),
    totalSales: movements.filter(m => m.movement_type === 'sale').reduce((sum, m) => sum + (m.amount || 0), 0),
    totalExpenses: movements.filter(m => m.movement_type === 'expense').reduce((sum, m) => sum + (m.amount || 0), 0),
  };

  // Payment method breakdown
  const paymentMethodLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    check: 'Cheque',
  };

  const paymentByMethod = salePayments.reduce((acc: Record<string, number>, p) => {
    const method = p.payment_method || 'other';
    acc[method] = (acc[method] || 0) + (p.amount || 0);
    return acc;
  }, {});

  const pieData = Object.entries(paymentByMethod)
    .map(([method, amount]) => ({
      name: paymentMethodLabels[method] || method,
      value: amount,
    }))
    .sort((a, b) => b.value - a.value);

  // Daily summary for chart
  const dailySummary = cashRegisters.reduce((acc: Record<string, { ingresos: number; gastos: number }>, reg) => {
    const day = format(parseISO(reg.opening_date), 'dd/MM');
    if (!acc[day]) acc[day] = { ingresos: 0, gastos: 0 };
    acc[day].ingresos += (reg.closing_amount || 0) - (reg.opening_amount || 0);
    return acc;
  }, {});

  const chartData = Object.entries(dailySummary)
    .map(([day, data]) => ({ day, ...data }))
    .slice(-14);

  // Export columns
  const exportColumns = [
    { key: 'opening_date', header: 'Fecha', formatter: (v: string) => format(parseISO(v), 'dd/MM/yyyy HH:mm') },
    { key: 'branches', header: 'Sucursal', formatter: (v: any) => v?.name || 'N/A' },
    { key: 'profiles', header: 'Abierta por', formatter: (v: any) => v?.full_name || 'N/A' },
    { key: 'opening_amount', header: 'Apertura', formatter: (v: number) => `$${(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` },
    { key: 'closing_amount', header: 'Cierre', formatter: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : 'Pendiente' },
    { key: 'difference', header: 'Diferencia', formatter: (v: number) => v ? `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '-' },
    { key: 'status', header: 'Estado' },
  ];

  const statusLabels: Record<string, string> = {
    open: 'Abierta',
    closed: 'Cerrada',
  };

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
          showStatus={false}
          showSearch={false}
        />
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        {/* Header with export */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Reporte de Caja</h2>
            <p className="text-sm text-muted-foreground">Movimientos detallados y conciliación</p>
          </div>
          <ReportExporter
            data={cashRegisters}
            columns={exportColumns}
            filename={`reporte-caja-${filters.dateFrom}-${filters.dateTo}`}
            title="Reporte de Caja"
            subtitle={`Período: ${format(new Date(filters.dateFrom), 'dd/MM/yyyy')} - ${format(new Date(filters.dateTo), 'dd/MM/yyyy')}`}
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReportKPICard
            title="Cajas Abiertas"
            value={summary.openRegisters}
            subtitle={`de ${summary.totalRegisters} total`}
            icon={<Wallet className="h-5 w-5 text-primary" />}
            variant="info"
          />
          <ReportKPICard
            title="Ingresos en Efectivo"
            value={`$${summary.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={<ArrowUpRight className="h-5 w-5 text-green-600" />}
            variant="success"
          />
          <ReportKPICard
            title="Gastos"
            value={`$${summary.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={<ArrowDownRight className="h-5 w-5 text-red-600" />}
            variant="danger"
          />
          <ReportKPICard
            title="Diferencia Acumulada"
            value={`$${summary.totalDifference.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={<Receipt className="h-5 w-5 text-orange-600" />}
            variant={summary.totalDifference >= 0 ? 'default' : 'warning'}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Flujo Diario de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Monto']} />
                    <Bar dataKey="ingresos" fill="hsl(var(--primary))" name="Ingresos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métodos de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
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
            <CardTitle className="text-base">Historial de Cajas ({cashRegisters.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Apertura Por</TableHead>
                    <TableHead className="text-right">Monto Apertura</TableHead>
                    <TableHead className="text-right">Monto Cierre</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashRegisters.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>{format(parseISO(reg.opening_date), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell>{(reg.branches as any)?.name || 'N/A'}</TableCell>
                      <TableCell>{(reg.profiles as any)?.full_name || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        ${reg.opening_amount?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        {reg.closing_amount 
                          ? `$${reg.closing_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                          : <span className="text-muted-foreground">Pendiente</span>
                        }
                      </TableCell>
                      <TableCell className={`text-right ${(reg.difference || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {reg.difference !== null 
                          ? `$${reg.difference.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={reg.status === 'open' ? 'default' : 'secondary'}>
                          {statusLabels[reg.status] || reg.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {cashRegisters.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron registros de caja en el periodo
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
