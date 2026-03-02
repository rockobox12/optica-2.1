import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, TrendingDown, Package, Clock, 
  ChevronRight, Building2, DollarSign
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Alert {
  id: string;
  type: 'branch_performance' | 'negative_margin' | 'excess_inventory' | 'overdue_account';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  value?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function ExecutiveAlerts() {
  // Fetch underperforming branches
  const { data: branchAlerts } = useQuery({
    queryKey: ['executive-branch-alerts'],
    queryFn: async () => {
      const { data: branches } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true);

      const alerts: Alert[] = [];
      
      if (branches) {
        for (const branch of branches) {
          const { data: sales } = await supabase
            .from('sales')
            .select('total')
            .eq('branch_id', branch.id)
            .gte('created_at', new Date(new Date().setDate(1)).toISOString());

          const monthlyTotal = sales?.reduce((sum, s) => sum + (s.total || 0), 0) || 0;
          
          // Alert if branch has less than expected sales (example threshold)
          if (monthlyTotal < 10000) {
            alerts.push({
              id: `branch-${branch.id}`,
              type: 'branch_performance',
              severity: monthlyTotal < 5000 ? 'high' : 'medium',
              title: `${branch.name} - Bajo Rendimiento`,
              description: `Ventas del mes: $${monthlyTotal.toLocaleString('es-MX')}`,
              value: `$${monthlyTotal.toLocaleString('es-MX')}`,
            });
          }
        }
      }
      
      return alerts;
    },
  });

  // Fetch products with negative or low margin
  const { data: marginAlerts } = useQuery({
    queryKey: ['executive-margin-alerts'],
    queryFn: async () => {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, cost_price, sale_price')
        .eq('is_active', true);

      const alerts: Alert[] = [];
      
      products?.forEach(product => {
        const cost = product.cost_price || 0;
        const price = product.sale_price || 0;
        const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
        
        if (margin < 10 && price > 0) {
          alerts.push({
            id: `margin-${product.id}`,
            type: 'negative_margin',
            severity: margin < 0 ? 'high' : 'medium',
            title: product.name,
            description: `Margen: ${margin.toFixed(1)}% (Costo: $${cost}, Venta: $${price})`,
            value: `${margin.toFixed(1)}%`,
          });
        }
      });
      
      return alerts.slice(0, 5); // Top 5 alerts
    },
  });

  // Fetch excess inventory
  const { data: inventoryAlerts } = useQuery({
    queryKey: ['executive-inventory-alerts'],
    queryFn: async () => {
      const { data: inventory } = await supabase
        .from('inventory')
        .select(`
          quantity,
          products!inner(id, name, sale_price)
        `)
        .gt('quantity', 50); // Example threshold for excess

      const alerts: Alert[] = [];
      
      inventory?.forEach((item: any) => {
        const daysOfInventory = 90; // Simulated - would need sales velocity calculation
        if (daysOfInventory > 90) {
          alerts.push({
            id: `inventory-${item.products.id}`,
            type: 'excess_inventory',
            severity: daysOfInventory > 180 ? 'high' : 'medium',
            title: item.products.name,
            description: `${item.quantity} unidades - ${daysOfInventory} días de inventario`,
            value: `${item.quantity} uds`,
          });
        }
      });
      
      return alerts.slice(0, 5);
    },
  });

  // Fetch overdue accounts
  const { data: overdueAlerts } = useQuery({
    queryKey: ['executive-overdue-alerts'],
    queryFn: async () => {
      const { data: overdueSales } = await supabase
        .from('sales')
        .select(`
          id, sale_number, balance, created_at,
          patients(full_name)
        `)
        .eq('is_credit', true)
        .gt('balance', 0);

      const alerts: Alert[] = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      overdueSales?.forEach((sale: any) => {
        const createdAt = new Date(sale.created_at);
        const daysOverdue = differenceInDays(new Date(), createdAt);
        
        if (daysOverdue > 30) {
          alerts.push({
            id: `overdue-${sale.id}`,
            type: 'overdue_account',
            severity: daysOverdue > 60 ? 'high' : 'medium',
            title: sale.patients?.full_name || sale.sale_number,
            description: `Vencido hace ${daysOverdue} días - Saldo: $${sale.balance?.toLocaleString('es-MX')}`,
            value: `$${sale.balance?.toLocaleString('es-MX')}`,
          });
        }
      });
      
      return alerts.slice(0, 5);
    },
  });

  const allAlerts = [
    ...(branchAlerts || []),
    ...(marginAlerts || []),
    ...(inventoryAlerts || []),
    ...(overdueAlerts || []),
  ].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'branch_performance': return Building2;
      case 'negative_margin': return TrendingDown;
      case 'excess_inventory': return Package;
      case 'overdue_account': return Clock;
      default: return AlertTriangle;
    }
  };

  const getAlertColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getSeverityBadge = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return <Badge variant="destructive">Urgente</Badge>;
      case 'medium': return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Atención</Badge>;
      case 'low': return <Badge variant="secondary">Info</Badge>;
    }
  };

  if (allAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-green-600" />
            Alertas Ejecutivas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">✅</div>
            <p>No hay alertas pendientes</p>
            <p className="text-sm">Todo está funcionando correctamente</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Alertas Ejecutivas
          </CardTitle>
          <Badge variant="outline">{allAlerts.length} alertas</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="divide-y">
            {allAlerts.map((alert) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <div 
                  key={alert.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getAlertColor(alert.severity)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{alert.title}</span>
                        {getSeverityBadge(alert.severity)}
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    {alert.value && (
                      <div className="text-right">
                        <span className="font-semibold text-foreground">{alert.value}</span>
                      </div>
                    )}
                  </div>
                  {alert.actionLabel && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2 ml-11"
                      onClick={alert.onAction}
                    >
                      {alert.actionLabel}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
