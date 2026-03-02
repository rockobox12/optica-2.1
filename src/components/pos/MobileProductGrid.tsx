import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Package, Tag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProductItem {
  id: string;
  productType: string;
  productName: string;
  productCode: string | null;
  description: string | null;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
}

interface MobileProductGridProps {
  onAdd: (item: ProductItem) => void;
  onClose?: () => void;
}

export function MobileProductGrid({ onAdd, onClose }: MobileProductGridProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Autofocus search on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-mobile', search],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, product_categories(name)')
        .eq('is_active', true)
        .eq('controls_stock', true)
        .order('name');

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.eq.${search}`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const handleAddProduct = (product: any) => {
    const catName = (product.product_categories as any)?.name || undefined;
    const item: ProductItem = {
      id: `product-${product.id}-${Date.now()}`,
      productType: product.product_type === 'service' ? 'service' : 'other',
      productName: product.name,
      productCode: product.sku,
      description: null,
      categoryId: product.category_id || undefined,
      categoryName: catName,
      quantity: 1,
      unitPrice: product.sale_price,
      discountPercent: 0,
      discountAmount: 0,
      subtotal: product.sale_price,
    };
    onAdd(item);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search header */}
      <div className="sticky top-0 bg-background z-10 px-4 py-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar producto o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-10 pr-10 text-base"
              inputMode="search"
              autoComplete="off"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {onClose && (
            <Button variant="outline" size="icon" className="h-12 w-12" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Category pills */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-1">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              className="rounded-full h-8"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                className="rounded-full h-8"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Product grid - 2 columns on mobile */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-4 opacity-30" />
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all duration-200',
                        'active:scale-95 touch-manipulation',
                        'hover:shadow-lg hover:border-primary/50'
                      )}
                      onClick={() => handleAddProduct(product)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-1">
                          <p className="font-medium text-sm line-clamp-2 flex-1">
                            {product.name}
                          </p>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddProduct(product);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {product.sku && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {product.sku}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-primary">
                            {formatCurrency(product.sale_price)}
                          </span>
                          {product.controls_stock && (
                            <Badge variant="secondary" className="text-xs">
                              Stock
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
