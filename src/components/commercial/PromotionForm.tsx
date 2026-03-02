import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';

interface PromotionFormProps {
  promotion?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PromotionForm({ promotion, onSuccess, onCancel }: PromotionFormProps) {
  const { toast } = useToast();
  const isEditing = !!promotion;

  const [name, setName] = useState(promotion?.name || '');
  const [description, setDescription] = useState(promotion?.description || '');
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>(promotion?.discount_type || 'PERCENT');
  const [discountValue, setDiscountValue] = useState(promotion?.discount_value?.toString() || '');
  const [appliesTo, setAppliesTo] = useState<'CATEGORY' | 'PRODUCT' | 'PACKAGE'>(promotion?.applies_to || 'CATEGORY');
  const [categoryId, setCategoryId] = useState(promotion?.category_id || '');
  const [productId, setProductId] = useState(promotion?.product_id || '');
  const [packageId, setPackageId] = useState(promotion?.package_id || '');
  const [branchScope, setBranchScope] = useState<'ALL' | 'SPECIFIC'>(promotion?.branch_scope || 'ALL');
  const [branchId, setBranchId] = useState(promotion?.branch_id || '');
  const [startDate, setStartDate] = useState(promotion?.start_date || format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(promotion?.end_date || format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [isActive, setIsActive] = useState(promotion?.is_active ?? true);
  const [isCombinable, setIsCombinable] = useState(promotion?.is_combinable ?? false);
  const [maxUses, setMaxUses] = useState(promotion?.max_uses?.toString() || '');

  const { data: categories } = useQuery({
    queryKey: ['promo-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['promo-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: packages } = useQuery({
    queryKey: ['promo-packages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['promo-branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es requerido');
      if (!discountValue || parseFloat(discountValue) <= 0) throw new Error('El valor del descuento es requerido');

      const data: any = {
        name: name.trim(),
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        applies_to: appliesTo,
        category_id: appliesTo === 'CATEGORY' ? categoryId || null : null,
        product_id: appliesTo === 'PRODUCT' ? productId || null : null,
        package_id: appliesTo === 'PACKAGE' ? packageId || null : null,
        branch_scope: branchScope,
        branch_id: branchScope === 'SPECIFIC' ? branchId || null : null,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        is_combinable: isCombinable,
        max_uses: maxUses ? parseInt(maxUses) : null,
      };

      if (isEditing) {
        const { error } = await supabase.from('promotions').update(data).eq('id', promotion.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('promotions').insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: isEditing ? 'Promoción actualizada' : 'Promoción creada' });
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
          <Label>Nombre *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: 20% en Armazones" />
        </div>
        <div className="md:col-span-2">
          <Label>Descripción</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
      </div>

      {/* Discount */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Descuento</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'PERCENT' | 'FIXED')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENT">Porcentaje (%)</SelectItem>
                <SelectItem value="FIXED">Monto fijo ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor {discountType === 'PERCENT' ? '(%)' : '($)'}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={discountType === 'PERCENT' ? '100' : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Target */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Aplica a</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tipo</Label>
            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CATEGORY">Categoría</SelectItem>
                <SelectItem value="PRODUCT">Producto</SelectItem>
                <SelectItem value="PACKAGE">Paquete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appliesTo === 'CATEGORY' && (
            <div>
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {appliesTo === 'PRODUCT' && (
            <div>
              <Label>Producto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {appliesTo === 'PACKAGE' && (
            <div>
              <Label>Paquete</Label>
              <Select value={packageId} onValueChange={setPackageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {packages?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Branch scope */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Alcance</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Sucursales</Label>
            <Select value={branchScope} onValueChange={(v) => setBranchScope(v as 'ALL' | 'SPECIFIC')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="SPECIFIC">Específica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {branchScope === 'SPECIFIC' && (
            <div>
              <Label>Sucursal</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Vigencia</h4>
        <div className="grid grid-cols-2 gap-4">
          <MaskedDateInput
            value={startDate}
            onChange={setStartDate}
            label="Inicio"
            mode="general"
          />
          <MaskedDateInput
            value={endDate}
            onChange={setEndDate}
            label="Fin"
            mode="general"
          />
        </div>
      </div>

      {/* Options */}
      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Promoción activa</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={isCombinable} onCheckedChange={setIsCombinable} />
          <Label>Combinable con otras promociones</Label>
        </div>
        <div>
          <Label>Máximo de usos (vacío = ilimitado)</Label>
          <Input
            type="number"
            min="1"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Sin límite"
            className="w-40"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Guardar cambios' : 'Crear promoción'}
        </Button>
      </div>
    </div>
  );
}
