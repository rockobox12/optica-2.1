import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, ShoppingCart, Search, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const actions = [
  {
    icon: Eye,
    label: 'Nuevo Examen',
    description: 'Examen visual',
    color: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    href: '/expediente?action=new-exam',
  },
  {
    icon: UserPlus,
    label: 'Nuevo Paciente',
    description: 'Registrar paciente',
    color: 'bg-accent hover:bg-accent/90 text-accent-foreground',
    href: '/expediente?action=new',
  },
  {
    icon: ShoppingCart,
    label: 'Nueva Venta',
    description: 'Iniciar venta',
    color: 'bg-success hover:bg-success/90 text-success-foreground',
    href: '/ventas',
  },
  {
    icon: Search,
    label: 'Expediente',
    description: 'Buscar paciente',
    color: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
    href: '/expediente',
  },
];

// Cobro Rápido action for authorized roles
const cobroRapidoAction = {
  icon: Banknote,
  label: 'Cobro Rápido',
  description: 'Registrar abono',
  color: 'bg-warning hover:bg-warning/90 text-warning-foreground',
  href: '/cobro-rapido',
  roles: ['admin', 'cobrador', 'asistente'] as const,
};

export function QuickActions() {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  
  // Build actions list with conditional cobro rápido
  const canSeeCobro = hasAnyRole(['admin', 'cobrador', 'asistente']);
  const visibleActions = canSeeCobro ? [...actions, cobroRapidoAction] : actions;
  
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="font-display font-semibold text-lg mb-4">Acciones Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {visibleActions.map((action) => (
          <Button
            key={action.label}
            variant="ghost"
            className={`h-auto flex-col gap-2 p-4 ${action.color}`}
            onClick={() => navigate(action.href)}
          >
            <action.icon className="h-5 w-5" />
            <div className="text-center">
              <p className="text-sm font-medium">{action.label}</p>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
