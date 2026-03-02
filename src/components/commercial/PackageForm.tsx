import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react';

interface PackageItemInput {
  id?: string;
  item_type: 'CATEGORY' | 'PRODUCT';
  category_id: string | null;
  product_id: string | null;
  is_required: boolean;
  quantity: number;
  sort_order: number;
  label: string;
}

interface PackageFormProps {
  package?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PackageForm({ package: pkg, onSuccess, onCancel }: PackageFormProps) {
  const { toast } = useToast();
  const isEditing = !!pkg;

  const [name, setName] = useState(pkg?.name || '');
  const [description, setDescription] = useState(pkg?.description || '');
  const [packageType, setPackageType] = useState<'fixed' | 'flexible'>(pkg?.package_type || 'flexible');
  const [basePrice, setBasePrice] = useState(pkg?.base_price?.toString() || '');
  const [isActive, setIsActive] = useState(pkg?.is_active ?? true);
  const [items, setItems] = useState<PackageItemInput[]>([]);

  // Load existing items
  useEffect(() => {
    if (pkg?.package_items) {
      setItems(
        pkg.package_items.map((item: any) => ({
          id: item.id,
          item_type: item.item_type,
          category_id: item.category_id,
          product_id: item.product_id,
          is_required: item.is_required,
          quantity: item.quantity,
          sort_order: item.sort_order,
          label: item.label || '',
        }))
      );
    }
  }, [pkg]);

  const { data: categories } = useQuery({
    queryKey: ['package-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, category_type')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['package-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sale_price, category_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const addItem = () => {
    setItems(prev => [
      ...prev,
      {
        item_type: packageType === 'fixed' ? 'PRODUCT' : 'CATEGORY',
        category_id: null,
        product_id: null,
        is_required: true,
        quantity: 1,
        sort_order: prev.length,
        label: '',
      },
    ]);
  };

  const updateItem = (index: number, updates: Partial<PackageItemInput>) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es requerido');
      if (items.length === 0) throw new Error('Agregue al menos un ítem al paquete');

      const packageData = {
        name: name.trim(),
        description: description.trim() || null,
        package_type: packageType,
        base_price: basePrice ? parseFloat(basePrice) : null,
        is_active: isActive,
      };

      let packageId: string;

      if (isEditing) {
        const { error } = await supabase.from('packages').update(packageData).eq('id', pkg.id);
        if (error) throw error;
        packageId = pkg.id;

        // Delete existing items and re-insert
        await supabase.from('package_items').delete().eq('package_id', packageId);
      } else {
        const { data, error } = await supabase.from('packages').insert(packageData).select('id').single();
        if (error) throw error;
        packageId = data.id;
      }

      // Insert items
      const itemsToInsert = items.map((item, index) => ({
        package_id: packageId,
        item_type: item.item_type,
        category_id: item.category_id || null,
        product_id: item.product_id || null,
        is_required: item.is_required,
        quantity: item.quantity,
        sort_order: index,
        label: item.label || null,
      }));

      const { error: itemsError } = await supabase.from('package_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      toast({ title: isEditing ? 'Paquete actualizado' : 'Paquete creado' });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      {/* Basic info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Nombre del paquete *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Paquete Graduado Completo" />
        </div>
        <div className="md:col-span-2">
          <Label>Descripción</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
        <div>
          <Label>Tipo de paquete</Label>
          <Select value={packageType} onValueChange={(v) => setPackageType(v as 'fixed' | 'flexible')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fijo (productos específicos)</SelectItem>
              <SelectItem value="flexible">Flexible (elegir por categoría)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Precio base del paquete</Label>
          <Input type="number" step="0.01" min="0" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} placeholder="0.00" />
        </div>
      </div>

      {/* Items */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <Label className="text-base font-semibold">
            Componentes del paquete
          </Label>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Agregue componentes al paquete
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                <GripVertical className="h-4 w-4 mt-2 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={item.item_type}
                      onValueChange={(v) => updateItem(index, {
                        item_type: v as 'CATEGORY' | 'PRODUCT',
                        category_id: null,
                        product_id: null,
                      })}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CATEGORY">Por categoría</SelectItem>
                        <SelectItem value="PRODUCT">Producto específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {item.item_type === 'CATEGORY' ? (
                    <div>
                      <Label className="text-xs">Categoría</Label>
                      <Select
                        value={item.category_id || ''}
                        onValueChange={(v) => updateItem(index, { category_id: v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div>
                      <Label className="text-xs">Producto</Label>
                      <Select
                        value={item.product_id || ''}
                        onValueChange={(v) => updateItem(index, { product_id: v })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {products?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} - ${Number(p.sale_price).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Etiqueta</Label>
                    <Input
                      className="h-8"
                      value={item.label}
                      onChange={(e) => updateItem(index, { label: e.target.value })}
                      placeholder="Ej: Armazón"
                    />
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.is_required}
                        onCheckedChange={(v) => updateItem(index, { is_required: v })}
                      />
                      <Label className="text-xs">Requerido</Label>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive flex-shrink-0"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3 border-t pt-4">
        <Switch checked={isActive} onCheckedChange={setIsActive} />
        <Label>Paquete activo</Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Guardar cambios' : 'Crear paquete'}
        </Button>
      </div>
    </div>
  );
}
