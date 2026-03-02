import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const productSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  category_id: z.string().optional(),
  product_type: z.enum(['product', 'service']),
  brand: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  cost_price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0),
  wholesale_price: z.coerce.number().optional(),
  min_stock: z.coerce.number().int().min(0),
  max_stock: z.coerce.number().int().optional(),
  reorder_point: z.coerce.number().int().min(0),
  is_active: z.boolean(),
  requires_prescription: z.boolean(),
  controls_stock: z.boolean(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface CategoryOption {
  id: string;
  name: string;
  category_type?: string;
}

interface ProductFormProps {
  product?: any;
  categories: CategoryOption[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, categories, onSuccess, onCancel }: ProductFormProps) {
  const { toast } = useToast();
  const isEditing = !!product;

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      name: product?.name || '',
      description: product?.description || '',
      category_id: product?.category_id || '',
      product_type: product?.product_type || 'product',
      brand: product?.brand || '',
      model: product?.model || '',
      color: product?.color || '',
      size: product?.size || '',
      material: product?.material || '',
      cost_price: product?.cost_price || 0,
      sale_price: product?.sale_price || 0,
      wholesale_price: product?.wholesale_price || undefined,
      min_stock: product?.min_stock || 0,
      max_stock: product?.max_stock || undefined,
      reorder_point: product?.reorder_point || 5,
      is_active: product?.is_active ?? true,
      requires_prescription: product?.requires_prescription ?? false,
      controls_stock: product?.controls_stock ?? true,
    },
  });

  const watchCategoryId = form.watch('category_id');
  const watchProductType = form.watch('product_type');
  const watchControlsStock = form.watch('controls_stock');

  // Auto-set product_type based on selected category
  useEffect(() => {
    if (watchCategoryId) {
      const selectedCategory = categories.find((c) => c.id === watchCategoryId);
      if (selectedCategory?.category_type) {
        const newType = selectedCategory.category_type === 'service' ? 'service' : 'product';
        form.setValue('product_type', newType as 'product' | 'service');
        // Services don't control stock by default
        if (newType === 'service') {
          form.setValue('controls_stock', false);
        }
      }
    }
  }, [watchCategoryId, categories, form]);

  const isService = watchProductType === 'service';
  const showStockFields = watchControlsStock && !isService;

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      let sku = data.sku;
      if (!sku) {
        const { data: skuData, error: skuError } = await supabase.rpc('generate_product_sku');
        if (skuError) throw skuError;
        sku = skuData;
      }

      const payload = {
        sku: sku as string,
        name: data.name,
        product_type: data.product_type,
        cost_price: data.cost_price,
        sale_price: data.sale_price,
        min_stock: showStockFields ? data.min_stock : 0,
        reorder_point: showStockFields ? data.reorder_point : 0,
        is_active: data.is_active,
        requires_prescription: data.requires_prescription,
        controls_stock: data.controls_stock,
        category_id: data.category_id || null,
        barcode: data.barcode || null,
        description: data.description || null,
        brand: data.brand || null,
        model: data.model || null,
        color: data.color || null,
        size: data.size || null,
        material: data.material || null,
        wholesale_price: data.wholesale_price || null,
        max_stock: showStockFields ? (data.max_stock || null) : null,
      };

      if (isEditing) {
        const { error } = await supabase.from('products').update(payload).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'Producto actualizado' : 'Producto creado',
        description: 'Los cambios se guardaron correctamente',
      });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const { formState: { errors, touchedFields, dirtyFields, isValid } } = form;

  // Helper to render validation icon
  const ValidationIcon = ({ fieldName }: { fieldName: keyof ProductFormData }) => {
    const hasError = errors[fieldName] && touchedFields[fieldName];
    const fieldValue = form.getValues(fieldName);
    const hasValue = fieldValue !== undefined && fieldValue !== '' && fieldValue !== null;
    const isFieldValid = !errors[fieldName] && (touchedFields[fieldName] || dirtyFields[fieldName]) && hasValue;
    
    return (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        <AnimatePresence mode="wait">
          {hasError && (
            <motion.div
              key="error"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <X className="h-4 w-4 text-destructive" />
            </motion.div>
          )}
          {isFieldValid && (
            <motion.div
              key="success"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="h-4 w-4 text-success" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        {/* Basic info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <FormItem className="md:col-span-2">
                <FormLabel className={cn(fieldState.error && fieldState.isTouched && 'text-destructive')}>
                  Nombre del producto <span className="text-destructive">*</span>
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ej: Mica antirreflejante Blue Cut"
                      className={cn(
                        'pr-10 transition-all duration-200',
                        fieldState.error && fieldState.isTouched && 'border-destructive focus-visible:border-destructive',
                        !fieldState.error && field.value && fieldState.isTouched && 'border-success focus-visible:border-success'
                      )}
                    />
                  </FormControl>
                  <ValidationIcon fieldName="name" />
                </div>
                <AnimatePresence>
                  {fieldState.error && fieldState.isTouched && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                    >
                      <FormMessage />
                    </motion.div>
                  )}
                </AnimatePresence>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                        {cat.category_type === 'service' && ' (Servicio)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  El tipo se ajusta automáticamente según la categoría
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="product_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="product">Producto</SelectItem>
                    <SelectItem value="service">Servicio</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Auto-generado si vacío" />
                </FormControl>
                <FormDescription>Código único del producto</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="barcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código de barras</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="EAN/UPC" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Show brand/model/color/material only for physical products */}
          {!isService && (
            <>
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Ray-Ban" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Aviator Classic" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Negro brillante" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="material"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Titanio" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={2} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Prices */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-4">Precios</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="cost_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de costo</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sale_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio de venta *</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="wholesale_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio mayoreo</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" min="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Stock control */}
        {!isService && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-3 mb-4">
              <FormField
                control={form.control}
                name="controls_stock"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0 font-medium">Controla stock</FormLabel>
                    <FormDescription className="!mt-0">
                      Desmarque si este producto no maneja inventario físico
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            {showStockFields && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="min_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock mínimo</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reorder_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Punto de reorden</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormDescription>Alerta de stock bajo</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock máximo</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* Flags */}
        <div className="border-t pt-4 space-y-4">
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Producto activo</FormLabel>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requires_prescription"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Requiere receta</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending || !isValid}
            className={cn(
              'transition-all duration-200',
              !isValid && 'opacity-70 cursor-not-allowed'
            )}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
