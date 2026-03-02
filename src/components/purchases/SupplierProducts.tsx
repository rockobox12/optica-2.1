import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Star, Loader2 } from 'lucide-react';

interface SupplierProductsProps {
  supplierId: string;
}

export function SupplierProducts({ supplierId }: SupplierProductsProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [minQty, setMinQty] = useState<string>('1');
  const [leadTime, setLeadTime] = useState<string>('7');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: supplierProducts, isLoading } = useQuery({
    queryKey: ['supplier-products', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_products')
        .select('*, products(name, sku, sale_price)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['products-for-supplier'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, cost_price')
        .eq('is_active', true)
        .eq('product_type', 'product')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_products').insert([{
        supplier_id: supplierId,
        product_id: selectedProductId,
        supplier_price: parseFloat(price),
        min_order_quantity: parseInt(minQty),
        lead_time_days: parseInt(leadTime),
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products', supplierId] });
      setSelectedProductId('');
      setPrice('');
      toast({ title: 'Producto agregado al catálogo' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('supplier_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products', supplierId] });
      toast({ title: 'Producto eliminado del catálogo' });
    },
  });

  const togglePreferredMutation = useMutation({
    mutationFn: async ({ id, isPreferred }: { id: string; isPreferred: boolean }) => {
      const { error } = await supabase
        .from('supplier_products')
        .update({ is_preferred: isPreferred })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products', supplierId] });
    },
  });

  const existingProductIds = new Set(supplierProducts?.map((sp) => sp.product_id));
  const availableProducts = products?.filter((p) => !existingProductIds.has(p.id));

  return (
    <div className="space-y-6">
      {/* Add product form */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/50 rounded-lg">
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Seleccionar producto" />
          </SelectTrigger>
          <SelectContent>
            {availableProducts?.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Precio"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28"
        />
        <Input
          placeholder="Min qty"
          type="number"
          value={minQty}
          onChange={(e) => setMinQty(e.target.value)}
          className="w-24"
        />
        <Input
          placeholder="Lead days"
          type="number"
          value={leadTime}
          onChange={(e) => setLeadTime(e.target.value)}
          className="w-24"
        />
        <Button
          onClick={() => addMutation.mutate()}
          disabled={!selectedProductId || !price || addMutation.isPending}
        >
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Products table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : supplierProducts && supplierProducts.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Precio Proveedor</TableHead>
                <TableHead className="text-center">Min Qty</TableHead>
                <TableHead className="text-center">Lead Time</TableHead>
                <TableHead className="text-center">Preferido</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierProducts.map((sp: any) => (
                <TableRow key={sp.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sp.products?.name}</p>
                      <p className="text-sm text-muted-foreground font-mono">{sp.products?.sku}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${sp.supplier_price?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">{sp.min_order_quantity}</TableCell>
                  <TableCell className="text-center">{sp.lead_time_days} días</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePreferredMutation.mutate({ id: sp.id, isPreferred: !sp.is_preferred })}
                    >
                      <Star className={`h-4 w-4 ${sp.is_preferred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(sp.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          No hay productos en el catálogo de este proveedor
        </p>
      )}
    </div>
  );
}
