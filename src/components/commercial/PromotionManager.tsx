import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Percent, Edit, Trash2, Loader2, Calendar } from 'lucide-react';
import { PromotionForm } from './PromotionForm';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

export function PromotionManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any>(null);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          product_categories(name),
          products(name),
          packages(name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ title: 'Promoción eliminada' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('promotions').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });

  const getStatusBadge = (promo: any) => {
    const now = new Date();
    const start = parseISO(promo.start_date);
    const end = parseISO(promo.end_date);
    
    if (!promo.is_active) return <Badge variant="secondary">Inactiva</Badge>;
    if (isBefore(now, start)) return <Badge variant="outline">Programada</Badge>;
    if (isAfter(now, end)) return <Badge variant="destructive">Expirada</Badge>;
    return <Badge>Vigente</Badge>;
  };

  const getTargetLabel = (promo: any) => {
    switch (promo.applies_to) {
      case 'CATEGORY':
        return `Categoría: ${(promo.product_categories as any)?.name || 'N/A'}`;
      case 'PRODUCT':
        return `Producto: ${(promo.products as any)?.name || 'N/A'}`;
      case 'PACKAGE':
        return `Paquete: ${(promo.packages as any)?.name || 'N/A'}`;
      default:
        return 'N/A';
    }
  };

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
        <h3 className="text-lg font-semibold">Promociones</h3>
        <Button onClick={() => { setEditingPromotion(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Promoción
        </Button>
      </div>

      {!promotions || promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Percent className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No hay promociones creadas</p>
            <p className="text-sm">Cree su primera promoción para aplicar en ventas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promo) => (
            <Card key={promo.id} className={!promo.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{promo.name}</CardTitle>
                  {getStatusBadge(promo)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {promo.description && (
                  <p className="text-sm text-muted-foreground">{promo.description}</p>
                )}

                <div className="text-lg font-bold text-primary">
                  {promo.discount_type === 'PERCENT'
                    ? `${Number(promo.discount_value)}% de descuento`
                    : `$${Number(promo.discount_value).toFixed(2)} de descuento`}
                </div>

                <div className="text-sm text-muted-foreground">
                  {getTargetLabel(promo)}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {format(parseISO(promo.start_date), 'dd/MM/yyyy')} - {format(parseISO(promo.end_date), 'dd/MM/yyyy')}
                  </span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    {promo.branch_scope === 'ALL' ? 'Todas las sucursales' : 'Sucursal específica'}
                  </Badge>
                  {promo.is_combinable && <Badge variant="outline">Combinable</Badge>}
                  {promo.max_uses && (
                    <Badge variant="outline">
                      Usos: {promo.current_uses}/{promo.max_uses}
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setEditingPromotion(promo); setShowForm(true); }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive.mutate({ id: promo.id, is_active: !promo.is_active })}
                  >
                    {promo.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => deleteMutation.mutate(promo.id)}
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
              {editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
            </DialogTitle>
          </DialogHeader>
          <PromotionForm
            promotion={editingPromotion}
            onSuccess={() => {
              setShowForm(false);
              queryClient.invalidateQueries({ queryKey: ['promotions'] });
            }}
            onCancel={() => setShowForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
