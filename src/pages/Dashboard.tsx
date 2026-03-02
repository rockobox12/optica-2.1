import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { MonthlySalesChart } from '@/components/dashboard/MonthlySalesChart';
import { TopProductsChart } from '@/components/dashboard/TopProductsChart';
import { SalesByCategoryChart } from '@/components/dashboard/SalesByCategoryChart';
import { SalesByBranchChart } from '@/components/dashboard/SalesByBranchChart';
import { BirthdayGreeting } from '@/components/birthday/BirthdayGreeting';
import { CreditWidget } from '@/components/dashboard/CreditWidget';
import { PromotorWidget } from '@/components/dashboard/PromotorWidget';
import { DeliveryWidget } from '@/components/dashboard/DeliveryWidget';
import { DeliveryAIWidget } from '@/components/dashboard/DeliveryAIWidget';
import { DashboardDeliveries } from '@/components/dashboard/DashboardDeliveries';
import { ScheduledPaymentsWidget } from '@/components/dashboard/ScheduledPaymentsWidget';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ModuleErrorFallback } from '@/components/error/ModuleErrorFallback';
import { ClinicalExecutivePanel } from '@/components/dashboard/ClinicalExecutivePanel';
import { GlobalExecutivePanel } from '@/components/dashboard/GlobalExecutivePanel';
import { VersionWidget } from '@/components/dashboard/VersionWidget';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranchContext';
import { useAuthDebug } from '@/hooks/useAuthDebug';
import { useDeliveryAlerts } from '@/hooks/useDeliveryAlerts';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  Eye,
} from 'lucide-react';

export default function Dashboard() {
  const { profile, roles, hasAnyRole } = useAuth();
  const { activeBranch, activeBranchId } = useBranch();
  useDeliveryAlerts();
  useAuthDebug('Dashboard');

  const m = useDashboardMetrics();

  const isTecnico = roles.includes('tecnico') && !hasAnyRole(['super_admin', 'admin', 'gerente']);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '¡Buenos días';
    if (hour < 18) return '¡Buenas tardes';
    return '¡Buenas noches';
  };

  const firstName = profile?.fullName?.split(' ')[0] || '';

  const fmtCurrency = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  const salesChangeText = m.salesChangePercent !== null
    ? `${m.salesChangePercent >= 0 ? '+' : ''}${m.salesChangePercent.toFixed(1)}% vs ayer`
    : 'Sin ventas ayer';

  // Tecnico: Only show daily KPIs, no charts, no executive panels
  if (isTecnico) {
    return (
      <MainLayout>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
            {getGreeting()}{firstName ? `, ${firstName}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Resumen del día
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Ventas del Día"
            value={m.loading ? '...' : fmtCurrency(m.salesToday)}
            change={m.loading ? '' : salesChangeText}
            changeType={m.salesChangePercent !== null && m.salesChangePercent >= 0 ? 'positive' : m.salesChangePercent !== null ? 'negative' : 'neutral'}
            icon={DollarSign}
            iconColor="bg-accent/10 text-accent"
            delay={0}
          />
          <StatCard
            title="Clientes Atendidos"
            value={m.loading ? '...' : `${m.clientsToday}`}
            change={m.loading ? '' : m.clientsToday === 0 ? 'Sin clientes atendidos hoy' : `+${m.newClientsToday} nuevos clientes`}
            changeType={m.newClientsToday > 0 ? 'positive' : 'neutral'}
            icon={Users}
            iconColor="bg-primary/10 text-primary"
            delay={1}
          />
          <StatCard
            title="Órdenes Pendientes"
            value={m.loading ? '...' : `${m.pendingOrders}`}
            change={m.loading ? '' : `${m.readyForDelivery} listas para entrega`}
            changeType="neutral"
            icon={ShoppingCart}
            iconColor="bg-warning/10 text-warning"
            delay={2}
          />
          <StatCard
            title="Exámenes Hoy"
            value={m.loading ? '...' : `${m.examsToday}`}
            change={m.loading ? '' : m.examsToday === 0 ? 'Sin exámenes hoy' : 'Programados hoy'}
            changeType="neutral"
            icon={Eye}
            iconColor="bg-success/10 text-success"
            delay={3}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ErrorBoundary fallback={null}>
        <BirthdayGreeting />
      </ErrorBoundary>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí está el resumen de hoy para <span className="font-medium text-foreground">
            {activeBranchId === 'all' ? 'Todas las sucursales' : activeBranch?.name || 'Sucursal'}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          title="Ventas del Día"
          value={m.loading ? '...' : fmtCurrency(m.salesToday)}
          change={m.loading ? '' : salesChangeText}
          changeType={m.salesChangePercent !== null && m.salesChangePercent >= 0 ? 'positive' : m.salesChangePercent !== null ? 'negative' : 'neutral'}
          icon={DollarSign}
          iconColor="bg-accent/10 text-accent"
          delay={0}
        />
        <StatCard
          title="Clientes Atendidos"
          value={m.loading ? '...' : `${m.clientsToday}`}
          change={m.loading ? '' : m.clientsToday === 0 ? 'Sin clientes atendidos hoy' : `+${m.newClientsToday} nuevos clientes`}
          changeType={m.newClientsToday > 0 ? 'positive' : 'neutral'}
          icon={Users}
          iconColor="bg-primary/10 text-primary"
          delay={1}
        />
        <StatCard
          title="Órdenes Pendientes"
          value={m.loading ? '...' : `${m.pendingOrders}`}
          change={m.loading ? '' : `${m.readyForDelivery} listas para entrega`}
          changeType="neutral"
          icon={ShoppingCart}
          iconColor="bg-warning/10 text-warning"
          delay={2}
        />
        <StatCard
          title="Exámenes Hoy"
          value={m.loading ? '...' : `${m.examsToday}`}
          change={m.loading ? '' : m.examsToday === 0 ? 'Sin exámenes hoy' : 'Programados hoy'}
          changeType="neutral"
          icon={Eye}
          iconColor="bg-success/10 text-success"
          delay={3}
        />
      </div>
      {/* Version Widget - For admin */}
      <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
        <ErrorBoundary fallback={null}>
          <div className="mb-6">
            <VersionWidget />
          </div>
        </ErrorBoundary>
      </RoleGuard>

      {/* Global Executive Panel - For admin */}
      <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
        <ErrorBoundary fallback={null}>
          <div className="mb-6">
            <GlobalExecutivePanel />
          </div>
        </ErrorBoundary>
      </RoleGuard>

      {/* Today's Deliveries - Full operational section */}
      <RoleGuard allowedRoles={['admin', 'doctor', 'asistente']} showAccessDenied={false}>
        <ErrorBoundary fallback={null}>
          <div className="mb-6">
            <DashboardDeliveries />
          </div>
        </ErrorBoundary>
      </RoleGuard>

      {/* Clinical Executive Panel - For admin and doctor */}
      <RoleGuard allowedRoles={['admin', 'doctor']} showAccessDenied={false}>
        <ErrorBoundary fallback={null}>
          <div className="mb-6">
            <ClinicalExecutivePanel />
          </div>
        </ErrorBoundary>
      </RoleGuard>

      {/* Charts Section - Professional visualizations */}
      <div className="mb-8">
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          Análisis y Métricas
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ErrorBoundary fallback={<ModuleErrorFallback title="Error en gráfico" />}>
            <MonthlySalesChart />
          </ErrorBoundary>
          
          <ErrorBoundary fallback={<ModuleErrorFallback title="Error en gráfico" />}>
            <TopProductsChart />
          </ErrorBoundary>
          
          <ErrorBoundary fallback={<ModuleErrorFallback title="Error en gráfico" />}>
            <SalesByCategoryChart />
          </ErrorBoundary>
          
          <ErrorBoundary fallback={<ModuleErrorFallback title="Error en gráfico" />}>
            <SalesByBranchChart />
          </ErrorBoundary>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main chart - Weekly */}
        <div className="lg:col-span-2">
          <ErrorBoundary fallback={<ModuleErrorFallback title="Error en gráfico" description="No se pudo cargar el gráfico de ventas." />}>
            <SalesChart />
          </ErrorBoundary>
        </div>

        {/* Quick actions */}
        <div className="space-y-6">
          <ErrorBoundary fallback={<ModuleErrorFallback title="Error en acciones" />}>
            <QuickActions />
          </ErrorBoundary>
          
          {/* Delivery Widget - For admin, doctor, asistente */}
          <RoleGuard allowedRoles={['admin', 'doctor', 'asistente']} showAccessDenied={false}>
            <ErrorBoundary fallback={<ModuleErrorFallback title="Error en entregas" />}>
              <DeliveryWidget />
            </ErrorBoundary>
          </RoleGuard>
          
          {/* Delivery AI Widget - For admin, doctor, asistente */}
          <RoleGuard allowedRoles={['admin', 'doctor', 'asistente']} showAccessDenied={false}>
            <ErrorBoundary fallback={<ModuleErrorFallback title="Error en IA entregas" />}>
              <DeliveryAIWidget />
            </ErrorBoundary>
          </RoleGuard>
          
          {/* Credit Widget - Only for admin and cobrador */}
          <RoleGuard allowedRoles={['admin', 'cobrador']} showAccessDenied={false}>
            <ErrorBoundary fallback={<ModuleErrorFallback title="Error en créditos" />}>
              <CreditWidget />
            </ErrorBoundary>
          </RoleGuard>
          
          {/* Scheduled Payments Widget - For admin, cobrador, asistente */}
          <RoleGuard allowedRoles={['admin', 'cobrador', 'asistente']} showAccessDenied={false}>
            <ErrorBoundary fallback={<ModuleErrorFallback title="Error en cobros programados" />}>
              <ScheduledPaymentsWidget />
            </ErrorBoundary>
          </RoleGuard>
          
          {/* Promotor Widget - Only for admin */}
          <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
            <ErrorBoundary fallback={<ModuleErrorFallback title="Error en promotores" />}>
              <PromotorWidget />
            </ErrorBoundary>
          </RoleGuard>
        </div>
      </div>

      {/* Recent sales */}
      <div className="mt-6">
        <ErrorBoundary fallback={<ModuleErrorFallback title="Error en ventas recientes" description="No se pudieron cargar las ventas recientes." />}>
          <RecentSales />
        </ErrorBoundary>
      </div>
    </MainLayout>
  );
}
