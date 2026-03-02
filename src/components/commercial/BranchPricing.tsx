import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Save, Loader2, Building2 } from 'lucide-react';

interface BranchPricingProps {
  productId: string;
  basePrice: number;
}

export function BranchPricing({ productId, basePrice }: BranchPricingProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data: branches } = useQuery({
    queryKey: ['branches-pricing'],
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

  const { data: branchPrices, isLoading } = useQuery({
    queryKey: ['branch-prices', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_prices_by_branch')
        .select('*')
        .eq('product_id', productId);
      if (error) throw error;
      
      // Initialize prices state
      const priceMap: Record<string, string> = {};
      data?.forEach((bp) => {
        priceMap[bp.branch_id] = bp.price.toString();
      });
      setPrices(priceMap);
      return data;
    },
  });

  const handlePriceChange = (branchId: string, value: string) => {
    setPrices(prev => ({ ...prev, [branchId]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const branch of branches || []) {
        const priceStr = prices[branch.id];
        const price = priceStr ? parseFloat(priceStr) : null;
        const existing = branchPrices?.find(bp => bp.branch_id === branch.id);

        if (price !== null && price >= 0) {
          // Log price change
          if (existing && Number(existing.price) !== price) {
            await supabase.from('price_change_log').insert({
              product_id: productId,
              branch_id: branch.id,
              previous_price: existing.price,
              new_price: price,
              changed_by: user?.id,
            });
          }

          // Upsert price
          const { error } = await supabase
            .from('product_prices_by_branch')
            .upsert({
              product_id: productId,
              branch_id: branch.id,
              price,
              is_active: true,
              updated_by: user?.id,
            }, { onConflict: 'product_id,branch_id' });
          if (error) throw error;
        } else if (existing) {
          // Deactivate
          await supabase
            .from('product_prices_by_branch')
            .update({ is_active: false })
            .eq('id', existing.id);
        }
      }
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['branch-prices', productId] });
      toast({ title: 'Precios guardados' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const applyBaseToAll = () => {
    const newPrices: Record<string, string> = {};
    branches?.forEach((b) => {
      newPrices[b.id] = basePrice.toString();
    });
    setPrices(newPrices);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Precios por Sucursal
          </h4>
          <p className="text-sm text-muted-foreground">
            Precio base: <strong>${basePrice.toFixed(2)}</strong> (se usa si no hay precio específico)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={applyBaseToAll}>
          Aplicar precio base a todas
        </Button>
      </div>

      <div className="space-y-2">
        {branches?.map((branch) => {
          const existing = branchPrices?.find(bp => bp.branch_id === branch.id);
          const hasCustomPrice = prices[branch.id] && parseFloat(prices[branch.id]) !== basePrice;
          
          return (
            <div key={branch.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1">
                <span className="font-medium text-sm">{branch.name}</span>
                {hasCustomPrice && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">Personalizado</Badge>
                )}
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={prices[branch.id] || ''}
                  onChange={(e) => handlePriceChange(branch.id, e.target.value)}
                  placeholder={basePrice.toFixed(2)}
                  className="h-8"
                />
              </div>
            </div>
          );
        })}
      </div>

      {dirty && (
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar precios
          </Button>
        </div>
      )}
    </div>
  );
}
