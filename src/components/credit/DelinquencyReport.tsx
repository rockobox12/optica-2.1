import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, AlertTriangle, Clock, DollarSign, TrendingDown } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface DelinquentAccount {
  id: string;
  sale_number: string;
  customer_name: string | null;
  patient_id: string | null;
  total: number;
  balance: number;
  credit_due_date: string;
  created_at: string;
  days_overdue: number;
  aging_bucket: string;
  patients?: {
    first_name: string;
    last_name: string;
    phone: string | null;
    mobile: string | null;
  };
}

const getAgingBucket = (daysOverdue: number): string => {
  if (daysOverdue <= 30) return '1-30';
  if (daysOverdue <= 60) return '31-60';
  if (daysOverdue <= 90) return '61-90';
  return '90+';
};

const getAgingColor = (bucket: string) => {
  switch (bucket) {
    case '1-30': return 'bg-yellow-100 text-yellow-800';
    case '31-60': return 'bg-orange-100 text-orange-800';
    case '61-90': return 'bg-red-100 text-red-800';
    case '90+': return 'bg-red-200 text-red-900';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function DelinquencyReport() {
  const [agingFilter, setAgingFilter] = useState<string>('all');

  // Fetch delinquent accounts
  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['delinquency-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id, sale_number, customer_name, patient_id, total, balance, 
          credit_due_date, created_at,
          patients (first_name, last_name, phone, mobile)
        `)
        .eq('is_credit', true)
        .gt('balance', 0)
        .not('credit_due_date', 'is', null)
        .lt('credit_due_date', new Date().toISOString())
        .order('credit_due_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((account: any) => {
        const daysOverdue = differenceInDays(new Date(), new Date(account.credit_due_date));
        return {
          ...account,
          days_overdue: daysOverdue,
          aging_bucket: getAgingBucket(daysOverdue),
        } as DelinquentAccount;
      });
    },
  });

  // Filter accounts by aging bucket
  const filteredAccounts = agingFilter === 'all' 
    ? accounts 
    : accounts.filter(a => a.aging_bucket === agingFilter);

  // Calculate aging summary
  const agingSummary = {
    '1-30': accounts.filter(a => a.aging_bucket === '1-30'),
    '31-60': accounts.filter(a => a.aging_bucket === '31-60'),
    '61-90': accounts.filter(a => a.aging_bucket === '61-90'),
    '90+': accounts.filter(a => a.aging_bucket === '90+'),
  };

  const totalDelinquent = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Ticket', 'Cliente', 'Teléfono', 'Total', 'Saldo', 'Vencimiento', 'Días Vencido', 'Bucket'];
    const rows = filteredAccounts.map(a => [
      a.sale_number,
      `${a.patients?.first_name || ''} ${a.patients?.last_name || a.customer_name || ''}`.trim(),
      a.patients?.mobile || a.patients?.phone || '',
      a.total,
      a.balance,
      a.credit_due_date,
      a.days_overdue,
      a.aging_bucket,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-morosidad-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Moroso</p>
                <p className="text-xl font-bold text-red-600">${totalDelinquent.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {Object.entries(agingSummary).map(([bucket, items]) => {
          const total = items.reduce((sum, a) => sum + Number(a.balance), 0);
          const percentage = totalDelinquent > 0 ? (total / totalDelinquent) * 100 : 0;
          
          return (
            <Card 
              key={bucket} 
              className={`cursor-pointer transition-all ${agingFilter === bucket ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setAgingFilter(agingFilter === bucket ? 'all' : bucket)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getAgingColor(bucket)}>{bucket} días</Badge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <p className="text-lg font-bold">${total.toFixed(2)}</p>
                <Progress value={percentage} className="h-1 mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Export */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Select value={agingFilter} onValueChange={setAgingFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por antigüedad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="1-30">1-30 días</SelectItem>
              <SelectItem value="31-60">31-60 días</SelectItem>
              <SelectItem value="61-90">61-90 días</SelectItem>
              <SelectItem value="90+">90+ días</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">
            {filteredAccounts.length} cuentas
          </Badge>
        </div>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Delinquent Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Reporte de Morosidad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay cuentas vencidas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-center">Días Vencido</TableHead>
                  <TableHead>Antigüedad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-sm">{account.sale_number}</TableCell>
                    <TableCell>
                      {account.patients?.first_name} {account.patients?.last_name || account.customer_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.patients?.mobile || account.patients?.phone || 'Sin teléfono'}
                    </TableCell>
                    <TableCell className="text-right">${Number(account.total).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      ${Number(account.balance).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(account.credit_due_date), 'dd/MM/yyyy', { locale: es })}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${
                        account.days_overdue > 90 ? 'text-red-600' :
                        account.days_overdue > 60 ? 'text-orange-600' :
                        account.days_overdue > 30 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {account.days_overdue}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getAgingColor(account.aging_bucket)}>
                        {account.aging_bucket} días
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de Antigüedad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(agingSummary).map(([bucket, items]) => {
              const total = items.reduce((sum, a) => sum + Number(a.balance), 0);
              const percentage = totalDelinquent > 0 ? (total / totalDelinquent) * 100 : 0;
              
              return (
                <div key={bucket} className="flex items-center gap-4">
                  <Badge className={`${getAgingColor(bucket)} w-20 justify-center`}>
                    {bucket} días
                  </Badge>
                  <div className="flex-1">
                    <Progress value={percentage} className="h-3" />
                  </div>
                  <div className="text-right min-w-[120px]">
                    <span className="font-bold">${total.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {items.length} ctas
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
