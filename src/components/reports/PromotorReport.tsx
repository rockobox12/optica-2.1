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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, FileSpreadsheet, Megaphone, Trophy, Users, DollarSign, TrendingUp } from 'lucide-react';
import { format, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const DEFAULT_PROMOTOR_ID = '00000000-0000-0000-0000-000000000001';
const COLORS = ['#1a365d', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

export function PromotorReport() {
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedPromotor, setSelectedPromotor] = useState('all');

  // Fetch all promotores for filter
  const { data: promotores = [] } = useQuery({
    queryKey: ['promotores-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotores')
        .select('id, nombre_completo')
        .eq('activo', true)
        .neq('id', DEFAULT_PROMOTOR_ID)
        .order('nombre_completo');
      if (error) throw error;
      return data;
    },
  });

  // Fetch sales with promotor data
  const { data: salesData = [], isLoading } = useQuery({
    queryKey: ['promotor-sales-report', selectedPeriod, selectedPromotor],
    queryFn: async () => {
      const startDate = `${selectedPeriod}-01`;
      const endDate = new Date(parseInt(selectedPeriod.split('-')[0]), parseInt(selectedPeriod.split('-')[1]), 0);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      let query = supabase
        .from('sales')
        .select(`
          id,
          sale_number,
          total,
          created_at,
          promotor_id,
          promotor_nombre,
          customer_name,
          patients(first_name, last_name)
        `)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDateStr}T23:59:59`)
        .in('status', ['completed', 'partial'])
        .order('created_at', { ascending: false });

      if (selectedPromotor !== 'all') {
        query = query.eq('promotor_id', selectedPromotor);
      } else {
        // Exclude internal promotor when showing all
        query = query.neq('promotor_id', DEFAULT_PROMOTOR_ID);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch commissions for the period
  const { data: commissions = [] } = useQuery({
    queryKey: ['promotor-commissions-report', selectedPeriod, selectedPromotor],
    queryFn: async () => {
      let query = supabase
        .from('promotor_comisiones')
        .select(`
          *,
          promotores(nombre_completo)
        `)
        .eq('periodo', selectedPeriod);

      if (selectedPromotor !== 'all') {
        query = query.eq('promotor_id', selectedPromotor);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate summary stats
  const summary = {
    totalSales: salesData.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
    salesCount: salesData.length,
    uniquePatients: new Set(salesData.map(s => s.customer_name || `${(s.patients as any)?.first_name || ''} ${(s.patients as any)?.last_name || ''}`)).size,
    totalCommissions: commissions.reduce((sum, c) => sum + (Number(c.monto_comision) || 0), 0),
    pendingCommissions: commissions.filter(c => c.status === 'PENDIENTE').reduce((sum, c) => sum + (Number(c.monto_comision) || 0), 0),
    paidCommissions: commissions.filter(c => c.status === 'PAGADA').reduce((sum, c) => sum + (Number(c.monto_comision) || 0), 0),
  };

  // Aggregate by promotor for charts
  const promotorAggregates = salesData.reduce((acc: Record<string, { nombre: string; ventas: number; count: number }>, sale) => {
    const id = sale.promotor_id;
    if (!acc[id]) {
      acc[id] = {
        nombre: sale.promotor_nombre || 'Sin nombre',
        ventas: 0,
        count: 0,
      };
    }
    acc[id].ventas += Number(sale.total) || 0;
    acc[id].count += 1;
    return acc;
  }, {});

  const chartData = Object.entries(promotorAggregates)
    .map(([id, data]) => ({
      name: data.nombre.split(' ')[0],
      ventas: data.ventas,
      cantidad: data.count,
    }))
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, 10);

  const pieData = Object.entries(promotorAggregates)
    .map(([id, data]) => ({
      name: data.nombre,
      value: data.ventas,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: es }),
    };
  });

  const exportToCSV = () => {
    const headers = ['Folio', 'Fecha', 'Cliente', 'Promotor', 'Total', 'Comisión', 'Estado Comisión'];
    const rows = salesData.map(sale => {
      const commission = commissions.find(c => c.sale_id === sale.id);
      return [
        sale.sale_number,
        format(parseISO(sale.created_at), 'dd/MM/yyyy HH:mm'),
        sale.customer_name || `${(sale.patients as any)?.first_name || ''} ${(sale.patients as any)?.last_name || ''}`,
        sale.promotor_nombre || 'N/A',
        Number(sale.total).toFixed(2),
        commission ? Number(commission.monto_comision).toFixed(2) : '0.00',
        commission?.status || 'N/A',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-promotores-${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[200px]">
              <Label className="text-xs">Periodo</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[200px]">
              <Label className="text-xs">Promotor</Label>
              <Select value={selectedPromotor} onValueChange={setSelectedPromotor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los promotores</SelectItem>
                  {promotores.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DollarSign className="h-8 w-8 mx-auto mb-2 text-primary opacity-75" />
            <p className="text-sm text-muted-foreground">Total Ventas</p>
            <p className="text-2xl font-bold text-primary">
              ${summary.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-success opacity-75" />
            <p className="text-sm text-muted-foreground">Número de Ventas</p>
            <p className="text-2xl font-bold">{summary.salesCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-accent opacity-75" />
            <p className="text-sm text-muted-foreground">Pacientes Referidos</p>
            <p className="text-2xl font-bold">{summary.uniquePatients}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Megaphone className="h-8 w-8 mx-auto mb-2 text-warning opacity-75" />
            <p className="text-sm text-muted-foreground">Comisiones</p>
            <p className="text-2xl font-bold text-warning">
              ${summary.totalCommissions.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <div className="flex justify-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs text-success border-success">
                Pagadas: ${summary.paidCommissions.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              </Badge>
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Pend: ${summary.pendingCommissions.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Top Promotores por Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Ventas']} />
                    <Bar dataKey="ventas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución de Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Ventas']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle de Ventas por Promotor ({salesData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Promotor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.map((sale) => {
                  const commission = commissions.find(c => c.sale_id === sale.id);
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-sm">{sale.sale_number}</TableCell>
                      <TableCell>{format(parseISO(sale.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                      <TableCell>
                        {sale.customer_name || 
                          `${(sale.patients as any)?.first_name || ''} ${(sale.patients as any)?.last_name || ''}` ||
                          'Público General'}
                      </TableCell>
                      <TableCell>{sale.promotor_nombre || 'N/A'}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        ${commission ? Number(commission.monto_comision).toLocaleString('es-MX', { minimumFractionDigits: 2 }) : '0.00'}
                      </TableCell>
                      <TableCell>
                        {commission ? (
                          <Badge variant={commission.status === 'PAGADA' ? 'default' : 'secondary'}>
                            {commission.status}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {salesData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron ventas por promotores en el periodo seleccionado
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
