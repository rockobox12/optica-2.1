import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, ShoppingCart, Trash2, Star, TrendingUp, Crown, Award, Percent, DollarSign, Save } from 'lucide-react';
import type { CartItem, CustomerInfo, PaymentInfo } from '@/hooks/useOfflineSync';
import type { PromotorInfo } from '@/hooks/usePOSCart';
import { DEFAULT_PROMOTOR_ID } from './PromotorSelector';

interface POSSummaryPanelProps {
  customer: CustomerInfo | null;
  items: CartItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  onDiscountPercentChange: (value: number) => void;
  onDiscountAmountChange: (value: number) => void;
  totalDiscount: number;
  total: number;
  totalPaid: number;
  balance: number;
  promotor: PromotorInfo | null;
  onRemoveItem: (id: string) => void;
  onStepChange: (step: 'patient' | 'products' | 'payment') => void;
  onSaveDraft?: () => void;
  onDiscard?: () => void;
}

export function POSSummaryPanel({
  customer,
  items,
  subtotal,
  discountPercent,
  discountAmount,
  onDiscountPercentChange,
  onDiscountAmountChange,
  totalDiscount,
  total,
  totalPaid,
  balance,
  promotor,
  onRemoveItem,
  onStepChange,
  onSaveDraft,
  onDiscard,
}: POSSummaryPanelProps) {
  // Fetch VIP / loyalty level for patient
  const { data: loyaltyData } = useQuery({
    queryKey: ['pos-loyalty', customer?.patientId],
    queryFn: async () => {
      if (!customer?.patientId) return null;
      // Get patient purchase history for VIP calc
      const { data: sales } = await supabase
        .from('sales')
        .select('total, status')
        .eq('patient_id', customer.patientId)
        .in('status', ['completed', 'partial']);
      
      const totalSpent = sales?.reduce((s, sale) => s + Number(sale.total || 0), 0) || 0;
      const purchaseCount = sales?.length || 0;

      // Simple VIP tiers
      if (totalSpent >= 10000 || purchaseCount >= 10) return { level: 'VIP Gold', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', icon: Crown, spent: totalSpent, count: purchaseCount };
      if (totalSpent >= 5000 || purchaseCount >= 5) return { level: 'VIP Silver', color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', icon: Award, spent: totalSpent, count: purchaseCount };
      if (purchaseCount >= 2) return { level: 'Recurrente', color: 'text-primary', bg: 'bg-primary/5 border-primary/20', icon: Star, spent: totalSpent, count: purchaseCount };
      return { level: 'Nuevo', color: 'text-muted-foreground', bg: 'bg-muted border-border', icon: User, spent: totalSpent, count: purchaseCount };
    },
    enabled: !!customer?.patientId,
  });

  // Estimated commission
  const [estimatedCommission, setEstimatedCommission] = useState<number>(0);

  useEffect(() => {
    if (!promotor || promotor.id === DEFAULT_PROMOTOR_ID || total <= 0) {
      setEstimatedCommission(0);
      return;
    }
    // Fetch commission config
    supabase
      .from('promotor_commission_config')
      .select('tipo_comision, valor_comision')
      .or(`promotor_id.eq.${promotor.id},promotor_id.is.null`)
      .eq('activo', true)
      .order('promotor_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setEstimatedCommission(0); return; }
        if (data.tipo_comision === 'porcentaje' || data.tipo_comision === 'PERCENT') {
          setEstimatedCommission(total * (Number(data.valor_comision) / 100));
        } else {
          setEstimatedCommission(Number(data.valor_comision));
        }
      });
  }, [promotor, total]);

  const LoyaltyIcon = loyaltyData?.icon || User;

  return (
    <Card className="sticky top-[88px] border border-border/60 shadow-md bg-card hover:shadow-md hover:scale-100">
      <CardContent className="p-4 space-y-3">
        {/* Customer badge */}
        {customer ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <User className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-sm truncate">{customer.name}</span>
            </div>
            {loyaltyData && (
              <Badge variant="outline" className={`shrink-0 gap-1 text-xs ${loyaltyData.bg} ${loyaltyData.color}`}>
                <LoyaltyIcon className="h-3 w-3" />
                {loyaltyData.level}
              </Badge>
            )}
          </div>
        ) : (
          <button 
            onClick={() => onStepChange('patient')}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 border border-dashed rounded-lg transition-colors"
          >
            <User className="h-4 w-4 mx-auto mb-1 opacity-50" />
            Seleccionar cliente
          </button>
        )}

        {/* Loyalty stats */}
        {loyaltyData && loyaltyData.count > 0 && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{loyaltyData.count} compras</span>
            <span>•</span>
            <span>${loyaltyData.spent.toLocaleString('es-MX')} acumulado</span>
          </div>
        )}

        <Separator />

        {/* Mini cart items */}
        {items.length > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                {items.length} producto{items.length !== 1 ? 's' : ''}
              </span>
              <button onClick={() => onStepChange('products')} className="text-primary hover:underline">
                Editar
              </button>
            </div>
            <ScrollArea className="max-h-[180px]">
              <div className="space-y-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1 px-1 rounded hover:bg-muted/50 group">
                    <span className="truncate flex-1 mr-2">{item.quantity}x {item.productName}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-center py-4">
            <ShoppingCart className="h-6 w-6 mx-auto mb-1 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Carrito vacío</p>
          </div>
        )}

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          {/* Discount inputs */}
          {items.length > 0 && (
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Desc. %
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => onDiscountPercentChange(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Desc. $
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => onDiscountAmountChange(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs text-destructive">
              <span>Descuento</span>
              <span>-${totalDiscount.toFixed(2)}</span>
            </div>
          )}

          {/* BIG TOTAL */}
          <div className="flex justify-between items-baseline pt-1 border-t border-border">
            <span className="text-sm font-medium">Total</span>
            <span className="text-3xl font-bold text-primary tracking-tight">
              ${total.toFixed(2)}
            </span>
          </div>
          {totalPaid > 0 && (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pagado</span>
                <span>${totalPaid.toFixed(2)}</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-sm font-semibold text-destructive">
                  <span>Saldo</span>
                  <span>${balance.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Estimated Commission */}
        {estimatedCommission > 0 && promotor && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Comisión est. ({promotor.nombre})
              </span>
              <span className="font-medium text-primary">${estimatedCommission.toFixed(2)}</span>
            </div>
          </>
        )}

        {/* CTA Button */}
        {items.length > 0 && (
          <>
            <Button
              className="w-full text-base h-12 font-semibold"
              size="lg"
              onClick={() => onStepChange('payment')}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              Cobrar ${total.toFixed(2)}
            </Button>

            {/* Draft actions */}
            {(onSaveDraft || onDiscard) && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {onSaveDraft && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={onSaveDraft}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Guardar Borrador
                    </Button>
                  )}
                  {onDiscard && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                      onClick={onDiscard}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Descartar
                    </Button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
