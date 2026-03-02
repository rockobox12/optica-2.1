import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, FileSpreadsheet, Calendar, Search, Filter } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';

export function SalesReport() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch sales data
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales-report', dateFrom, dateTo, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(`
          *,
          patients(first_name, last_name),
          profiles!sales_seller_id_fkey(full_name),
          branches(name)
        `)
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending' | 'partial' | 'completed' | 'cancelled' | 'refunded');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary statistics
  const summary = {
    totalSales: sales.reduce((sum, s) => sum + (s.total || 0), 0),
    salesCount: sales.length,
    completedSales: sales.filter(s => s.status === 'completed').length,
    pendingSales: sales.filter(s => s.status === 'pending').length,
    creditSales: sales.filter(s => s.is_credit).length,
    avgTicket: sales.length ? sales.reduce((sum, s) => sum + (s.total || 0), 0) / sales.length : 0,
    totalPaid: sales.reduce((sum, s) => sum + (s.amount_paid || 0), 0),
    totalPending: sales.reduce((sum, s) => sum + (s.balance || 0), 0),
  };

  // Sales by day for chart
  const salesByDay = sales.reduce((acc: Record<string, number>, sale) => {
    const day = format(parseISO(sale.created_at), 'dd/MM');
    acc[day] = (acc[day] || 0) + (sale.total || 0);
    return acc;
  }, {});

  const chartData = Object.entries(salesByDay).map(([day, total]) => ({ day, total }));

  // Sales by seller
  const salesBySeller = sales.reduce((acc: Record<string, { count: number; total: number }>, sale) => {
    const seller = (sale.profiles as any)?.full_name || 'Sin asignar';
    if (!acc[seller]) acc[seller] = { count: 0, total: 0 };
    acc[seller].count++;
    acc[seller].total += sale.total || 0;
    return acc;
  }, {});

  const sellerChartData = Object.entries(salesBySeller)
    .map(([name, data]) => ({ name: name.split(' ')[0], ventas: data.count, monto: data.total }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  // Filter sales by search
  const filteredSales = sales.filter(sale => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const customerName = sale.customer_name || 
      `${(sale.patients as any)?.first_name || ''} ${(sale.patients as any)?.last_name || ''}`;
    return (
      sale.sale_number?.toLowerCase().includes(searchLower) ||
      customerName.toLowerCase().includes(searchLower)
    );
  });

  const exportToCSV = () => {
    const headers = ['Folio', 'Fecha', 'Cliente', 'Vendedor', 'Subtotal', 'Descuento', 'Total', 'Pagado', 'Saldo', 'Estado'];
    const rows = filteredSales.map(sale => [
      sale.sale_number,
      format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm'),
      sale.customer_name || `${(sale.patients as any)?.first_name || ''} ${(sale.patients as any)?.last_name || ''}`,
      (sale.profiles as any)?.full_name || 'N/A',
      sale.subtotal?.toFixed(2),
      sale.discount_amount?.toFixed(2),
      sale.total?.toFixed(2),
      sale.amount_paid?.toFixed(2),
      sale.balance?.toFixed(2),
      sale.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    partial: 'Parcial',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <MaskedDateInput
                value={dateFrom}
                onChange={setDateFrom}
                label="Fecha Desde"
                mode="general"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <MaskedDateInput
                value={dateTo}
                onChange={setDateTo}
                label="Fecha Hasta"
                mode="general"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <Label className="text-xs">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="partial">Parciales</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Folio o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Ventas</p>
            <p className="text-2xl font-bold text-green-600">
              ${summary.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Número de Ventas</p>
            <p className="text-2xl font-bold">{summary.salesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Ticket Promedio</p>
            <p className="text-2xl font-bold text-blue-600">
              ${summary.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
            <p className="text-2xl font-bold text-orange-600">
              ${summary.totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Ventas']} />
                  <Line type="monotone" dataKey="total" stroke="#1a365d" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellerChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Monto']} />
                  <Bar dataKey="monto" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle de Ventas ({filteredSales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                    <TableCell>{format(parseISO(sale.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                    <TableCell>
                      {sale.customer_name || 
                        `${(sale.patients as any)?.first_name || ''} ${(sale.patients as any)?.last_name || ''}` ||
                        'Público General'}
                    </TableCell>
                    <TableCell>{(sale.profiles as any)?.full_name || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${sale.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ${sale.amount_paid?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-orange-600">
                      ${sale.balance?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[sale.status]}>
                        {statusLabels[sale.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredSales.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron ventas en el periodo seleccionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
