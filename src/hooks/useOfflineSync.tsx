import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const OFFLINE_SALES_KEY = 'optica_offline_sales';

export interface OfflineSale {
  id: string;
  items: CartItem[];
  payments: PaymentInfo[];
  customer: CustomerInfo | null;
  prescriptionId: string | null;
  isCredit: boolean;
  creditDueDate: string | null;
  discountAmount: number;
  discountPercent: number;
  notes: string;
  createdAt: string;
}

export interface CartItem {
  id: string;
  productType: string;
  productName: string;
  productCode?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  subtotal: number;
  prescriptionData?: any;
}

export interface PaymentInfo {
  method: 'cash' | 'card' | 'transfer' | 'check' | 'credit';
  amount: number;
  reference?: string;
}

export interface CustomerInfo {
  patientId?: string;
  name: string;
  phone?: string;
  email?: string;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingSales();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending sales on mount
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = () => {
    const stored = localStorage.getItem(OFFLINE_SALES_KEY);
    const sales: OfflineSale[] = stored ? JSON.parse(stored) : [];
    setPendingSales(sales.length);
  };

  const saveOfflineSale = useCallback((sale: OfflineSale) => {
    const stored = localStorage.getItem(OFFLINE_SALES_KEY);
    const sales: OfflineSale[] = stored ? JSON.parse(stored) : [];
    sales.push(sale);
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(sales));
    updatePendingCount();
  }, []);

  const syncPendingSales = useCallback(async () => {
    if (isSyncing) return;
    
    const stored = localStorage.getItem(OFFLINE_SALES_KEY);
    const sales: OfflineSale[] = stored ? JSON.parse(stored) : [];
    
    if (sales.length === 0) return;

    setIsSyncing(true);
    let syncedCount = 0;
    const failedSales: OfflineSale[] = [];

    for (const sale of sales) {
      try {
        // Generate sale number
        const { data: saleNumberData } = await supabase.rpc('generate_sale_number');
        const saleNumber = saleNumberData || `VTA-OFFLINE-${sale.id}`;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Calculate totals
        const subtotal = sale.items.reduce((sum, item) => sum + item.subtotal, 0);
        const total = subtotal - sale.discountAmount;
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);

        // Create sale
        const { data: saleData, error: saleError } = await supabase
          .from('sales')
          .insert({
            sale_number: saleNumber,
            patient_id: sale.customer?.patientId || null,
            prescription_id: sale.prescriptionId || null,
            seller_id: user?.id,
            customer_name: sale.customer?.name || null,
            customer_phone: sale.customer?.phone || null,
            customer_email: sale.customer?.email || null,
            subtotal,
            discount_amount: sale.discountAmount,
            discount_percent: sale.discountPercent,
            tax_amount: 0,
            total,
            amount_paid: amountPaid,
            balance: total - amountPaid,
            status: amountPaid >= total ? 'completed' : (amountPaid > 0 ? 'partial' : 'pending'),
            is_credit: sale.isCredit,
            credit_due_date: sale.creditDueDate,
            offline_id: sale.id,
            synced_at: new Date().toISOString(),
            notes: sale.notes,
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Insert items
        const itemsToInsert = sale.items.map(item => ({
          sale_id: saleData.id,
          product_type: item.productType,
          product_name: item.productName,
          product_code: item.productCode,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_percent: item.discountPercent,
          discount_amount: item.discountAmount,
          subtotal: item.subtotal,
          prescription_data: item.prescriptionData,
          category_id: item.categoryId || null,
          category_name: item.categoryName || null,
        }));

        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // Insert payments
        const paymentsToInsert = sale.payments.map(payment => ({
          sale_id: saleData.id,
          payment_method: payment.method,
          amount: payment.amount,
          reference: payment.reference,
          received_by: user?.id,
        }));

        const { error: paymentsError } = await supabase
          .from('sale_payments')
          .insert(paymentsToInsert);

        if (paymentsError) throw paymentsError;

        syncedCount++;
      } catch (error) {
        console.error('Error syncing sale:', error);
        failedSales.push(sale);
      }
    }

    // Save only failed sales back to localStorage
    localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(failedSales));
    updatePendingCount();
    setIsSyncing(false);

    if (syncedCount > 0) {
      toast({
        title: 'Sincronización completada',
        description: `${syncedCount} venta(s) sincronizada(s) correctamente`,
      });
    }

    if (failedSales.length > 0) {
      toast({
        title: 'Algunas ventas no se sincronizaron',
        description: `${failedSales.length} venta(s) pendiente(s)`,
        variant: 'destructive',
      });
    }
  }, [isSyncing, toast]);

  return {
    isOnline,
    pendingSales,
    isSyncing,
    saveOfflineSale,
    syncPendingSales,
  };
}
