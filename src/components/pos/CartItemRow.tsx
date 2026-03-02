import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Minus, Plus } from 'lucide-react';
import type { CartItem } from '@/hooks/useOfflineSync';

interface CartItemRowProps {
  item: CartItem;
  onUpdate: (updates: Partial<CartItem>) => void;
  onRemove: () => void;
}

export function CartItemRow({ item, onUpdate, onRemove }: CartItemRowProps) {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, item.quantity + delta);
    onUpdate({ quantity: newQuantity });
  };

  // Display the real category name, fallback to productType label
  const displayCategory = item.categoryName || (item.productType === 'service' ? 'Servicio' : 'Sin categoría');

  return (
    <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {displayCategory}
          </Badge>
          {item.productCode && (
            <span className="text-xs text-muted-foreground">{item.productCode}</span>
          )}
        </div>
        <div className="font-medium text-sm truncate">{item.productName}</div>
        {item.description && (
          <div className="text-xs text-muted-foreground truncate">{item.description}</div>
        )}
        {item.prescriptionData && (
          <div className="text-xs text-blue-600 mt-1">Con receta adjunta</div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleQuantityChange(-1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onUpdate({ quantity: Number(e.target.value) || 1 })}
          className="w-12 h-7 text-center p-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => handleQuantityChange(1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="text-right min-w-[80px]">
        <div className="font-medium text-sm">${item.subtotal.toFixed(2)}</div>
        {item.quantity > 1 && (
          <div className="text-xs text-muted-foreground">
            ${item.unitPrice.toFixed(2)} c/u
          </div>
        )}
        {item.discountPercent > 0 && (
          <div className="text-xs text-red-600">-{item.discountPercent}%</div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
