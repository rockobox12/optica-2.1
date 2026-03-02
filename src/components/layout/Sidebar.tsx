import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home, ShoppingCart, Eye, Wallet, BarChart3, Building2, Settings,
  ChevronLeft, ChevronRight, LogOut, Glasses, Shield, UserCog, CalendarDays,
  Truck, Gift, CreditCard, Brain, Megaphone, DollarSign, Package, FileText,
  Calculator, Banknote, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDeliveryBadgeCount } from '@/hooks/useDeliveryAlerts';

type AppRole = 'super_admin' | 'admin' | 'gerente' | 'doctor' | 'optometrista' | 'asistente' | 'cobrador' | 'tecnico';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: AppRole[];
  showDeliveryBadge?: boolean;
}

// Menu items with role-based visibility
// tecnico: Inicio, Agenda, Expediente, Ventas, Herramienta Optometría, Caja y Bancos, Usuario
// gerente: Same as tecnico + branch-scoped
// admin: Everything + config/admin
// super_admin: Everything, all branches
const navItems: NavItem[] = [
  { icon: Home, label: 'Inicio', href: '/' },
  { icon: Building2, label: 'Dashboard Corporativo', href: '/dashboard-corporativo', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
  { icon: FileText, label: 'Expediente', href: '/expediente' },
  { icon: Calculator, label: 'Herramienta Optometría', href: '/herramienta-optometria' },
  { icon: ShoppingCart, label: 'Ventas', href: '/ventas' },
  { icon: Package, label: 'Laboratorio', href: '/laboratorio', roles: ['super_admin', 'admin', 'gerente', 'doctor', 'optometrista', 'asistente'] },
  { icon: Brain, label: 'IA Oportunidades', href: '/oportunidades-clinicas', roles: ['super_admin', 'admin', 'gerente', 'doctor', 'optometrista'] },
  { icon: Glasses, label: 'Inventario', href: '/inventario', roles: ['super_admin', 'admin', 'gerente', 'doctor', 'asistente'] },
  { icon: Truck, label: 'Compras', href: '/compras', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: Banknote, label: 'Cobro Rápido', href: '/cobro-rapido', roles: ['super_admin', 'admin', 'gerente', 'cobrador', 'asistente'] },
  { icon: CreditCard, label: 'Crédito y Cobranza', href: '/credito-cobranza', roles: ['super_admin', 'admin', 'gerente', 'cobrador'] },
  { icon: Wallet, label: 'Caja y Bancos', href: '/caja' },
  { icon: Gift, label: 'Marketing', href: '/marketing', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: BarChart3, label: 'Reportes', href: '/reportes', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: Megaphone, label: 'Promotores', href: '/promotores', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: DollarSign, label: 'Comisiones', href: '/comisiones', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: Package, label: 'Comercial', href: '/comercial', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: Building2, label: 'Sucursales', href: '/sucursales', roles: ['super_admin', 'admin'] },
  { icon: UserCog, label: 'Usuarios', href: '/usuarios' },
  { icon: Shield, label: 'Bitácora', href: '/bitacora', roles: ['super_admin', 'admin'] },
  { icon: Settings, label: 'Configuración', href: '/configuracion', roles: ['super_admin', 'admin'] },
];

interface SidebarProps {
  forceCollapsed?: boolean;
}

export function Sidebar({ forceCollapsed }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(forceCollapsed ?? false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, hasAnyRole, roles } = useAuth();
  const { toast } = useToast();
  const { count: deliveryCount, canSeeDeliveries } = useDeliveryBadgeCount();

  const isTecnico = roles.includes('tecnico') && !hasAnyRole(['super_admin', 'admin', 'gerente']);

  // Sync with forceCollapsed prop (tablet mode)
  useEffect(() => {
    if (forceCollapsed !== undefined) {
      setCollapsed(forceCollapsed);
    }
  }, [forceCollapsed]);

  const isForced = forceCollapsed === true;

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión correctamente' });
    navigate('/auth');
  };

  // Tecnico: only show specific menu items
  const tecnicoAllowedHrefs = ['/', '/agenda', '/expediente', '/ventas', '/herramienta-optometria', '/caja', '/usuarios'];

  const visibleNavItems = navItems.filter(item => {
    // If tecnico, restrict to allowed items only
    if (isTecnico) {
      return tecnicoAllowedHrefs.includes(item.href);
    }
    // Otherwise use role-based filtering
    if (!item.roles || item.roles.length === 0) return true;
    return hasAnyRole(item.roles);
  });

  const effectiveCollapsed = collapsed;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 ease-in-out border-r border-sidebar-border',
        effectiveCollapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary flex-shrink-0">
            <Eye className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!effectiveCollapsed && (
            <div className="animate-fade-in">
              <h1 className="text-sm font-display font-bold text-sidebar-foreground">Óptica Istmeña</h1>
              <p className="text-xs text-sidebar-foreground/60">Suite Admin</p>
            </div>
          )}
        </Link>
        {!isForced && (
          <Button
            variant="ghost" size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          const showBadge = item.showDeliveryBadge && canSeeDeliveries && deliveryCount > 0;
          
          const linkContent = (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 relative touch-manipulation',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70'
              )}
            >
              <div className="relative flex-shrink-0">
                <item.icon className={cn('h-5 w-5', isActive && 'text-sidebar-primary')} />
                {showBadge && effectiveCollapsed && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-accent text-[9px] font-bold flex items-center justify-center text-accent-foreground">
                    {deliveryCount > 9 ? '9+' : deliveryCount}
                  </span>
                )}
              </div>
              {!effectiveCollapsed && (
                <span className="text-sm animate-fade-in flex-1 truncate">{item.label}</span>
              )}
              {showBadge && !effectiveCollapsed && (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5 bg-accent text-accent-foreground flex-shrink-0">
                  <Package className="h-3 w-3 mr-0.5" />
                  {deliveryCount}
                </Badge>
              )}
            </Link>
          );

          // Show tooltip on collapsed mode
          if (effectiveCollapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* User section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            'w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
            effectiveCollapsed && 'justify-center'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!effectiveCollapsed && <span className="text-sm">Cerrar Sesión</span>}
        </Button>
      </div>
    </aside>
  );
}
