import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Package, Loader2, Check, ArrowRight } from 'lucide-react';
import type { CartItem } from '@/hooks/useOfflineSync';

interface PackageSelectorProps {
  onAddItems: (items: Omit<CartItem, 'id' | 'subtotal'>[], packageName: string) => void;
}

export function PackageSelector({ onAddItems }: PackageSelectorProps) {
  const { profile } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<number, any>>({});

  const { data: packages, isLoading } = useQuery({
    queryKey: ['pos-packages', profile?.defaultBranchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          package_items(
            id, item_type, category_id, product_id, is_required, quantity, sort_order, label,
            product_categories(id, name),
            products(id, name, sale_price, category_id)
          ),
          package_prices_by_branch(price, branch_id)
        `)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const getPackagePrice = (pkg: any) => {
    if (profile?.defaultBranchId) {
      const branchPrice = pkg.package_prices_by_branch?.find(
        (p: any) => p.branch_id === profile.defaultBranchId
      );
      if (branchPrice) return Number(branchPrice.price);
    }
    return pkg.base_price ? Number(pkg.base_price) : null;
  };

  const handleSelectPackage = (pkg: any) => {
    setSelectedPackage(pkg);
    setSelections({});
    
    if (pkg.package_type === 'fixed') {
      // Auto-add all fixed items
      const items: Omit<CartItem, 'id' | 'subtotal'>[] = [];
      const sortedItems = [...(pkg.package_items || [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
      
      sortedItems.forEach((item: any) => {
        if (item.item_type === 'PRODUCT' && item.products) {
          items.push({
            productType: 'package_item',
            productName: `[${pkg.name}] ${(item.products as any).name}`,
            quantity: item.quantity,
            unitPrice: 0, // Price comes from package total
            discountPercent: 0,
            discountAmount: 0,
          });
        }
      });

      // Add package total as first item
      const price = getPackagePrice(pkg);
      if (price && items.length > 0) {
        items[0].unitPrice = price;
      }

      onAddItems(items, pkg.name);
    } else {
      // Open wizard for flexible packages
      setCurrentStep(0);
      setShowWizard(true);
    }
  };

  // Load products for the current wizard step's category
  const currentItem = selectedPackage?.package_items
    ?.sort((a: any, b: any) => a.sort_order - b.sort_order)?.[currentStep];

  const { data: stepProducts } = useQuery({
    queryKey: ['package-step-products', currentItem?.category_id],
    queryFn: async () => {
      if (!currentItem?.category_id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sale_price, brand')
        .eq('category_id', currentItem.category_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentItem?.category_id && showWizard,
  });

  const totalSteps = selectedPackage?.package_items?.length || 0;

  const handleSelectProduct = (product: any) => {
    setSelections(prev => ({ ...prev, [currentStep]: product }));
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete - add all selections
      const items: Omit<CartItem, 'id' | 'subtotal'>[] = [];
      const sortedItems = [...(selectedPackage.package_items || [])].sort(
        (a: any, b: any) => a.sort_order - b.sort_order
      );

      sortedItems.forEach((item: any, index: number) => {
        const selected = selections[index];
        if (selected) {
          items.push({
            productType: 'package_item',
            productName: `[${selectedPackage.name}] ${selected.name}`,
            quantity: item.quantity,
            unitPrice: 0,
            discountPercent: 0,
            discountAmount: 0,
          });
        }
      });

      const price = getPackagePrice(selectedPackage);
      if (price && items.length > 0) {
        items[0].unitPrice = price;
      }

      onAddItems(items, selectedPackage.name);
      setShowWizard(false);
      setSelectedPackage(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay paquetes disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {packages.map((pkg) => {
            const price = getPackagePrice(pkg);
            const itemCount = pkg.package_items?.length || 0;
            
            return (
              <Button
                key={pkg.id}
                variant="outline"
                className="w-full justify-between text-left h-auto py-3 px-4"
                onClick={() => handleSelectPackage(pkg)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{pkg.name}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {pkg.package_type === 'fixed' ? 'Fijo' : 'Flexible'}
                    </Badge>
                    <span>{itemCount} componente{itemCount !== 1 ? 's' : ''}</span>
                  </div>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{pkg.description}</p>
                  )}
                </div>
                {price && (
                  <span className="font-bold text-primary ml-3">${price.toFixed(2)}</span>
                )}
              </Button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Flexible Package Wizard */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {selectedPackage?.name}
            </DialogTitle>
            <DialogDescription>
              Paso {currentStep + 1} de {totalSteps}
              {currentItem?.label && ` — ${currentItem.label}`}
              {!currentItem?.label && currentItem?.product_categories && 
                ` — Seleccione ${(currentItem.product_categories as any)?.name}`
              }
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {stepProducts?.map((product) => {
                const isSelected = selections[currentStep]?.id === product.id;
                return (
                  <Button
                    key={product.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className="w-full justify-between h-auto py-2"
                    onClick={() => handleSelectProduct(product)}
                  >
                    <div className="text-left">
                      <div className="text-sm font-medium">{product.name}</div>
                      {product.brand && (
                        <div className="text-xs opacity-70">{product.brand}</div>
                      )}
                    </div>
                    {isSelected && <Check className="h-4 w-4" />}
                  </Button>
                );
              })}
              {(!stepProducts || stepProducts.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay productos en esta categoría
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)}>
                Anterior
              </Button>
            )}
            <Button
              onClick={handleNextStep}
              disabled={currentItem?.is_required && !selections[currentStep]}
            >
              {currentStep < totalSteps - 1 ? (
                <>
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                'Agregar al carrito'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
