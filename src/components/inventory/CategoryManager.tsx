import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Plus, Edit, Trash2, FolderOpen, Package, Wrench, Eye } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  category_type: string;
  is_active: boolean;
  requires_prescription: boolean;
  created_at: string;
}

export function CategoryManager() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryType, setCategoryType] = useState<string>('product');
  const [isActive, setIsActive] = useState(true);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['product-categories-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es requerido');

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        category_type: categoryType,
        is_active: isActive,
        requires_prescription: requiresPrescription,
      };

      if (editing) {
        const { error } = await supabase
          .from('product_categories')
          .update(payload as any)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert([payload] as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories-admin'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: editing ? 'Categoría actualizada' : 'Categoría creada' });
      handleClose();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories-admin'] });
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      toast({ title: 'Categoría eliminada' });
    },
    onError: (error) => {
      toast({
        title: 'Error al eliminar',
        description: 'Esta categoría puede tener productos asociados. Desactívela en su lugar.',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setCategoryType(cat.category_type);
    setIsActive(cat.is_active);
    setRequiresPrescription(cat.requires_prescription);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditing(null);
    setName('');
    setDescription('');
    setCategoryType('product');
    setIsActive(true);
    setRequiresPrescription(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">
          Categorías de Productos
        </CardTitle>
        <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva Categoría
          </Button>
        </RoleGuard>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Requiere Receta</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
                      {cat.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.category_type === 'service' ? 'secondary' : 'outline'}>
                        {cat.category_type === 'service' ? (
                          <><Wrench className="h-3 w-3 mr-1" /> Servicio</>
                        ) : (
                          <><Package className="h-3 w-3 mr-1" /> Producto</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                        {cat.is_active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {cat.requires_prescription && (
                        <Badge variant="outline" className="gap-1">
                          <Eye className="h-3 w-3" /> Sí
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('¿Eliminar esta categoría? Si tiene productos asociados, considere desactivarla.')) {
                                deleteMutation.mutate(cat.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </RoleGuard>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay categorías creadas</p>
          </div>
        )}
      </CardContent>

      {/* Category Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Micas, Tratamientos, Accesorios..."
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional de la categoría"
                rows={2}
              />
            </div>
            <div>
              <Label>Tipo de categoría</Label>
              <Select value={categoryType} onValueChange={setCategoryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">
                    <span className="flex items-center gap-2">
                      <Package className="h-3 w-3" /> Producto
                    </span>
                  </SelectItem>
                  <SelectItem value="service">
                    <span className="flex items-center gap-2">
                      <Wrench className="h-3 w-3" /> Servicio
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Los productos pueden manejar stock. Los servicios no manejan inventario.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Categoría activa</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={requiresPrescription} onCheckedChange={setRequiresPrescription} />
              <div>
                <Label className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Requiere receta para venta
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si está activo, el POS exigirá una receta vinculada al vender productos de esta categoría
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim()}>
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
