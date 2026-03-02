import { useState } from 'react';
import { Search, Building2, ShieldCheck, Globe, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { useBranch } from '@/hooks/useBranchContext';
import { useAdminAuthorization } from '@/hooks/useAdminAuthorization';
import { NotificationDropdown } from '@/components/notifications';
import { Badge } from '@/components/ui/badge';
import { useIsTablet } from '@/hooks/use-mobile';

interface HeaderProps {
  sidebarCollapsed?: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const { user } = useAuth();
  const { isAdmin, pendingCount } = useAdminAuthorization();
  const { branches, activeBranchId, activeBranch, canSwitchBranch, setActiveBranch } = useBranch();
  const isTablet = useIsTablet();
  const [searchExpanded, setSearchExpanded] = useState(false);

  const getInitials = () => {
    if (!user?.email) return 'US';
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-card border-b border-border transition-all duration-300 ${
        sidebarCollapsed ? 'left-[70px]' : 'left-[260px]'
      }`}
    >
      <div className="flex h-full items-center justify-between px-4 lg:px-6 gap-2">
        {/* Search - compact on tablet */}
        <div className={`relative ${isTablet ? 'w-48' : 'w-80'} transition-all`}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isTablet ? "Buscar..." : "Buscar clientes, productos..."}
            className="pl-10 bg-secondary/50 border-0 focus-visible:ring-1 h-10"
          />
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2 lg:gap-4">
          {/* Branch selector */}
          {canSwitchBranch ? (
            <Select value={activeBranchId} onValueChange={setActiveBranch}>
              <SelectTrigger className={`${isTablet ? 'w-[140px]' : 'w-[200px]'} bg-secondary/50 border-0 h-10`}>
                {activeBranchId === 'all' ? (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-medium truncate">{isTablet ? 'Todas' : 'Todas las sucursales'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <SelectValue placeholder="Sucursal" />
                  </div>
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3" />
                    Todas las sucursales
                  </div>
                </SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3" />
                      {branch.name}
                      {branch.is_main && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">Principal</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-md text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[120px] lg:max-w-none">{activeBranch?.name || 'Sin sucursal'}</span>
            </div>
          )}

          {/* Authorization requests badge for admins */}
          {isAdmin && pendingCount > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10">
                  <ShieldCheck className="h-5 w-5 text-warning" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-destructive-foreground animate-pulse">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-warning" />
                    <h4 className="font-medium text-sm">Solicitudes Pendientes</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tienes {pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''} de autorización pendiente{pendingCount !== 1 ? 's' : ''}.
                  </p>
                  <Button variant="outline" size="sm" className="w-full"
                    onClick={() => { window.location.href = '/configuracion?tab=autorizaciones'; }}>
                    Ver Solicitudes
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Notifications */}
          <NotificationDropdown />

          {/* User */}
          <div className="flex items-center gap-2 lg:gap-3">
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {!isTablet && (
              <div className="hidden md:block">
                <p className="text-sm font-medium">{user?.email?.split('@')[0] || 'Usuario'}</p>
                <p className="text-xs text-muted-foreground">Usuario</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
