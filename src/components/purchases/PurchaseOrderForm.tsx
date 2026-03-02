import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';

interface OrderItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
}

interface PurchaseOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function PurchaseOrderForm({ onSuccess, onCancel }: PurchaseOrderFormProps) {
  const [supplierId, setSupplierId] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: supplierProducts } = useQuery({
    queryKey: ['supplier-products-for-order', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      const { data, error } = await supabase
        .from('supplier_products')
        .select('*, products(id, name, sku)')
        .eq('supplier_id', supplierId);
      if (error) throw error;
      return data;
    },
    enabled: !!supplierId,
  });

  const { data: branches } = useQuery({
    queryKey: ['branches'],
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

  const addItem = () => {
    const sp = supplierProducts?.find((p: any) => p.product_id === selectedProductId);
    if (!sp) return;

    const qty = parseInt(quantity) || 1;
    const newItem: OrderItem = {
      product_id: sp.product_id,
      product_name: sp.products?.name || '',
      sku: sp.products?.sku || '',
      quantity: qty,
      unit_cost: sp.supplier_price,
      subtotal: sp.supplier_price * qty,
    };

    setItems([...items, newItem]);
    setSelectedProductId('');
    setQuantity('1');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const mutation = useMutation({
    mutationFn: async () => {
      // Generate order number
      const { data: orderNumber, error: numError } = await supabase.rpc('generate_po_number');
      if (numError) throw numError;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert([{
          order_number: orderNumber,
          supplier_id: supplierId,
          branch_id: profile?.defaultBranchId || null,
          status: 'draft',
          expected_date: expectedDate || null,
          notes: notes || null,
          created_by: user?.id,
          subtotal,
          tax_amount: tax,
          total,
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Add items
      const itemsToInsert = items.map((item) => ({
        purchase_order_id: order.id,
        product_id: item.product_id,
        quantity_ordered: item.quantity,
        unit_cost: item.unit_cost,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      toast({ title: 'Orden de compra creada' });
      onSuccess();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const existingProductIds = new Set(items.map((i) => i.product_id));
  const availableProducts = supplierProducts?.filter((p: any) => !existingProductIds.has(p.product_id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Proveedor *</label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar proveedor" />
            </SelectTrigger>
            <SelectContent>
              {suppliers?.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <MaskedDateInput
            value={expectedDate}
            onChange={setExpectedDate}
            label="Fecha esperada"
            mode="delivery"
          />
        </div>
      </div>

      {supplierId && (
        <>
          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Agregar productos</h4>
            <div className="flex gap-3">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar producto del catálogo" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts?.map((sp: any) => (
                    <SelectItem key={sp.product_id} value={sp.product_id}>
                      {sp.products?.name} - ${sp.supplier_price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-24"
                placeholder="Qty"
              />
              <Button onClick={addItem} disabled={!selectedProductId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Costo Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">{item.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">${item.unit_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">${item.subtotal.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </>
      )}

      <div>
        <label className="text-sm font-medium">Notas</label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!supplierId || items.length === 0 || mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Crear Orden
        </Button>
      </div>
    </div>
  );
}
