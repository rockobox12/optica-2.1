import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, X, User, Handshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaleDetailModalProps {
  saleId: string | null;
  onClose: () => void;
}

interface SaleDetail {
  id: string;
  sale_number: string;
  created_at: string;
  total: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  is_credit: boolean;
  notes: string | null;
  branch_name: string | null;
  sold_by_name: string | null;
  promotor_name: string | null;
  items: SaleItem[];
  payments: SalePayment[];
}

interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  description: string;
}

interface SalePayment {
  id: string;
  amount: number;
  payment_method: string;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  check: 'Cheque',
  credit: 'Crédito',
};

export function SaleDetailModal({ saleId, onClose }: SaleDetailModalProps) {
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (saleId) {
      fetchSaleDetail(saleId);
    } else {
      setSale(null);
    }
  }, [saleId]);

  // ESC key & body scroll lock
  useEffect(() => {
    if (!saleId) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [saleId, onClose]);

  const fetchSaleDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sale + branch + items + payments in parallel
      const [saleRes, itemsRes, paymentsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('id, sale_number, created_at, total, subtotal, discount_amount, tax_amount, amount_paid, balance, status, is_credit, notes, seller_id, promotor_id, branch_id, branches(name)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('sale_items')
          .select('id, quantity, unit_price, subtotal, discount_amount, product_name, product_type, description')
          .eq('sale_id', id),
        supabase
          .from('sale_payments')
          .select('id, amount, payment_method')
          .eq('sale_id', id),
      ]);

      if (saleRes.error || !saleRes.data) {
        setError(`Error cargando detalle de venta${saleRes.error ? ` (${saleRes.error.code})` : ''}`);
        setLoading(false);
        return;
      }

      const sd = saleRes.data;

      // Resolve seller & promotor names in parallel
      const [profileRes, promotorRes] = await Promise.all([
        sd.seller_id
          ? supabase.from('profiles').select('full_name').eq('user_id', sd.seller_id).maybeSingle()
          : Promise.resolve({ data: null }),
        sd.promotor_id
          ? supabase.from('promotores').select('nombre_completo').eq('id', sd.promotor_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const items: SaleItem[] = (itemsRes.data || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        discount_amount: item.discount_amount,
        description: item.product_name || item.description || 'Producto',
      }));

      setSale({
        id: sd.id,
        sale_number: sd.sale_number,
        created_at: sd.created_at,
        total: sd.total,
        subtotal: sd.subtotal,
        discount_amount: sd.discount_amount,
        tax_amount: sd.tax_amount,
        amount_paid: sd.amount_paid,
        balance: sd.balance,
        status: sd.status,
        is_credit: sd.is_credit,
        notes: sd.notes,
        branch_name: (sd.branches as any)?.name || null,
        sold_by_name: (profileRes.data as any)?.full_name || null,
        promotor_name: (promotorRes.data as any)?.nombre_completo || null,
        items,
        payments: (paymentsRes.data || []) as any[],
      });
    } catch (err) {
      console.error('SaleDetailModal fetch error:', err);
      setError('Error inesperado cargando detalle de venta');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'completed': return 'Pagado';
      case 'partial': return 'Parcial';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelado';
      default: return s;
    }
  };

  const statusVariant = (s: string) => {
    switch (s) {
      case 'completed': return 'default' as const;
      case 'partial': return 'secondary' as const;
      case 'cancelled': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  return createPortal(
    <AnimatePresence>
      {!!saleId && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal container – centered */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-label="Detalle de venta"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto bg-background border shadow-2xl rounded-xl flex flex-col overflow-hidden"
              style={{ width: 'min(1100px, 92vw)', maxHeight: '90vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <h2 className="text-lg font-semibold">Detalle de venta</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full min-w-[44px] min-h-[44px]" aria-label="Cerrar">
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">Cargando detalle...</span>
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => saleId && fetchSaleDetail(saleId)}>
                      Reintentar
                    </Button>
                  </div>
                ) : sale ? (
                  <div className="space-y-6">
                    {/* Header info */}
                    {/* Folio / Fecha / Sucursal / Estatus */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block text-xs">Folio</span>
                        <span className="font-mono font-medium">{sale.sale_number}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Fecha</span>
                        <span>{format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Sucursal</span>
                        <span>{sale.branch_name || 'Sucursal no registrada'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Estatus</span>
                        <Badge variant={statusVariant(sale.status)} className="text-xs mt-0.5">
                          {statusLabel(sale.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Atendió & Promotor — highlighted cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] text-muted-foreground leading-tight">Atendió</span>
                          <span className="block text-sm font-semibold truncate">{sale.sold_by_name || 'Sin registro'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/60">
                          <Handshake className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[11px] text-muted-foreground leading-tight">Promotor</span>
                          <span className="block text-sm font-semibold truncate">
                            {sale.promotor_name || 'Óptica Istmeña (Llegó solo)'}
                          </span>
                          {sale.promotor_name && sale.promotor_name !== 'Óptica Istmeña (Paciente llegó solo)' && (
                            <span className="block text-[10px] text-muted-foreground mt-0.5">Esta venta genera comisión para el promotor</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items table */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Productos / Servicios</h4>
                      <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Cant.</th>
                              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Descripción</th>
                              <th className="text-right px-4 py-2 font-medium text-muted-foreground">P. Unit.</th>
                              <th className="text-right px-4 py-2 font-medium text-muted-foreground">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.items.map((item) => (
                              <tr key={item.id} className="border-b border-border last:border-b-0">
                                <td className="px-4 py-2 whitespace-nowrap">{item.quantity}</td>
                                <td className="px-4 py-2">{item.description}</td>
                                <td className="px-4 py-2 text-right font-mono">${item.unit_price?.toFixed(2)}</td>
                                <td className="px-4 py-2 text-right font-mono">${item.subtotal?.toFixed(2)}</td>
                              </tr>
                            ))}
                            {sale.items.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-xs">
                                  Esta venta no tiene productos registrados. Revisar captura de venta.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                      <h4 className="font-semibold mb-2">Resumen</h4>
                      {sale.discount_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Descuento</span>
                          <span className="text-destructive">-${sale.discount_amount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
                        <span>Total</span>
                        <span>${sale.total?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pagado</span>
                        <span className="text-primary">${sale.amount_paid?.toFixed(2)}</span>
                      </div>
                      {sale.balance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Restante</span>
                          <span className="text-destructive font-medium">${sale.balance.toFixed(2)}</span>
                        </div>
                      )}
                      {sale.payments.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Método(s)</span>
                          <span>
                            {[...new Set(sale.payments.map(p => paymentMethodLabels[p.payment_method] || p.payment_method))].join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Fixed Footer */}
              <div className="flex justify-end px-6 py-3 border-t border-border shrink-0">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
