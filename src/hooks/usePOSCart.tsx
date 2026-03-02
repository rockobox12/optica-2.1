import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { CartItem, PaymentInfo, CustomerInfo } from './useOfflineSync';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface PromotorInfo {
  id: string;
  nombre: string;
}

interface POSCartState {
  items: CartItem[];
  payments: PaymentInfo[];
  customer: CustomerInfo | null;
  prescriptionId: string | null;
  discountPercent: number;
  discountAmount: number;
  isCredit: boolean;
  creditDueDate: string | null;
  notes: string;
  promotor: PromotorInfo | null;
}

const DRAFT_KEY_PREFIX = 'draft:pos-cart:';
const DRAFT_VERSION = 1;
const BACKEND_SYNC_INTERVAL = 20000; // 20 seconds
const AUTOSAVE_DEBOUNCE = 1000; // 1 second
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old drafts on module load
function cleanupOldDrafts() {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_KEY_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const savedAt = new Date(parsed.savedAt).getTime();
            if (now - savedAt > DRAFT_MAX_AGE_MS) {
              keysToRemove.push(key);
            }
          }
        } catch {
          // Invalid data, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old POS drafts`);
    }
  } catch (error) {
    console.error('Error cleaning up old drafts:', error);
  }
}

// Run cleanup on module load
cleanupOldDrafts();

interface DraftData {
  state: POSCartState;
  savedAt: string;
  version: number;
}

interface BackendDraft {
  id: string;
  draft_data: Record<string, unknown>;
  updated_at: string;
}

function getDraftKey(userId?: string, branchId?: string | null): string {
  return `${DRAFT_KEY_PREFIX}${userId || 'anonymous'}:${branchId || 'default'}`;
}

export function usePOSCart() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [payments, setPayments] = useState<PaymentInfo[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isCredit, setIsCredit] = useState(false);
  const [creditDueDate, setCreditDueDate] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [promotor, setPromotor] = useState<PromotorInfo | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);
  const [draftSource, setDraftSource] = useState<'local' | 'cloud' | null>(null);
  const [isSyncingToCloud, setIsSyncingToCloud] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(null);
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const backendSyncRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const hasInitialized = useRef(false);
  const isDirtyRef = useRef(false);
  const backendDraftIdRef = useRef<string | null>(null);

  const draftKey = getDraftKey(user?.id, profile?.defaultBranchId);

  // Sync to backend
  const syncToBackend = useCallback(async (state: POSCartState, force = false) => {
    if (!user?.id || state.items.length === 0) return;
    
    // Only sync if dirty or forced
    if (!isDirtyRef.current && !force) return;
    
    setIsSyncingToCloud(true);
    try {
      const { data: result, error } = await supabase.rpc('upsert_draft', {
        p_user_id: user.id,
        p_branch_id: profile?.defaultBranchId || null,
        p_form_type: 'POS_SALE',
        p_entity_id: null,
        p_draft_data: state as unknown as Record<string, never>,
      });

      if (error) {
        console.error('Error syncing POS draft to cloud:', error);
        return;
      }

      if (result) {
        backendDraftIdRef.current = result;
        setLastCloudSync(new Date());
        isDirtyRef.current = false;
      }
    } catch (error) {
      console.error('Error syncing POS draft to cloud:', error);
    } finally {
      setIsSyncingToCloud(false);
    }
  }, [user?.id, profile?.defaultBranchId]);

  // Fetch backend draft
  const fetchBackendDraft = useCallback(async (): Promise<BackendDraft | null> => {
    if (!user?.id) return null;

    try {
      const { data, error } = await supabase.rpc('get_active_draft', {
        p_user_id: user.id,
        p_branch_id: profile?.defaultBranchId || null,
        p_form_type: 'POS_SALE',
        p_entity_id: null,
      });

      if (error) {
        console.error('Error fetching backend POS draft:', error);
        return null;
      }

      if (data && data.length > 0) {
        return data[0] as BackendDraft;
      }
      return null;
    } catch (error) {
      console.error('Error fetching backend POS draft:', error);
      return null;
    }
  }, [user?.id, profile?.defaultBranchId]);

  // Load draft on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadDrafts = async () => {
      let localDraft: DraftData | null = null;
      let cloudDraft: BackendDraft | null = null;

      // Try local first
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsed: DraftData = JSON.parse(savedDraft);
          if (parsed.version === DRAFT_VERSION && parsed.state && parsed.state.items?.length > 0) {
            localDraft = parsed;
          }
        }
      } catch (error) {
        console.error('Error loading local POS draft:', error);
      }

      // Then try backend
      cloudDraft = await fetchBackendDraft();
      if (cloudDraft) {
        backendDraftIdRef.current = cloudDraft.id;
      }

      // Determine which to use based on updated_at
      if (localDraft && cloudDraft) {
        const localTime = new Date(localDraft.savedAt).getTime();
        const cloudTime = new Date(cloudDraft.updated_at).getTime();
        
        if (cloudTime > localTime) {
          // Cloud is newer
          setDraftSource('cloud');
          setPendingDraft({
            state: cloudDraft.draft_data as unknown as POSCartState,
            savedAt: cloudDraft.updated_at,
            version: DRAFT_VERSION,
          });
        } else {
          // Local is newer
          setDraftSource('local');
          setPendingDraft(localDraft);
        }
        setShowRestorePrompt(true);
      } else if (cloudDraft) {
        const cloudState = cloudDraft.draft_data as unknown as POSCartState;
        if (cloudState.items && cloudState.items.length > 0) {
          setDraftSource('cloud');
          setPendingDraft({
            state: cloudState,
            savedAt: cloudDraft.updated_at,
            version: DRAFT_VERSION,
          });
          setShowRestorePrompt(true);
        }
      } else if (localDraft) {
        setDraftSource('local');
        setPendingDraft(localDraft);
        setShowRestorePrompt(true);
      }
    };

    loadDrafts();
  }, [draftKey, fetchBackendDraft]);

  // Current state for saving
  const currentState = useMemo((): POSCartState => ({
    items,
    payments,
    customer,
    prescriptionId,
    discountPercent,
    discountAmount,
    isCredit,
    creditDueDate,
    notes,
    promotor,
  }), [items, payments, customer, prescriptionId, discountPercent, discountAmount, isCredit, creditDueDate, notes, promotor]);

  // Auto-save draft when cart has items
  useEffect(() => {
    if (items.length === 0) {
      setHasUnsavedChanges(false);
      return;
    }

    const draftData: DraftData = {
      state: currentState,
      savedAt: new Date().toISOString(),
      version: DRAFT_VERSION,
    };
    const serialized = JSON.stringify(draftData);
    lastSavedRef.current = serialized;
    isDirtyRef.current = true;
    setHasUnsavedChanges(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, serialized);
        setLastLocalSave(new Date());
        // Brief toast for first auto-save
        if (!lastLocalSave) {
          toast({
            title: 'Autoguardado activado',
            description: 'Tu carrito se guardará automáticamente',
            duration: 2000,
          });
        }
      } catch (error) {
        console.error('Error saving POS draft:', error);
      }
    }, AUTOSAVE_DEBOUNCE);
  }, [currentState, draftKey, items.length, lastLocalSave, toast]);

  // Beforeunload warning when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (items.length > 0 && hasUnsavedChanges) {
        // Force save to localStorage before leaving
        if (lastSavedRef.current) {
          localStorage.setItem(draftKey, lastSavedRef.current);
        }
        // Show browser's native confirmation dialog
        e.preventDefault();
        e.returnValue = '¿Seguro que deseas salir? Tienes productos en el carrito.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [items.length, hasUnsavedChanges, draftKey]);

  // Periodic backend sync
  useEffect(() => {
    if (!user?.id) return;

    backendSyncRef.current = setInterval(() => {
      if (isDirtyRef.current && items.length > 0) {
        syncToBackend(currentState);
      }
    }, BACKEND_SYNC_INTERVAL);

    return () => {
      if (backendSyncRef.current) {
        clearInterval(backendSyncRef.current);
      }
    };
  }, [user?.id, currentState, syncToBackend, items.length]);

  // Handle visibility change - save immediately when hiding (LOCAL ONLY)
  // NOTE: We intentionally avoid backend calls here to prevent any auth refresh on tab switch.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && lastSavedRef.current && items.length > 0) {
        try {
          localStorage.setItem(draftKey, lastSavedRef.current);
          setLastLocalSave(new Date());
        } catch (error) {
          console.error('Error saving POS draft on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [draftKey, items.length]);

  // Restore draft
  const restoreDraft = useCallback(() => {
    if (pendingDraft?.state) {
      const s = pendingDraft.state;
      setItems(s.items || []);
      setPayments(s.payments || []);
      setCustomer(s.customer || null);
      setPrescriptionId(s.prescriptionId || null);
      setDiscountPercent(s.discountPercent || 0);
      setDiscountAmount(s.discountAmount || 0);
      setIsCredit(s.isCredit || false);
      setCreditDueDate(s.creditDueDate || null);
      setNotes(s.notes || '');
      setPromotor(s.promotor || null);
      setShowRestorePrompt(false);
      toast({
        title: 'Carrito restaurado',
        description: draftSource === 'cloud' 
          ? 'Se recuperó el carrito desde la nube'
          : 'Se recuperó el carrito guardado',
      });
    }
  }, [pendingDraft, draftSource, toast]);

  // Discard draft
  const discardDraft = useCallback(async () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
    
    // Mark backend draft as discarded
    if (backendDraftIdRef.current) {
      try {
        await supabase.rpc('resolve_draft', {
          p_draft_id: backendDraftIdRef.current,
          p_status: 'DISCARDED',
        });
        backendDraftIdRef.current = null;
      } catch (error) {
        console.error('Error discarding backend draft:', error);
      }
    }
    
    setPendingDraft(null);
    setShowRestorePrompt(false);
  }, [draftKey]);

  // Clear draft (on successful sale)
  const clearDraft = useCallback(async () => {
    try {
      localStorage.removeItem(draftKey);
      lastSavedRef.current = '';
      isDirtyRef.current = false;
      setLastLocalSave(null);
      setHasUnsavedChanges(false);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
    
    // Mark backend draft as submitted
    if (backendDraftIdRef.current) {
      try {
        await supabase.rpc('resolve_draft', {
          p_draft_id: backendDraftIdRef.current,
          p_status: 'SUBMITTED',
        });
        backendDraftIdRef.current = null;
      } catch (error) {
        console.error('Error resolving backend draft:', error);
      }
    }
  }, [draftKey]);

  // Manual save draft with toast notification
  const saveManualDraft = useCallback(() => {
    if (items.length === 0) {
      toast({
        title: 'Carrito vacío',
        description: 'No hay datos para guardar',
        variant: 'destructive',
      });
      return;
    }

    const draftData: DraftData = {
      state: currentState,
      savedAt: new Date().toISOString(),
      version: DRAFT_VERSION,
    };

    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastLocalSave(new Date());
      setHasUnsavedChanges(false);
      isDirtyRef.current = false;
      
      toast({
        title: 'Borrador guardado',
        description: 'Puedes continuar esta venta más tarde',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el borrador',
        variant: 'destructive',
      });
    }
  }, [items.length, currentState, draftKey, toast]);

  // Calculate totals
  const subtotal = useMemo(() => 
    items.reduce((sum, item) => sum + item.subtotal, 0), 
    [items]
  );

  const totalDiscount = useMemo(() => {
    const percentDiscount = subtotal * (discountPercent / 100);
    return percentDiscount + discountAmount;
  }, [subtotal, discountPercent, discountAmount]);

  const total = useMemo(() => 
    Math.max(0, subtotal - totalDiscount), 
    [subtotal, totalDiscount]
  );

  const totalPaid = useMemo(() => 
    payments.reduce((sum, p) => sum + p.amount, 0), 
    [payments]
  );

  const balance = useMemo(() => total - totalPaid, [total, totalPaid]);

  const change = useMemo(() => 
    totalPaid > total ? totalPaid - total : 0, 
    [total, totalPaid]
  );

  // Backfill missing categoryName for items restored from drafts
  useEffect(() => {
    const itemsMissingCategory = items.filter(i => !i.categoryName && i.productCode);
    if (itemsMissingCategory.length === 0) return;

    const codes = itemsMissingCategory.map(i => i.productCode!);
    
    supabase
      .from('products')
      .select('sku, category_id, product_categories(name)')
      .in('sku', codes)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        
        const categoryMap = new Map<string, { categoryId?: string; categoryName?: string }>();
        data.forEach((p: any) => {
          categoryMap.set(p.sku, {
            categoryId: p.category_id || undefined,
            categoryName: p.product_categories?.name || undefined,
          });
        });

        setItems(prev => prev.map(item => {
          if (item.categoryName || !item.productCode) return item;
          const cat = categoryMap.get(item.productCode);
          if (!cat?.categoryName) return item;
          return { ...item, categoryId: cat.categoryId, categoryName: cat.categoryName };
        }));
      });
  }, [items.length]); // Only re-run when item count changes

  // Add item to cart
  const addItem = useCallback((item: Omit<CartItem, 'id' | 'subtotal'>) => {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const itemDiscount = item.unitPrice * item.quantity * (item.discountPercent / 100) + item.discountAmount;
    const subtotal = item.unitPrice * item.quantity - itemDiscount;
    
    setItems(prev => [...prev, { ...item, id, subtotal }]);
  }, []);

  // Update item
  const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, ...updates };
      const itemDiscount = updated.unitPrice * updated.quantity * (updated.discountPercent / 100) + updated.discountAmount;
      updated.subtotal = updated.unitPrice * updated.quantity - itemDiscount;
      
      return updated;
    }));
  }, []);

  // Remove item
  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Add payment
  const addPayment = useCallback((payment: PaymentInfo) => {
    setPayments(prev => [...prev, payment]);
  }, []);

  // Remove payment
  const removePayment = useCallback((index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Clear cart
  const clearCart = useCallback(() => {
    setItems([]);
    setPayments([]);
    setCustomer(null);
    setPrescriptionId(null);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setIsCredit(false);
    setCreditDueDate(null);
    setNotes('');
    setPromotor(null);
    // Also clear the draft
    clearDraft();
  }, [clearDraft]);

  // Apply prescription to cart
  const applyPrescription = useCallback((prescription: Record<string, unknown>) => {
    setPrescriptionId(prescription.id as string);
    
    // Add lens items based on prescription
    const lensItem: Omit<CartItem, 'id' | 'subtotal'> = {
      productType: 'lens',
      productName: 'Lentes Oftálmicos',
      description: `OD: ${prescription.od_sphere || 0} / ${prescription.od_cylinder || 0} x ${prescription.od_axis || 0}° | OI: ${prescription.oi_sphere || 0} / ${prescription.oi_cylinder || 0} x ${prescription.oi_axis || 0}°`,
      quantity: 1,
      unitPrice: 0, // Price to be set
      discountPercent: 0,
      discountAmount: 0,
      prescriptionData: {
        od: { 
          sphere: prescription.od_sphere as number, 
          cylinder: prescription.od_cylinder as number, 
          axis: prescription.od_axis as number, 
          add: prescription.od_add as number 
        },
        oi: { 
          sphere: prescription.oi_sphere as number, 
          cylinder: prescription.oi_cylinder as number, 
          axis: prescription.oi_axis as number, 
          add: prescription.oi_add as number 
        },
        lensType: prescription.lens_type as string,
        lensMaterial: prescription.lens_material as string,
        lensTreatment: prescription.lens_treatment as string,
      },
    };
    
    addItem(lensItem);
  }, [addItem]);

  return {
    // State
    items,
    payments,
    customer,
    prescriptionId,
    discountPercent,
    discountAmount,
    isCredit,
    creditDueDate,
    notes,
    promotor,
    
    // Draft state
    showRestorePrompt,
    pendingDraft,
    draftSource,
    isSyncingToCloud,
    lastCloudSync,
    lastLocalSave,
    hasUnsavedChanges,
    
    // Calculated values
    subtotal,
    totalDiscount,
    total,
    totalPaid,
    balance,
    change,
    
    // Actions
    addItem,
    updateItem,
    removeItem,
    addPayment,
    removePayment,
    clearCart,
    setCustomer,
    setPrescriptionId,
    setDiscountPercent,
    setDiscountAmount,
    setIsCredit,
    setCreditDueDate,
    setNotes,
    applyPrescription,
    setPromotor,
    
    // Draft actions
    restoreDraft,
    discardDraft,
    clearDraft,
    saveManualDraft,
  };
}
