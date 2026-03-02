import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Power,
  Users,
  MapPin,
  Phone,
  Package,
  ShoppingCart,
  Wallet,
  LayoutGrid,
  List,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BranchForm } from '@/components/branches/BranchForm';
import { BranchUsers } from '@/components/branches/BranchUsers';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export default function BranchesManagement() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [managingUsersBranch, setManagingUsersBranch] = useState<Branch | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    
    // Fetch branches
    const { data: branchesData, error: branchesError } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: false });

    if (branchesError) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las sucursales',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Get user counts per branch
    const { data: userCounts } = await supabase
      .from('profiles')
      .select('default_branch_id');

    const countsMap: Record<string, number> = {};
    (userCounts || []).forEach(u => {
      if (u.default_branch_id) {
        countsMap[u.default_branch_id] = (countsMap[u.default_branch_id] || 0) + 1;
      }
    });

    const branchesWithCounts = (branchesData || []).map(b => ({
      ...b,
      user_count: countsMap[b.id] || 0,
    }));

    setBranches(branchesWithCounts);
    setLoading(false);
  };

  const toggleBranchStatus = async (branchId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('branches')
      .update({ is_active: !currentStatus })
      .eq('id', branchId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estatus de la sucursal',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Sucursal actualizada',
      description: `Sucursal ${currentStatus ? 'desactivada' : 'activada'} correctamente`,
    });

    fetchBranches();
  };

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = 
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (branch.address && branch.address.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && branch.is_active) ||
      (filterStatus === 'inactive' && !branch.is_active);

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: branches.length,
    active: branches.filter(b => b.is_active).length,
    inactive: branches.filter(b => !b.is_active).length,
    totalUsers: branches.reduce((acc, b) => acc + (b.user_count || 0), 0),
  };

  return (
    <MainLayout>
      <RoleGuard allowedRoles={['admin']}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Gestión de Sucursales
              </h1>
              <p className="text-muted-foreground mt-1">
                {stats.total} sucursales · {stats.active} activas · {stats.totalUsers} empleados
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Sucursal
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Sucursales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Power className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Activas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Users className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Empleados</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Package className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">—</p>
                    <p className="text-xs text-muted-foreground">Productos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estatus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="inactive">Inactivas</SelectItem>
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

          {/* Branches content */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-border">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No hay sucursales que coincidan con los filtros</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBranches.map((branch) => (
                <Card
                  key={branch.id}
                  className={`hover:shadow-md transition-shadow ${
                    !branch.is_active && 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${branch.is_active ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                          <Building2 className={`h-5 w-5 ${branch.is_active ? 'text-primary' : 'text-destructive'}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{branch.name}</CardTitle>
                          <Badge variant={branch.is_active ? 'default' : 'destructive'} className="mt-1">
                            {branch.is_active ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingBranch(branch)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setManagingUsersBranch(branch)}>
                            <Users className="h-4 w-4 mr-2" />
                            Gestionar Usuarios
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => toggleBranchStatus(branch.id, branch.is_active)}
                            className={branch.is_active ? 'text-destructive' : 'text-green-600'}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {branch.is_active ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {branch.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{branch.phone}</span>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold">{branch.user_count || 0}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Empleados</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold">—</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Productos</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1">
                          <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold">—</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Ventas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Empleados</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead className="w-[80px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBranches.map((branch) => (
                    <TableRow key={branch.id} className={!branch.is_active ? 'bg-destructive/5' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${branch.is_active ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                            <Building2 className={`h-4 w-4 ${branch.is_active ? 'text-primary' : 'text-destructive'}`} />
                          </div>
                          <span className="font-medium">{branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {branch.address || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {branch.phone || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {branch.user_count || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={branch.is_active ? 'default' : 'destructive'}>
                          {branch.is_active ? 'Activa' : 'Inactiva'}
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
                            <DropdownMenuItem onClick={() => setEditingBranch(branch)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setManagingUsersBranch(branch)}>
                              <Users className="h-4 w-4 mr-2" />
                              Gestionar Usuarios
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleBranchStatus(branch.id, branch.is_active)}
                              className={branch.is_active ? 'text-destructive' : 'text-green-600'}
                            >
                              <Power className="h-4 w-4 mr-2" />
                              {branch.is_active ? 'Desactivar' : 'Activar'}
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

        {/* Create Branch Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Sucursal</DialogTitle>
            </DialogHeader>
            <BranchForm
              onSuccess={() => {
                setShowCreateDialog(false);
                fetchBranches();
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Branch Dialog */}
        <Dialog open={!!editingBranch} onOpenChange={(open) => !open && setEditingBranch(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Sucursal</DialogTitle>
            </DialogHeader>
            {editingBranch && (
              <BranchForm
                branch={editingBranch}
                onSuccess={() => {
                  setEditingBranch(null);
                  fetchBranches();
                }}
                onCancel={() => setEditingBranch(null)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Manage Users Dialog */}
        <Dialog open={!!managingUsersBranch} onOpenChange={(open) => !open && setManagingUsersBranch(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Usuarios de {managingUsersBranch?.name}
              </DialogTitle>
            </DialogHeader>
            {managingUsersBranch && (
              <BranchUsers
                branch={managingUsersBranch}
                onClose={() => {
                  setManagingUsersBranch(null);
                  fetchBranches();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </RoleGuard>
    </MainLayout>
  );
}
