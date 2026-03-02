import { useState } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ExecutiveDashboard } from '@/components/reports/ExecutiveDashboard';
import { SalesReport } from '@/components/reports/SalesReport';
import { InventoryReport } from '@/components/reports/InventoryReport';
import { PatientAnalytics } from '@/components/reports/PatientAnalytics';
import { FinancialReport } from '@/components/reports/FinancialReport';
import { TrendAnalysis } from '@/components/reports/TrendAnalysis';
import { PromotorReport } from '@/components/reports/PromotorReport';
import { CashRegisterReport } from '@/components/reports/CashRegisterReport';
import { TopProductsReport } from '@/components/reports/TopProductsReport';
import { LabOrdersReport } from '@/components/reports/LabOrdersReport';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Megaphone,
  Wallet,
  Award,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportItem {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
  description: string;
}

const reports: ReportItem[] = [
  { id: 'dashboard', label: 'Dashboard Ejecutivo', icon: LayoutDashboard, component: ExecutiveDashboard, description: 'KPIs y resumen general' },
  { id: 'sales', label: 'Ventas por Período', icon: ShoppingCart, component: SalesReport, description: 'Análisis detallado de ventas' },
  { id: 'top-products', label: 'Productos Top', icon: Award, component: TopProductsReport, description: 'Top 10, 20, 50 más vendidos' },
  { id: 'inventory', label: 'Inventario', icon: Package, component: InventoryReport, description: 'Valorización y rotación' },
  { id: 'patients', label: 'Clientes', icon: Users, component: PatientAnalytics, description: 'Análisis demográfico' },
  { id: 'financial', label: 'Financiero', icon: DollarSign, component: FinancialReport, description: 'Flujo de caja y gastos' },
  { id: 'cash-register', label: 'Caja', icon: Wallet, component: CashRegisterReport, description: 'Movimientos de caja' },
  { id: 'lab-orders', label: 'Órdenes de Trabajo', icon: Eye, component: LabOrdersReport, description: 'Cumplimiento de tiempos' },
  { id: 'trends', label: 'Tendencias', icon: TrendingUp, component: TrendAnalysis, description: 'Análisis histórico' },
  { id: 'promotores', label: 'Promotores', icon: Megaphone, component: PromotorReport, description: 'Comisiones y referidos' },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState('dashboard');

  const currentReport = reports.find(r => r.id === activeReport);
  const ReportComponent = currentReport?.component || ExecutiveDashboard;

  return (
    <RoleGuard allowedRoles={['super_admin', 'gerente']} accessDeniedTitle="Acceso restringido" accessDeniedMessage="No tienes permisos para acceder a Reportes.">
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-border bg-card/50 flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-display font-bold text-foreground">
              Reportes y Análisis
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dashboards ejecutivos y KPIs
            </p>
          </div>
          
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {reports.map((report) => {
                const Icon = report.icon;
                const isActive = activeReport === report.id;
                
                return (
                  <Button
                    key={report.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3 h-auto py-2.5 px-3',
                      isActive && 'bg-secondary'
                    )}
                    onClick={() => setActiveReport(report.id)}
                  >
                    <Icon className={cn(
                      'h-4 w-4 shrink-0',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <div className="flex-1 text-left min-w-0">
                      <div className={cn(
                        'text-sm font-medium truncate',
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {report.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {report.description}
                      </div>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4 text-primary shrink-0" />}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <ScrollArea className="h-full">
            <div className="p-6">
              <ReportComponent />
            </div>
          </ScrollArea>
        </main>
      </div>
    </MainLayout>
    </RoleGuard>
  );
}
