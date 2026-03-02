import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, ChevronUp, ChevronDown, Minus, Plus, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { usePOSCart } from '@/hooks/usePOSCart';
import { AnimatedCounter } from '@/components/ui/animations';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MobileCartProps {
  onCheckout: () => void;
  disabled?: boolean;
}

export function MobileCart({ onCheckout, disabled }: MobileCartProps) {
  const [open, setOpen] = useState(false);
  const cart = usePOSCart();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  return (
    <>
      {/* Floating Cart Summary - Always visible */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-bottom md:hidden"
      >
        <div className="flex items-center gap-3">
          {/* Cart toggle */}
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="outline"
                className="relative h-12 flex-1 justify-start gap-3"
              >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cart.items.length > 0 && (
                    <Badge
                      variant="default"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {cart.items.length}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">
                    {cart.items.length === 0 ? 'Carrito vacío' : `${cart.items.length} productos`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <AnimatedCounter value={cart.total} prefix="$" />
                  </p>
                </div>
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </DrawerTrigger>

            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader className="border-b">
                <DrawerTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrito ({cart.items.length})
                </DrawerTitle>
              </DrawerHeader>

              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mb-4 opacity-30" />
                  <p>No hay productos en el carrito</p>
                </div>
              ) : (
                <ScrollArea className="flex-1 max-h-[50vh]">
                  <div className="p-4 space-y-3">
                    <AnimatePresence mode="popLayout">
                      {cart.items.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-muted/50 rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.unitPrice)} c/u
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => cart.updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => cart.updateItem(item.id, { quantity: item.quantity + 1 })}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => cart.removeItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
                            <span className="text-xs text-muted-foreground">Subtotal</span>
                            <span className="font-medium text-sm">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}

              {cart.items.length > 0 && (
                <DrawerFooter className="border-t">
                  {/* Totals */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(cart.subtotal)}</span>
                    </div>
                    {(cart.discountAmount > 0 || cart.discountPercent > 0) && (
                      <div className="flex justify-between text-sm text-primary">
                        <span>Descuento</span>
                        <span>
                          -{formatCurrency(cart.discountAmount + (cart.subtotal * cart.discountPercent / 100))}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <AnimatedCounter value={cart.total} prefix="$" className="text-primary" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => cart.clearCart()}
                    >
                      Vaciar
                    </Button>
                    <Button
                      className="flex-1 h-12"
                      onClick={() => {
                        setOpen(false);
                        onCheckout();
                      }}
                      disabled={disabled || cart.items.length === 0}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Cobrar
                    </Button>
                  </div>
                </DrawerFooter>
              )}
            </DrawerContent>
          </Drawer>

          {/* Checkout button - always visible */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    size="lg"
                    className="h-12 px-6"
                    onClick={onCheckout}
                    disabled={disabled || cart.items.length === 0}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Cobrar
                  </Button>
                </div>
              </TooltipTrigger>
              {cart.items.length === 0 && (
                <TooltipContent>
                  <p>Agrega al menos un producto para continuar</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
    </>
  );
}
