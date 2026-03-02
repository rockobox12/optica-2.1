import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Package, Edit, Trash2, Loader2 } from 'lucide-react';
import { PackageForm } from './PackageForm';

export function PackageManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_items(
            id, item_type, category_id, product_id, is_required, quantity, sort_order, label,
            product_categories(name),
            products(name, sale_price)
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      toast({ title: 'Paquete eliminado' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('packages').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Paquetes / Combos</h3>
        <Button onClick={() => { setEditingPackage(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Paquete
        </Button>
      </div>

      {!packages || packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No hay paquetes creados</p>
            <p className="text-sm">Cree su primer paquete para venta rápida</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={!pkg.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  <div className="flex gap-1">
                    <Badge variant={pkg.package_type === 'fixed' ? 'default' : 'secondary'}>
                      {pkg.package_type === 'fixed' ? 'Fijo' : 'Flexible'}
                    </Badge>
                    <Badge variant={pkg.is_active ? 'outline' : 'destructive'}>
                      {pkg.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {pkg.description && (
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                )}

                <div className="text-lg font-bold text-primary">
                  {pkg.base_price ? `$${Number(pkg.base_price).toFixed(2)}` : 'Sin precio base'}
                </div>

                {/* Package items */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Incluye:</p>
                  {pkg.package_items?.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">•</span>
                      <span>
                        {item.item_type === 'PRODUCT'
                          ? (item.products as any)?.name || 'Producto'
                          : `1 de ${(item.product_categories as any)?.name || 'Categoría'}`}
                      </span>
                      {!item.is_required && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">Opcional</Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setEditingPackage(pkg); setShowForm(true); }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive.mutate({ id: pkg.id, is_active: !pkg.is_active })}
                  >
                    {pkg.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(pkg.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Editar Paquete' : 'Nuevo Paquete'}
            </DialogTitle>
          </DialogHeader>
          <PackageForm
            package={editingPackage}
            onSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ['packages'] });
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
