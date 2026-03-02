import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Activity, Users, ShoppingBag } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, subDays, parseISO, getDay, getHours } from 'date-fns';
import { es } from 'date-fns/locale';

const COLORS = ['#1a365d', '#2563eb', '#10b981', '#f59e0b', '#ef4444'];

interface TrendIndicatorProps {
  value: number;
  label: string;
}

function TrendIndicator({ value, label }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = Math.abs(value) < 1;

  return (
    <div className="flex items-center gap-1">
      {isNeutral ? (
        <Minus className="h-4 w-4 text-muted-foreground" />
      ) : isPositive ? (
        <TrendingUp className="h-4 w-4 text-green-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-red-500" />
      )}
      <span className={`text-sm font-medium ${
        isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600' : 'text-red-600'
      }`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function TrendAnalysis() {
  const [timeRange, setTimeRange] = useState('6months');

  // Fetch historical sales data
  const { data: salesTrend = [] } = useQuery({
    queryKey: ['sales-trend', timeRange],
    queryFn: async () => {
      const months = timeRange === '12months' ? 12 : timeRange === '6months' ? 6 : 3;
      const data = [];

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const { data: sales, error } = await supabase
          .from('sales')
          .select('total, created_at')
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (!error) {
          const totalSales = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
          const salesCount = sales?.length || 0;
          const avgTicket = salesCount > 0 ? totalSales / salesCount : 0;

          data.push({
            month: format(monthDate, 'MMM yy', { locale: es }),
            ventas: totalSales,
            transacciones: salesCount,
            ticketPromedio: avgTicket,
          });
        }
      }

      return data;
    },
  });

  // Fetch patient growth trend
  const { data: patientTrend = [] } = useQuery({
    queryKey: ['patient-trend', timeRange],
    queryFn: async () => {
      const months = timeRange === '12months' ? 12 : timeRange === '6months' ? 6 : 3;
      const data = [];
      let cumulative = 0;

      for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        cumulative += count || 0;
        data.push({
          month: format(monthDate, 'MMM yy', { locale: es }),
          nuevos: count || 0,
          acumulado: cumulative,
        });
      }

      return data;
    },
  });

  // Fetch sales by day of week
  const { data: dayOfWeekData = [] } = useQuery({
    queryKey: ['sales-by-day'],
    queryFn: async () => {
      const startDate = subDays(new Date(), 90);
      const { data: sales } = await supabase
        .from('sales')
        .select('total, created_at')
        .gte('created_at', startDate.toISOString());

      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const daySales: Record<number, { total: number; count: number }> = {};

      sales?.forEach(sale => {
        const day = getDay(parseISO(sale.created_at));
        if (!daySales[day]) daySales[day] = { total: 0, count: 0 };
        daySales[day].total += sale.total || 0;
        daySales[day].count++;
      });

      return dayNames.map((name, index) => ({
        day: name,
        promedio: daySales[index] ? daySales[index].total / daySales[index].count : 0,
        transacciones: daySales[index]?.count || 0,
      }));
    },
  });

  // Fetch sales by hour
  const { data: hourlyData = [] } = useQuery({
    queryKey: ['sales-by-hour'],
    queryFn: async () => {
      const startDate = subDays(new Date(), 30);
      const { data: sales } = await supabase
        .from('sales')
        .select('total, created_at')
        .gte('created_at', startDate.toISOString());

      const hourSales: Record<number, { total: number; count: number }> = {};

      sales?.forEach(sale => {
        const hour = getHours(parseISO(sale.created_at));
        if (!hourSales[hour]) hourSales[hour] = { total: 0, count: 0 };
        hourSales[hour].total += sale.total || 0;
        hourSales[hour].count++;
      });

      return Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        ventas: hourSales[hour]?.total || 0,
        transacciones: hourSales[hour]?.count || 0,
      })).filter((_, i) => i >= 8 && i <= 20); // Business hours only
    },
  });

  // Fetch top selling products trend
  const { data: productTrend = [] } = useQuery({
    queryKey: ['product-trend'],
    queryFn: async () => {
      const { data: items } = await supabase
        .from('sale_items')
        .select('product_type, subtotal, quantity')
        .order('created_at', { ascending: false })
        .limit(1000);

      const typeLabels: Record<string, string> = {
        frame: 'Armazones',
        lens: 'Lentes',
        contact_lens: 'Lentes Contacto',
        accessory: 'Accesorios',
        service: 'Servicios',
      };

      const byType: Record<string, { revenue: number; quantity: number }> = {};
      items?.forEach(item => {
        const type = item.product_type || 'other';
        if (!byType[type]) byType[type] = { revenue: 0, quantity: 0 };
        byType[type].revenue += item.subtotal || 0;
        byType[type].quantity += item.quantity || 0;
      });

      return Object.entries(byType)
        .map(([type, data]) => ({
          category: typeLabels[type] || type,
          ingresos: data.revenue,
          unidades: data.quantity,
        }))
        .sort((a, b) => b.ingresos - a.ingresos);
    },
  });

  // Calculate growth rates
  const calculateGrowth = (data: any[], key: string) => {
    if (data.length < 2) return 0;
    const current = data[data.length - 1]?.[key] || 0;
    const previous = data[data.length - 2]?.[key] || 1;
    return ((current - previous) / previous) * 100;
  };

  const salesGrowth = calculateGrowth(salesTrend, 'ventas');
  const ticketGrowth = calculateGrowth(salesTrend, 'ticketPromedio');
  const patientGrowth = calculateGrowth(patientTrend, 'nuevos');

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="12months">Último año</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4">
          <TrendIndicator value={salesGrowth} label="ventas" />
          <TrendIndicator value={ticketGrowth} label="ticket" />
          <TrendIndicator value={patientGrowth} label="pacientes" />
        </div>
      </div>

      {/* Main Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Tendencia de Ventas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'ventas' ? `$${value.toLocaleString('es-MX')}` : value,
                      name === 'ventas' ? 'Ventas' : 'Transacciones'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ventas"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Patient Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Crecimiento de Pacientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={patientTrend}>
                  <defs>
                    <linearGradient id="colorPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="nuevos"
                    name="Nuevos"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorPatients)"
                  />
                  <Line
                    type="monotone"
                    dataKey="acumulado"
                    name="Acumulado"
                    stroke="#1a365d"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Behavioral Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales by Day of Week */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por Día de Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Promedio']} />
                  <Bar dataKey="promedio" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs">
                Mejor día: {dayOfWeekData.reduce((max, d) => d.promedio > max.promedio ? d : max, { day: '', promedio: 0 }).day}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Sales by Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventas por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="transacciones"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-center">
              <Badge variant="outline" className="text-xs">
                Hora pico: {hourlyData.reduce((max, h) => h.transacciones > max.transacciones ? h : max, { hour: '', transacciones: 0 }).hour}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Product Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-purple-500" />
              Rendimiento por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productTrend} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Ingresos']} />
                  <Bar dataKey="ingresos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Average Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            Evolución del Ticket Promedio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ticket Promedio']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="ticketPromedio"
                  name="Ticket Promedio"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#f59e0b' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
