import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Package, Loader2 } from 'lucide-react';
import { EnhancedSearch, SearchResult } from '@/components/ui/EnhancedSearch';
import type { CartItem } from '@/hooks/useOfflineSync';
import { useAuth } from '@/hooks/useAuth';

interface ProductSelectorProps {
  onAdd: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  onCreateNewProduct?: () => void;
}

export function ProductSelector({ onAdd, onCreateNewProduct }: ProductSelectorProps) {
  const { profile } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showManual, setShowManual] = useState(false);

  // Manual entry state
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
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

  const { data: products, isLoading } = useQuery({
    queryKey: ['pos-products-browse', categoryFilter, profile?.defaultBranchId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('id, sku, name, product_type, sale_price, category_id, brand, product_categories(name)')
        .eq('is_active', true)
        .order('name');

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;

      // Resolve effective prices per branch
      if (data && profile?.defaultBranchId) {
        const { data: branchPrices } = await supabase
          .from('product_prices_by_branch')
          .select('product_id, price')
          .in('product_id', data.map(p => p.id))
          .eq('branch_id', profile.defaultBranchId)
          .eq('is_active', true);

        if (branchPrices) {
          const priceMap = new Map(branchPrices.map(bp => [bp.product_id, bp.price]));
          return data.map(p => ({
            ...p,
            effective_price: priceMap.get(p.id) ?? p.sale_price,
          }));
        }
      }

      return data?.map(p => ({ ...p, effective_price: p.sale_price })) || [];
    },
  });

  // Enhanced search handler
  const handleProductSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    let productQuery = supabase
      .from('products')
      .select('id, sku, barcode, name, product_type, sale_price, category_id, brand, model, product_categories(name)')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(10);

    const { data, error } = await productQuery;
    if (error) throw error;

    // Get branch prices if applicable
    let priceMap = new Map<string, number>();
    if (data && profile?.defaultBranchId) {
      const { data: branchPrices } = await supabase
        .from('product_prices_by_branch')
        .select('product_id, price')
        .in('product_id', data.map(p => p.id))
        .eq('branch_id', profile.defaultBranchId)
        .eq('is_active', true);

      if (branchPrices) {
        priceMap = new Map(branchPrices.map(bp => [bp.product_id, bp.price]));
      }
    }

    return (data || []).map((product) => ({
      id: product.id,
      type: 'product' as const,
      name: product.name,
      subtitle: [product.brand, product.model].filter(Boolean).join(' - '),
      code: product.sku || product.barcode || undefined,
      price: priceMap.get(product.id) ?? product.sale_price,
      metadata: {
        ...product,
        effective_price: priceMap.get(product.id) ?? product.sale_price,
        categoryName: (product.product_categories as any)?.name || undefined,
      },
    }));
  }, [profile?.defaultBranchId]);

  const handleSearchSelect = useCallback((result: SearchResult) => {
    const product = result.metadata;
    onAdd({
      productType: product.product_type === 'service' ? 'service' : 'other',
      productName: result.name,
      productCode: result.code,
      categoryId: product.category_id || undefined,
      categoryName: product.categoryName || undefined,
      quantity: 1,
      unitPrice: Number(result.price),
      discountPercent: 0,
      discountAmount: 0,
    });
  }, [onAdd]);

  const handleAddProduct = (product: any) => {
    const catName = product.product_categories?.name || undefined;
    onAdd({
      productType: product.product_type === 'service' ? 'service' : 'other',
      productName: product.name,
      productCode: product.sku,
      categoryId: product.category_id || undefined,
      categoryName: catName,
      quantity: 1,
      unitPrice: Number(product.effective_price),
      discountPercent: 0,
      discountAmount: 0,
    });
  };

  const handleManualAdd = () => {
    if (!productName || unitPrice <= 0) return;
    onAdd({
      productType: 'other',
      productName,
      productCode: productCode || undefined,
      description: description || undefined,
      quantity,
      unitPrice,
      discountPercent,
      discountAmount: 0,
    });
    setProductName('');
    setProductCode('');
    setDescription('');
    setQuantity(1);
    setUnitPrice(0);
    setDiscountPercent(0);
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Product Search */}
      <EnhancedSearch
        placeholder="Buscar producto por nombre, SKU o código..."
        onSearch={handleProductSearch}
        onSelect={handleSearchSelect}
        onCreateNew={onCreateNewProduct || (() => setShowManual(true))}
        minChars={1}
        maxResults={10}
        debounceMs={250}
        recentSearchesKey="pos-products"
      />

      {/* Category filter for browsing */}
      <div className="flex gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products from DB (browsable list) */}
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products && products.length > 0 ? (
        <ScrollArea className="h-[200px]">
          <div className="grid grid-cols-1 gap-2">
            {products.slice(0, 20).map((product) => (
              <Button
                key={product.id}
                variant="outline"
                className="justify-between text-left h-auto py-2 px-3 hover:bg-muted/80"
                onClick={() => handleAddProduct(product)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{product.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{product.sku}</span>
                    {product.product_categories && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {(product.product_categories as any).name}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-primary ml-2">
                  ${Number(product.effective_price).toFixed(2)}
                  {Number(product.effective_price) !== Number(product.sale_price) && (
                    <span className="text-xs text-muted-foreground line-through ml-1">
                      ${Number(product.sale_price).toFixed(2)}
                    </span>
                  )}
                </span>
              </Button>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {categoryFilter !== 'all' ? 'No hay productos en esta categoría' : 'Busque un producto arriba'}
          </p>
        </div>
      )}

      {/* Manual entry toggle */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <button
            type="button"
            className="bg-background px-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowManual(!showManual)}
          >
            {showManual ? 'Ocultar entrada manual' : 'O agregar manualmente'}
          </button>
        </div>
      </div>

      {/* Manual Entry */}
      {showManual && (
        <div className="space-y-3 border rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Nombre del Producto *</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej: Armazón Ray-Ban RB5154"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Código</Label>
              <Input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                placeholder="SKU"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Cantidad</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Precio Unitario *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                placeholder="0.00"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Descuento %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="h-8"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción adicional..."
                rows={2}
                className="text-sm"
              />
            </div>
          </div>
          <Button
            className="w-full"
            size="sm"
            onClick={handleManualAdd}
            disabled={!productName || unitPrice <= 0}
          >
            Agregar al Carrito
          </Button>
        </div>
      )}
    </div>
  );
}
