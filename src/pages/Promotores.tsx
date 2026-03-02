import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Megaphone,
  Plus,
  Search,
  MoreHorizontal,
  UserCheck,
  UserX,
  Edit,
  Phone,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { PromotorForm } from '@/components/promotores/PromotorForm';

interface Promotor {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
}

// ID fijo del promotor interno "Óptica Istmeña (Paciente llegó solo)"
const DEFAULT_PROMOTOR_ID = '00000000-0000-0000-0000-000000000001';

export default function Promotores() {
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPromotor, setEditingPromotor] = useState<Promotor | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPromotores();
  }, []);

  const fetchPromotores = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('promotores')
        .select('*')
        .order('nombre_completo');

      if (fetchError) {
        if (fetchError.code === 'PGRST301' || fetchError.message?.includes('401')) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
        } else if (fetchError.code === '42501' || fetchError.message?.includes('permission')) {
          setError('No tienes permisos para ver los promotores.');
        } else {
          setError('No se pudieron cargar los promotores. Intenta de nuevo.');
        }
        return;
      }

      setPromotores(data || []);
    } catch (err) {
      console.error('Error in fetchPromotores:', err);
      setError('Ocurrió un error inesperado al cargar los promotores.');
    } finally {
      setLoading(false);
    }
  };

  const togglePromotorStatus = async (promotor: Promotor) => {
    // No permitir desactivar el promotor interno
    if (promotor.id === DEFAULT_PROMOTOR_ID) {
      toast({
        title: 'No permitido',
        description: 'No se puede modificar el promotor interno del sistema',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await supabase
      .from('promotores')
      .update({ activo: !promotor.activo })
      .eq('id', promotor.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estatus del promotor',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Promotor actualizado',
      description: `Promotor ${promotor.activo ? 'desactivado' : 'activado'} correctamente`,
    });

    fetchPromotores();
  };

  const filteredPromotores = promotores.filter(p => {
    const matchesSearch = 
      p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.telefono?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && p.activo) ||
      (filterStatus === 'inactive' && !p.activo);

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: promotores.length,
    active: promotores.filter(p => p.activo).length,
    inactive: promotores.filter(p => !p.activo).length,
  };

  const isDefaultPromotor = (id: string) => id === DEFAULT_PROMOTOR_ID;

  return (
    <MainLayout>
      <RoleGuard allowedRoles={['admin']}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Promotores
              </h1>
              <p className="text-muted-foreground mt-1">
                {stats.total} promotores · {stats.active} activos · {stats.inactive} inactivos
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Promotor
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estatus" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Cargando promotores...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-destructive/30">
              <div className="p-3 rounded-full bg-destructive/10 mb-4">
                <Megaphone className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Error al cargar promotores</h3>
              <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
              <Button onClick={fetchPromotores} variant="outline" className="gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reintentar
              </Button>
            </div>
          ) : filteredPromotores.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-xl border border-border">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-foreground mb-2">
                {promotores.length === 0 ? 'No hay promotores' : 'Sin resultados'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {promotores.length === 0 
                  ? 'Crea el primer promotor para comenzar a registrar referidos.' 
                  : 'No hay promotores que coincidan con los filtros'}
              </p>
              {promotores.length === 0 && (
                <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear primer promotor
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Observaciones</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromotores.map((promotor) => (
                    <TableRow 
                      key={promotor.id}
                      className={!promotor.activo ? 'opacity-60' : ''}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            isDefaultPromotor(promotor.id) 
                              ? 'bg-primary/10' 
                              : 'bg-accent'
                          }`}>
                            <Megaphone className={`h-5 w-5 ${
                              isDefaultPromotor(promotor.id) 
                                ? 'text-primary' 
                                : 'text-accent-foreground'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{promotor.nombre_completo}</p>
                            {isDefaultPromotor(promotor.id) && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Interno
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {promotor.telefono ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            {promotor.telefono}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground line-clamp-2 max-w-[200px]">
                          {promotor.observaciones || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(promotor.created_at), 'dd MMM yyyy', { locale: es })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={promotor.activo ? 'default' : 'secondary'}>
                          {promotor.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!isDefaultPromotor(promotor.id) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingPromotor(promotor)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => togglePromotorStatus(promotor)}
                                className={promotor.activo ? 'text-destructive' : 'text-green-600'}
                              >
                                {promotor.activo ? (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Promotor</DialogTitle>
            </DialogHeader>
            <PromotorForm
              onSuccess={() => {
                setShowCreateDialog(false);
                fetchPromotores();
              }}
              onCancel={() => setShowCreateDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingPromotor} onOpenChange={() => setEditingPromotor(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Promotor</DialogTitle>
            </DialogHeader>
            {editingPromotor && (
              <PromotorForm
                promotor={editingPromotor}
                onSuccess={() => {
                  setEditingPromotor(null);
                  fetchPromotores();
                }}
                onCancel={() => setEditingPromotor(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </RoleGuard>
    </MainLayout>
  );
}
