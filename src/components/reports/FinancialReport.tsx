import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart, Area } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Receipt, FileSpreadsheet, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, subDays, parseISO, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';

export function FinancialReport() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Fetch sales
  const { data: sales = [] } = useQuery({
    queryKey: ['financial-sales', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`);

      if (error) throw error;
      return data;
    },
  });

  // Fetch expenses
  const { data: expenses = [] } = useQuery({
    queryKey: ['financial-expenses', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', dateFrom)
        .lte('expense_date', dateTo);

      if (error) throw error;
      return data;
    },
  });

  // Fetch credit payments
  const { data: creditPayments = [] } = useQuery({
    queryKey: ['financial-credit-payments', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_payments')
        .select('*')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`);

      if (error) throw error;
      return data;
    },
  });

  // Financial summary
  const totalIncome = sales.reduce((sum, s) => sum + (s.amount_paid || 0), 0) + 
    creditPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const totalSalesValue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
  const pendingBalance = sales.reduce((sum, s) => sum + (s.balance || 0), 0);

  // Income by payment method
  const { data: salePayments = [] } = useQuery({
    queryKey: ['sale-payments', dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_payments')
        .select('payment_method, amount, created_at')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`);

      if (error) throw error;
      return data;
    },
  });

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    check: 'Cheque',
  };

  const incomeByMethod = salePayments.reduce((acc: Record<string, number>, payment) => {
    const method = payment.payment_method || 'other';
    acc[method] = (acc[method] || 0) + (payment.amount || 0);
    return acc;
  }, {});

  const paymentMethodData = Object.entries(incomeByMethod).map(([method, amount]) => ({
    name: paymentMethodLabels[method] || method,
    amount,
  }));

  // Expenses by category
  const expenseCategories: Record<string, string> = {
    utilities: 'Servicios',
    rent: 'Renta',
    payroll: 'Nómina',
    supplies: 'Insumos',
    maintenance: 'Mantenimiento',
    laboratory: 'Laboratorio',
    marketing: 'Marketing',
    other: 'Otros',
  };

  const expensesByCategory = expenses.reduce((acc: Record<string, number>, expense) => {
    const category = expense.category || 'other';
    acc[category] = (acc[category] || 0) + (expense.amount || 0);
    return acc;
  }, {});

  const expenseCategoryData = Object.entries(expensesByCategory)
    .map(([category, amount]) => ({
      name: expenseCategories[category] || category,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Daily cash flow
  const dailyCashFlow: Record<string, { income: number; expenses: number }> = {};
  
  sales.forEach(sale => {
    const day = format(parseISO(sale.created_at), 'dd/MM');
    if (!dailyCashFlow[day]) dailyCashFlow[day] = { income: 0, expenses: 0 };
    dailyCashFlow[day].income += sale.amount_paid || 0;
  });

  creditPayments.forEach(payment => {
    const day = format(parseISO(payment.created_at), 'dd/MM');
    if (!dailyCashFlow[day]) dailyCashFlow[day] = { income: 0, expenses: 0 };
    dailyCashFlow[day].income += payment.amount || 0;
  });

  expenses.forEach(expense => {
    const day = format(parseISO(expense.expense_date), 'dd/MM');
    if (!dailyCashFlow[day]) dailyCashFlow[day] = { income: 0, expenses: 0 };
    dailyCashFlow[day].expenses += expense.amount || 0;
  });

  const cashFlowData = Object.entries(dailyCashFlow)
    .map(([day, data]) => ({
      day,
      ingresos: data.income,
      gastos: data.expenses,
      neto: data.income - data.expenses,
    }))
    .slice(-14); // Last 14 days

  // Monthly comparison
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const monthSales = sales.filter(s => {
      const date = new Date(s.created_at);
      return date >= monthStart && date <= monthEnd;
    });

    const monthExpenses = expenses.filter(e => {
      const date = new Date(e.expense_date);
      return date >= monthStart && date <= monthEnd;
    });

    monthlyData.push({
      month: format(monthDate, 'MMM', { locale: es }),
      ventas: monthSales.reduce((sum, s) => sum + (s.total || 0), 0),
      gastos: monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    });
  }

  const exportToCSV = () => {
    const report = {
      periodo: { desde: dateFrom, hasta: dateTo },
      resumen: {
        ingresosTotales: totalIncome,
        gastosTotales: totalExpenses,
        utilidadNeta: netProfit,
        ventasTotales: totalSalesValue,
        saldoPendiente: pendingBalance,
      },
      ingresosPorMetodo: incomeByMethod,
      gastosPorCategoria: expensesByCategory,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-financiero-${dateFrom}-${dateTo}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Date Filters */}
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
            <Button variant="outline" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
          <CardContent className="p-4 text-center">
            <ArrowUpRight className="h-6 w-6 mx-auto mb-2 text-green-600" />
            <p className="text-sm text-green-700 dark:text-green-400">Ingresos</p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              ${totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200">
          <CardContent className="p-4 text-center">
            <ArrowDownRight className="h-6 w-6 mx-auto mb-2 text-red-600" />
            <p className="text-sm text-red-700 dark:text-red-400">Gastos</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              ${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className={`${netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
          <CardContent className="p-4 text-center">
            {netProfit >= 0 ? (
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-blue-600" />
            ) : (
              <TrendingDown className="h-6 w-6 mx-auto mb-2 text-orange-600" />
            )}
            <p className="text-sm text-muted-foreground">Utilidad Neta</p>
            <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              ${netProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-2 text-purple-600" />
            <p className="text-sm text-muted-foreground">Ventas Totales</p>
            <p className="text-xl font-bold">
              ${totalSalesValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CreditCard className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-muted-foreground">Por Cobrar</p>
            <p className="text-xl font-bold text-orange-600">
              ${pendingBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flujo de Efectivo Diario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, '']} />
                  <Legend />
                  <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="neto" stroke="#3b82f6" name="Neto" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparativo Mensual (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, '']} />
                  <Legend />
                  <Bar dataKey="ventas" fill="#2563eb" name="Ventas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="#f59e0b" name="Gastos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Ingresos por Método de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentMethodData.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      ${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {((item.amount / totalIncome) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-green-600">
                    ${totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Gastos por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseCategoryData.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      ${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right text-red-600">
                    ${totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
