import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home, ShoppingCart, Users, Eye, Menu, X, LogOut, CalendarDays, Package,
  BarChart3, Wallet, Settings, Banknote, Building2, Brain, CreditCard,
  Truck, Gift, Megaphone, DollarSign, Calculator, Shield, UserCog, Glasses,
  FileText, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { NotificationDropdown } from '@/components/notifications';
import { motion } from 'framer-motion';

type AppRole = 'super_admin' | 'admin' | 'gerente' | 'doctor' | 'optometrista' | 'asistente' | 'cobrador' | 'tecnico';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  roles?: AppRole[];
}

const allNavItems: NavItem[] = [
  { icon: Home, label: 'Inicio', href: '/' },
  { icon: Building2, label: 'Dashboard Corporativo', href: '/dashboard-corporativo', roles: ['super_admin', 'admin', 'gerente'] },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
  { icon: FileText, label: 'Expediente', href: '/expediente' },
  { icon: Calculator, label: 'Optometría', href: '/herramienta-optometria' },
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

const bottomNavItems: NavItem[] = [
  { icon: Home, label: 'Inicio', href: '/' },
  { icon: ShoppingCart, label: 'Ventas', href: '/ventas' },
  { icon: Users, label: 'Clientes', href: '/expediente' },
  { icon: CalendarDays, label: 'Agenda', href: '/agenda' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, hasAnyRole, roles } = useAuth();
  const { toast } = useToast();

  const isTecnico = roles.includes('tecnico') && !hasAnyRole(['super_admin', 'admin', 'gerente']);
  const tecnicoAllowedHrefs = ['/', '/agenda', '/expediente', '/ventas', '/herramienta-optometria', '/caja', '/usuarios'];

  const handleSignOut = async () => {
    await signOut();
    toast({ title: 'Sesión cerrada', description: 'Has cerrado sesión correctamente' });
    navigate('/auth');
  };

  const isActive = (href: string) => location.pathname === href;

  const filterByRole = (items: NavItem[]) =>
    items.filter(item => {
      if (isTecnico) {
        return tecnicoAllowedHrefs.includes(item.href);
      }
      if (!item.roles || item.roles.length === 0) return true;
      return hasAnyRole(item.roles);
    });

  const visibleItems = filterByRole(allNavItems);

  return (
    <>
      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-12 bg-background/95 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:hidden safe-area-top">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 touch-manipulation">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0" hideCloseButton>
            <SheetHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                    <Eye className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <SheetTitle className="text-base font-display">Óptica Istmeña</SheetTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-10 w-10">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </SheetHeader>

            <nav className="flex-1 overflow-y-auto py-3 h-[calc(100vh-140px)] scroll-touch">
              <div className="space-y-0.5 px-2">
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 transition-all duration-200',
                      'active:scale-95 touch-manipulation min-h-[44px]',
                      isActive(item.href)
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/70 hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="p-4 border-t border-border safe-area-bottom">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 min-h-[44px]"
              >
                <LogOut className="h-5 w-5" />
                <span>Cerrar Sesión</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Eye className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-sm">Óptica Istmeña</span>
        </Link>

        <div className="flex items-center gap-1">
          <NotificationDropdown />
        </div>
      </header>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border sm:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-13 px-2">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg transition-all duration-200',
                  'active:scale-90 touch-manipulation min-h-[48px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <motion.div
                  initial={false}
                  animate={{ scale: active ? 1.1 : 1, y: active ? -2 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <item.icon className={cn('h-5 w-5', active && 'text-primary')} />
                </motion.div>
                <span className={cn('text-[10px] font-medium', active && 'text-primary')}>
                  {item.label}
                </span>
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute bottom-1 w-8 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
