import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Edit,
  Shield,
  Stethoscope,
  User as UserIcon,
  Wallet,
  Building2,
  Filter,
  LayoutGrid,
  List,
  Trash2,
  KeyRound,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { UserForm } from '@/components/users/UserForm';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

// Valid user roles
type AppRole = 'super_admin' | 'admin' | 'gerente' | 'doctor' | 'optometrista' | 'asistente' | 'cobrador' | 'tecnico';

interface Branch {
  id: string;
  name: string;
}

interface UserRoleWithBranch {
  role: AppRole;
  branch_id: string | null;
  branch_name?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  professional_license: string | null;
  username: string | null;
  is_active: boolean;
  default_branch_id: string | null;
  created_at: string;
  roles: AppRole[];
  rolesWithBranches: UserRoleWithBranch[];
  default_branch_name?: string;
}

const roleIcons: Record<string, React.ElementType> = {
  super_admin: Shield,
  admin: Shield,
  gerente: Building2,
  doctor: Stethoscope,
  optometrista: Stethoscope,
  asistente: UserIcon,
  cobrador: Wallet,
  tecnico: UserIcon,
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  gerente: 'Gerente',
  doctor: 'Doctor',
  optometrista: 'Optometrista',
  asistente: 'Asistente',
  cobrador: 'Cobrador',
  tecnico: 'Técnico',
};

// Tecnico personal profile component
function TecnicoProfileView() {
  const { user, profile, updatePassword } = useAuth();
  const { toast } = useToast();
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  
  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    const fetchProfile = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setFullProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: formData.full_name, phone: formData.phone })
      .eq('user_id', user.id);
    
    if (error) {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    } else {
      toast({ title: 'Perfil actualizado', description: 'Tus datos se guardaron correctamente' });
      setEditing(false);
    }
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    setChangingPassword(true);
    const { error } = await updatePassword(newPassword);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contraseña actualizada', description: 'Tu contraseña se cambió correctamente' });
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1">Edita tus datos personales</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Datos Personales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            {editing ? (
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            ) : (
              <p className="text-foreground font-medium">{fullProfile?.full_name || '—'}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            {editing ? (
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            ) : (
              <p className="text-foreground">{fullProfile?.phone || '—'}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <p className="text-muted-foreground">{fullProfile?.email || user?.email || '—'}</p>
          </div>

          <div className="flex gap-2 pt-2">
            {editing ? (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showPasswordChange ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nueva contraseña</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePasswordChange} disabled={changingPassword}>
                  {changingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
                </Button>
                <Button variant="outline" onClick={() => setShowPasswordChange(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => setShowPasswordChange(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Cambiar contraseña
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UsersManagement() {
  const { roles, hasAnyRole } = useAuth();
  const isTecnico = roles.includes('tecnico') && !hasAnyRole(['super_admin', 'admin', 'gerente']);

  // Tecnico: show only personal profile
  if (isTecnico) {
    return (
      <MainLayout>
        <TecnicoProfileView />
      </MainLayout>
    );
  }

  // Admin/gerente/super_admin: full user management
  return <AdminUsersManagement />;
}

function AdminUsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; userName: string; isActive: boolean } | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchBranches();
    fetchUsers();
  }, []);

  const fetchBranches = async () => {
    try {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (data) setBranches(data);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, branches!profiles_default_branch_id_fkey(name)')
        .order('created_at', { ascending: false });

      if (profilesError) {
        if (profilesError.code === 'PGRST301' || profilesError.message?.includes('401')) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        } else if (profilesError.code === '42501' || profilesError.message?.includes('permission')) {
          setError('No tienes permisos para ver los usuarios.');
        } else {
          setError('No se pudieron cargar los usuarios. Intenta de nuevo.');
        }
        setLoading(false);
        return;
      }

      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, branch_id, branches(name)');

      if (rolesError) console.error('Error fetching roles:', rolesError);

      const usersWithRoles: UserProfile[] = (profiles || []).map(profile => {
        const userRoles = (allRoles || []).filter(r => r.user_id === profile.user_id);
        return {
          id: profile.id || '',
          user_id: profile.user_id || '',
          full_name: profile.full_name || 'Sin nombre',
          email: profile.email || '',
          phone: profile.phone,
          address: profile.address,
          birth_date: profile.birth_date,
          professional_license: profile.professional_license,
          username: profile.username,
          is_active: profile.is_active ?? true,
          default_branch_id: profile.default_branch_id,
          created_at: profile.created_at || '',
          default_branch_name: (profile.branches as { name: string } | null)?.name,
          roles: userRoles.map(r => r.role as AppRole),
          rolesWithBranches: userRoles.map(r => ({
            role: r.role as AppRole,
            branch_id: r.branch_id,
            branch_name: (r.branches as { name: string } | null)?.name,
          })),
        };
      });

      setUsers(usersWithRoles);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      setError('Ocurrió un error inesperado al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el estatus del usuario', variant: 'destructive' });
      return;
    }

    toast({ title: 'Usuario actualizado', description: `Usuario ${currentStatus ? 'desactivado' : 'activado'} correctamente` });
    fetchUsers();
  };

  const requestDeleteUser = (userId: string, userName: string, isActive: boolean) => {
    if (!isSuperAdmin()) {
      toast({ title: 'Permiso denegado', description: 'Solo el Super Administrador puede eliminar usuarios', variant: 'destructive' });
      return;
    }
    if (isActive) {
      toast({ title: 'No permitido', description: 'Solo se pueden eliminar usuarios inactivos. Desactívalo primero.', variant: 'destructive' });
      return;
    }
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(code);
    setOtpInput('');
    setDeleteTarget({ userId, userName, isActive });
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    if (otpInput !== generatedOtp) {
      toast({ title: 'Código incorrecto', description: 'El código OTP no coincide.', variant: 'destructive' });
      return;
    }

    setIsDeleting(true);
    try {
      await supabase.from('user_roles').delete().eq('user_id', deleteTarget.userId);
      const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', deleteTarget.userId);

      if (profileError) {
        toast({ title: 'Error', description: 'No se pudo eliminar el usuario', variant: 'destructive' });
        return;
      }

      toast({ title: 'Usuario eliminado', description: `"${deleteTarget.userName}" ha sido eliminado del sistema` });
      setDeleteTarget(null);
      fetchUsers();
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.roles.includes(filterRole as AppRole);
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.is_active) ||
      (filterStatus === 'inactive' && !user.is_active);
    const matchesBranch = filterBranch === 'all' || 
      user.default_branch_id === filterBranch ||
      user.rolesWithBranches.some(r => r.branch_id === filterBranch);

    return matchesSearch && matchesRole && matchesStatus && matchesBranch;
  });

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return '??';
    return name.split(' ').filter(n => n.length > 0).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
    doctors: users.filter(u => u.roles.includes('doctor')).length,
  };

  return (
    <MainLayout>
      <RoleGuard allowedRoles={['admin', 'gerente']}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Gestión de Usuarios
              </h1>
              <p className="text-muted-foreground mt-1">
                {stats.total} usuarios · {stats.active} activos · {stats.doctors} doctores
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Usuario
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                  <SelectItem value="asistente">Asistente</SelectItem>
                  <SelectItem value="cobrador">Cobrador</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-[160px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex border rounded-lg overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className="rounded-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('table')}
                  className="rounded-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Users content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-destructive/30">
              <div className="p-3 rounded-full bg-destructive/10 mb-4">
                <Users className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Error al cargar usuarios</h3>
              <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
              <Button onClick={fetchUsers} variant="outline">Reintentar</Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-border">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {users.length === 0 ? 'No hay usuarios registrados.' : 'No hay usuarios que coincidan con los filtros'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`bg-card rounded-xl border p-5 hover:shadow-md transition-shadow ${
                    user.is_active ? 'border-border' : 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className={`h-12 w-12 border-2 ${user.is_active ? 'border-border' : 'border-destructive/30'}`}>
                        <AvatarFallback className={`${user.is_active ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'} font-medium`}>
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{user.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingUser(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleUserStatus(user.user_id, user.is_active)}>
                          {user.is_active ? (
                            <><UserX className="h-4 w-4 mr-2" />Desactivar</>
                          ) : (
                            <><UserCheck className="h-4 w-4 mr-2" />Activar</>
                          )}
                        </DropdownMenuItem>
                        {isSuperAdmin() && !user.is_active && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => requestDeleteUser(user.user_id, user.full_name, user.is_active)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {user.rolesWithBranches.map((r, i) => {
                      const Icon = roleIcons[r.role] || UserIcon;
                      return (
                        <Badge key={i} variant="secondary" className="text-xs gap-1">
                          <Icon className="h-3 w-3" />
                          {roleLabels[r.role] || r.role}
                          {r.branch_name && <span className="text-muted-foreground">· {r.branch_name}</span>}
                        </Badge>
                      );
                    })}
                    {user.roles.length === 0 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Sin rol</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{user.default_branch_name || 'Sin sucursal'}</span>
                    <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-[10px]">
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {roleLabels[role] || role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{user.default_branch_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'destructive'} className="text-[10px]">
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleUserStatus(user.user_id, user.is_active)}>
                              {user.is_active ? <><UserX className="h-4 w-4 mr-2" />Desactivar</> : <><UserCheck className="h-4 w-4 mr-2" />Activar</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <UserForm
              branches={branches}
              onSuccess={() => {
                setShowCreateDialog(false);
                fetchUsers();
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <UserForm
                user={editingUser}
                branches={branches}
                onSuccess={() => {
                  setEditingUser(null);
                  fetchUsers();
                }}
                onCancel={() => setEditingUser(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Eliminar usuario
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>¿Estás seguro de eliminar a <strong>{deleteTarget?.userName}</strong>?</p>
                <p className="text-sm">Para confirmar, ingresa el código: <strong className="text-foreground text-lg tracking-widest">{generatedOtp}</strong></p>
                <Input
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Ingresa el código"
                  maxLength={4}
                  className="text-center text-lg tracking-widest"
                />
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <Button variant="destructive" onClick={confirmDeleteUser} disabled={isDeleting || otpInput.length < 4}>
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </RoleGuard>
    </MainLayout>
  );
}
