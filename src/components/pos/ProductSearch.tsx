import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedSearch, SearchResult } from '@/components/ui/EnhancedSearch';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  sku: string;
  name: string;
  sale_price: number;
  cost_price: number;
  brand?: string;
  model?: string;
  category_id?: string;
  product_type: 'product' | 'service';
  current_stock?: number;
  controls_stock?: boolean;
}

interface ProductSearchProps {
  onSelect: (product: Product) => void;
  onCreateNew?: () => void;
  branchId?: string;
  placeholder?: string;
  className?: string;
}

export function ProductSearch({
  onSelect,
  onCreateNew,
  branchId,
  placeholder = 'Buscar producto por nombre, SKU o código...',
  className,
}: ProductSearchProps) {
  // Search function
  const handleSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        sku,
        barcode,
        name,
        brand,
        model,
        sale_price,
        cost_price,
        category_id,
        product_type,
        controls_stock
      `)
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;

    // Fetch stock data separately for all products
    const productIds = (products || []).filter(p => p.controls_stock).map(p => p.id);
    
    let stockMap: Record<string, number> = {};
    if (productIds.length > 0) {
      let stockQuery = supabase
        .from('inventory_movements')
        .select('product_id, quantity, movement_type')
        .in('product_id', productIds);

      if (branchId) {
        stockQuery = stockQuery.eq('branch_id', branchId);
      }

      const { data: movements } = await stockQuery;
      
      // Calculate stock from movements
      (movements || []).forEach((mov: any) => {
        const qty = mov.quantity || 0;
        const isInbound = ['purchase', 'adjustment_in', 'transfer_in', 'return'].includes(mov.movement_type);
        stockMap[mov.product_id] = (stockMap[mov.product_id] || 0) + (isInbound ? qty : -qty);
      });
    }

    return (products || []).map((product) => ({
      id: product.id,
      type: 'product' as const,
      name: product.name,
      subtitle: [product.brand, product.model].filter(Boolean).join(' - '),
      code: product.sku || product.barcode || undefined,
      price: product.sale_price,
      stock: product.controls_stock ? (stockMap[product.id] || 0) : undefined,
      metadata: {
        ...product,
        current_stock: product.controls_stock ? (stockMap[product.id] || 0) : undefined,
      },
    }));
  }, [branchId]);

  // Handle product selection
  const handleSelectProduct = useCallback((result: SearchResult) => {
    const product = result.metadata as Product;
    onSelect({
      ...product,
      id: result.id,
      name: result.name,
      sale_price: result.price || 0,
      current_stock: result.stock,
    });
  }, [onSelect]);

  return (
    <EnhancedSearch
      placeholder={placeholder}
      onSearch={handleSearch}
      onSelect={handleSelectProduct}
      onCreateNew={onCreateNew}
      minChars={1}
      maxResults={10}
      debounceMs={250}
      recentSearchesKey="pos-products"
      className={className}
    />
  );
}
