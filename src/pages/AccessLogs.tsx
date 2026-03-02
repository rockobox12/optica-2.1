import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Shield, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  KeyRound,
  Clock,
  User,
  Search,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type AccessEventType = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'session_expired'
  | 'account_locked'
  | 'permission_denied';

interface AccessLog {
  id: string;
  email: string;
  event_type: AccessEventType;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, string | number | boolean | null> | null;
}

const eventTypeConfig: Record<AccessEventType, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  login_success: { label: 'Inicio de sesión', icon: LogIn, variant: 'default' },
  login_failed: { label: 'Login fallido', icon: AlertTriangle, variant: 'destructive' },
  logout: { label: 'Cierre de sesión', icon: LogOut, variant: 'secondary' },
  password_reset_requested: { label: 'Reset solicitado', icon: KeyRound, variant: 'outline' },
  password_reset_completed: { label: 'Contraseña cambiada', icon: KeyRound, variant: 'default' },
  session_expired: { label: 'Sesión expirada', icon: Clock, variant: 'secondary' },
  account_locked: { label: 'Cuenta bloqueada', icon: Shield, variant: 'destructive' },
  permission_denied: { label: 'Permiso denegado', icon: Shield, variant: 'destructive' },
};

export default function AccessLogs() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('access_logs')
      .select('id, email, event_type, user_agent, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as AccessLog[]);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || log.event_type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <MainLayout>
      <RoleGuard allowedRoles={['admin']}>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Bitácora de Accesos
            </h1>
            <p className="text-muted-foreground mt-1">
              Registro de todas las actividades de autenticación del sistema
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los eventos</SelectItem>
                <SelectItem value="login_success">Inicios de sesión</SelectItem>
                <SelectItem value="login_failed">Logins fallidos</SelectItem>
                <SelectItem value="logout">Cierres de sesión</SelectItem>
                <SelectItem value="password_reset_requested">Reset solicitado</SelectItem>
                <SelectItem value="account_locked">Cuentas bloqueadas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchLogs}>
              Actualizar
            </Button>
          </div>

          {/* Logs table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay registros de acceso</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50 border-b border-border">
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                        Fecha/Hora
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                        Usuario
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                        Evento
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                        Detalles
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredLogs.map((log) => {
                      const config = eventTypeConfig[log.event_type];
                      const Icon = config.icon;
                      
                      return (
                        <tr key={log.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss", { locale: es })}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{log.email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={config.variant} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 ? (
                              <span className="text-xs">
                                {JSON.stringify(log.metadata)}
                              </span>
                            ) : (
                              <span className="text-xs italic">Sin detalles</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </RoleGuard>
    </MainLayout>
  );
}
