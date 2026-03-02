import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { usePOSCart } from '@/hooks/usePOSCart';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ProductSelector } from './ProductSelector';
import { CartItemRow } from './CartItemRow';
import { PaymentPanel } from './PaymentPanel';
import { CustomerSelector } from './CustomerSelector';
import { PrescriptionSelector } from './PrescriptionSelector';
import { PromotorSelector, DEFAULT_PROMOTOR_ID } from './PromotorSelector';
import { ThermalTicket } from './ThermalTicket';
import { PrescriptionBanner } from './PrescriptionBanner';
import { POSLabOrderModal } from './POSLabOrderModal';
import { PrescriptionRequiredModal } from './PrescriptionRequiredModal';
import { CreditPaymentPlanModal, type CreatedPlan } from './CreditPaymentPlanModal';
import { POSStepIndicator, type POSStep } from './POSStepIndicator';
import { POSSummaryPanel } from './POSSummaryPanel';
import { Plus, Trash2, User, Receipt, Printer, FileText, Eye, RotateCcw, AlertCircle, AlertTriangle, Cloud, FlaskConical, Package, Save, Clock, ShoppingCart, Store, MapPin, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PackageSelector } from './PackageSelector';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { DeliveryScheduleModal } from './DeliveryScheduleModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useCashSession } from '@/hooks/useCashSession';
import { CashSessionGuard } from '@/components/cashregister/CashSessionGuard';
import { usePatientCreditStatus } from '@/hooks/usePatientCreditStatus';
import { CreditAlertBanner } from '@/components/patients/CreditAlertBanner';
import { useCreditSettings } from '@/hooks/useCreditSettings';
import { MorosoBlockModal } from './MorosoBlockModal';


// Helper to format time ago
function formatTimeAgo(date: Date | null): string {
  if (!date) return '';
  return formatDistanceToNow(date, { addSuffix: false, locale: es });
}

interface POSPreloadParams {
  fromExam: boolean;
  patientId: string | null;
  examId: string | null;
  prescriptionId: string | null;
}

interface POSTerminalProps {
  preloadParams?: POSPreloadParams;
  onClose?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function POSTerminal({ preloadParams, onClose, onDirtyChange }: POSTerminalProps) {
  const [currentStep, setCurrentStep] = useState<POSStep>('patient');
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showPackageSelector, setShowPackageSelector] = useState(false);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showPrescriptionSelector, setShowPrescriptionSelector] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const [completedPayments, setCompletedPayments] = useState<any[]>([]);
  const [completedCustomer, setCompletedCustomer] = useState<any>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [promotorError, setPromotorError] = useState(false);
  const [showPreloadBanner, setShowPreloadBanner] = useState(false);
  const [preloadedPatientId, setPreloadedPatientId] = useState<string | null>(null);
  const [preloadedExamId, setPreloadedExamId] = useState<string | null>(null);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);
  const [createdLabOrder, setCreatedLabOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [timeAgoLabel, setTimeAgoLabel] = useState<string>('');
  const [showMorosoBlock, setShowMorosoBlock] = useState(false);
  const [morosoExceptionGranted, setMorosoExceptionGranted] = useState(false);
  const [fallbackBranchId, setFallbackBranchId] = useState<string | null>(null);
  const [showPrescriptionRequired, setShowPrescriptionRequired] = useState(false);
  const [prescriptionExceptionGranted, setPrescriptionExceptionGranted] = useState(false);
  const [prescriptionCategoryIds, setPrescriptionCategoryIds] = useState<Set<string>>(new Set());
  const [saleChannel, setSaleChannel] = useState<'OPTICA' | 'CAMPO'>('OPTICA');
  const [campoCobradorId, setCampoCobradorId] = useState<string | null>(null);
  const [campoCobradorName, setCampoCobradorName] = useState<string | null>(null);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [pendingCreditSale, setPendingCreditSale] = useState<any>(null);
  const [createdPaymentPlan, setCreatedPaymentPlan] = useState<CreatedPlan | null>(null);
  
  
  const cart = usePOSCart();
  const { isOnline, saveOfflineSale } = useOfflineSync();
  const { profile, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cashSession = useCashSession();
  const posCreditStatus = usePatientCreditStatus(cart.customer?.patientId || null);
  const creditSettings = useCreditSettings();

  // Notify parent about dirty state (items in cart)
  useEffect(() => {
    onDirtyChange?.(cart.items.length > 0);
  }, [cart.items.length, onDirtyChange]);

  // Auto-advance steps based on state
  useEffect(() => {
    // If customer just selected and we're on patient step, advance to products
    if (cart.customer && currentStep === 'patient') {
      setCurrentStep('products');
    }
  }, [cart.customer]);

  // Fetch cobradores for campo sales
  const { data: posCobradores = [] } = useQuery({
    queryKey: ['pos-cobradores'],
    queryFn: async () => {
      const { data: cobradorRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'cobrador');
      if (!cobradorRoles || cobradorRoles.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true)
        .in('user_id', cobradorRoles.map(r => r.user_id));
      return data || [];
    },
  });

  // Fetch fallback branch if profile has no default
  useEffect(() => {
    if (!profile?.defaultBranchId) {
      supabase
        .from('branches')
        .select('id')
        .eq('is_active', true)
        .order('is_main', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setFallbackBranchId(data.id);
        });
    }
  }, [profile?.defaultBranchId]);

  // Fetch categories that require prescription
  useEffect(() => {
    supabase
      .from('product_categories')
      .select('id, requires_prescription')
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) {
          const ids = (data as any[]).filter(c => c.requires_prescription).map(c => c.id);
          setPrescriptionCategoryIds(new Set(ids));
        }
      });
  }, []);

  // Reset moroso exception when customer changes
  useEffect(() => {
    setMorosoExceptionGranted(false);
    setPrescriptionExceptionGranted(false);
  }, [cart.customer?.patientId]);

  // Update time ago label every 10 seconds
  useEffect(() => {
    if (!cart.lastLocalSave) {
      setTimeAgoLabel('');
      return;
    }
    const update = () => setTimeAgoLabel(formatTimeAgo(cart.lastLocalSave));
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [cart.lastLocalSave]);

  // Check if user can create lab orders
  const canCreateLabOrder = hasAnyRole(['admin', 'doctor', 'asistente']);

  const hasLensItems = useMemo(() => {
    return cart.items.some(item => 
      item.productType === 'lens' || 
      item.productType === 'lentes' ||
      item.prescriptionData != null ||
      (item.productName?.toLowerCase().includes('lente') ?? false) ||
      (item.productName?.toLowerCase().includes('tratamiento') ?? false)
    );
  }, [cart.items]);

  const showLabOrderButton = canCreateLabOrder && cart.customer?.patientId && (hasLensItems || cart.prescriptionId);

  // Handle preload from clinical module
  useEffect(() => {
    if (preloadParams?.patientId) {
      setPreloadedPatientId(preloadParams.patientId);
      setPreloadedExamId(preloadParams.examId);
      setShowPreloadBanner(true);
      if (preloadParams.prescriptionId) {
        cart.setPrescriptionId(preloadParams.prescriptionId);
      }
    }
  }, [preloadParams]);

  // Create sale mutation
  const createSale = useMutation({
    mutationFn: async () => {
      if (cart.items.length === 0) {
        throw new Error('No puedes finalizar una venta sin productos o servicios agregados.');
      }
      if (!cart.promotor) {
        throw new Error('Debe seleccionar un promotor');
      }

      // === CRITICAL: Validate patient_id exists in patients table ===
      const patientId = cart.customer?.patientId || null;
      if (patientId) {
        const { data: patientExists, error: patientCheckError } = await supabase
          .from('patients')
          .select('id')
          .eq('id', patientId)
          .maybeSingle();

        if (patientCheckError) {
          console.error('🚨 Error validando paciente:', patientCheckError);
        }

        if (!patientExists) {
          console.error('🚨 patient_id inválido — no existe en patients:', { patient_id_enviado: patientId, source: preloadParams?.fromExam ? 'exam' : 'pos' });
          // Reset customer to prevent further attempts
          cart.setCustomer(null);
          throw new Error('El cliente seleccionado ya no existe o no es válido. Vuelve a seleccionar el cliente.');
        }
      }

      // Log for debugging
      if (import.meta.env.DEV) {
        console.log('📋 POS createSale:', {
          patient_id_enviado: patientId,
          exam_id: preloadedExamId,
          source: preloadParams?.fromExam ? 'exam' : 'pos',
          items: cart.items.length,
          total: cart.total,
        });
      }

      if (!isOnline) {
        const offlineSale = {
          id: `offline-${Date.now()}`,
          items: cart.items,
          payments: cart.payments,
          customer: cart.customer,
          prescriptionId: cart.prescriptionId,
          promotorId: cart.promotor.id,
          promotorNombre: cart.promotor.nombre,
          isCredit: cart.isCredit,
          creditDueDate: cart.creditDueDate,
          discountAmount: cart.discountAmount + (cart.subtotal * cart.discountPercent / 100),
          discountPercent: cart.discountPercent,
          notes: cart.notes,
          createdAt: new Date().toISOString(),
        };
        saveOfflineSale(offlineSale);
        return { offline: true, saleNumber: offlineSale.id };
      }

      const { data: saleNumber } = await supabase.rpc('generate_sale_number');
      
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_number: saleNumber,
          patient_id: patientId,
          prescription_id: cart.prescriptionId,
          branch_id: profile?.defaultBranchId || fallbackBranchId || null,
          seller_id: profile?.userId,
          customer_name: cart.customer?.name || null,
          customer_phone: cart.customer?.phone || null,
          customer_email: cart.customer?.email || null,
          subtotal: cart.subtotal,
          discount_amount: cart.discountAmount + (cart.subtotal * cart.discountPercent / 100),
          discount_percent: cart.discountPercent,
          tax_amount: 0,
          total: cart.total,
          amount_paid: cart.totalPaid,
          balance: cart.balance,
          status: cart.totalPaid >= cart.total ? 'completed' : (cart.totalPaid > 0 ? 'partial' : 'pending'),
          is_credit: cart.isCredit,
          credit_due_date: cart.creditDueDate,
          notes: cart.notes,
          promotor_id: cart.promotor.id,
          promotor_nombre: cart.promotor.nombre,
          sale_channel: saleChannel,
          sale_responsible_type: saleChannel === 'CAMPO' ? 'COBRADOR' : 'OPTICA',
          sale_responsible_user_id: saleChannel === 'CAMPO' ? campoCobradorId : null,
          sale_responsible_name_snapshot: saleChannel === 'CAMPO' ? campoCobradorName : 'Óptica Istmeña',
        })
        .select()
        .single();

      if (saleError) throw saleError;

      const itemsToInsert = cart.items.map(item => ({
        sale_id: sale.id,
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

      await supabase.from('sale_items').insert(itemsToInsert);

      if (cart.payments.length > 0) {
        const paymentsToInsert = cart.payments.map(payment => ({
          sale_id: sale.id,
          payment_method: payment.method,
          amount: payment.amount,
          reference: payment.reference,
          received_by: profile?.userId,
        }));
        await supabase.from('sale_payments').insert(paymentsToInsert);
      }

      if (cart.promotor.id !== DEFAULT_PROMOTOR_ID && sale.status === 'completed') {
        await generateCommission(sale.id, cart.promotor.id, cart.total);
      }

      if (cart.payments.length > 0 && cashSession.isOpen) {
        await cashSession.registerSaleMovements(
          sale.id,
          cart.payments.map(p => ({ method: p.method, amount: p.amount, reference: p.reference })),
          saleNumber,
        );
      }

      return { ...sale, saleNumber };
    },
    onSuccess: (data) => {
      const snapshotItems = [...cart.items];
      const snapshotPayments = [...cart.payments];
      const snapshotCustomer = cart.customer ? { ...cart.customer } : null;
      const wasCredit = cart.isCredit;
      
      setCompletedItems(snapshotItems);
      setCompletedPayments(snapshotPayments);
      setCompletedCustomer(snapshotCustomer);
      setCompletedSale(data);
      setCreatedLabOrder(null);
      setPromotorError(false);
      setSaleChannel('OPTICA');
      setCampoCobradorId(null);
      setCampoCobradorName(null);
      setCreatedPaymentPlan(null);
      
      if (wasCredit && !data.offline && (data as any).balance > 0 && (snapshotCustomer?.patientId || (data as any).patient_id)) {
        setPendingCreditSale(data);
        setShowPaymentPlanModal(true);
        cart.clearCart();
      } else {
        setShowTicket(true);
        cart.clearCart();
      }
      
      // Reset step to patient for next sale
      setCurrentStep('patient');
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['promotor-comisiones'] });
      toast({
        title: data.offline ? 'Venta guardada offline' : 'Venta completada',
        description: data.offline 
          ? 'Se sincronizará cuando haya conexión'
          : `Venta ${data.saleNumber} registrada`,
      });
    },
    onError: (error: any) => {
      const code = error?.code || error?.status || error?.statusCode || '';
      const hint = error?.hint || '';
      const details = error?.details || '';
      const msg = error?.message || 'Error desconocido';
      
      console.error('🚨 Error al crear venta:', { payload: { items: cart.items.length, total: cart.total, payments: cart.payments }, error });
      
      toast({
        title: `Error al crear venta${code ? ` (${code})` : ''}`,
        description: [msg, hint, details].filter(Boolean).join(' — '),
        variant: 'destructive',
      });
    },
  });

  // Generate commission for external promotor
  const generateCommission = async (saleId: string, promotorId: string, saleTotal: number) => {
    try {
      const { data: config } = await supabase
        .from('promotor_commission_config')
        .select('*')
        .or(`promotor_id.eq.${promotorId},promotor_id.is.null`)
        .eq('activo', true)
        .order('promotor_id', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!config) return;

      let commissionAmount = 0;
      if (config.tipo_comision === 'porcentaje') {
        commissionAmount = saleTotal * (config.valor_comision / 100);
      } else {
        commissionAmount = config.valor_comision;
      }

      const periodo = format(new Date(), 'yyyy-MM');
      await supabase.from('promotor_comisiones').insert({
        promotor_id: promotorId,
        sale_id: saleId,
        monto_venta: saleTotal,
        monto_comision: commissionAmount,
        tipo_comision: config.tipo_comision,
        valor_aplicado: config.valor_comision,
        periodo,
        status: 'PENDIENTE',
      });
    } catch (error) {
      console.error('Error generating commission:', error);
    }
  };

  const getLensItemsRequiringPrescription = () => {
    return cart.items.filter(item => 
      item.categoryId && prescriptionCategoryIds.has(item.categoryId)
    );
  };

  const handleFinalizeSale = () => {
    if (cart.items.length === 0) {
      toast({
        title: 'No puedes finalizar una venta sin productos',
        description: 'Agrega al menos un producto o servicio al carrito para continuar.',
        variant: 'destructive',
      });
      return;
    }

    // Validate patient_id is present for credit sales
    if (cart.isCredit && !cart.customer?.patientId) {
      toast({
        title: 'Cliente registrado requerido para crédito',
        description: cart.customer
          ? `"${cart.customer.name}" fue ingresado manualmente. Para ventas a crédito, selecciona un paciente del buscador.`
          : 'Selecciona un cliente registrado desde el buscador para ventas a crédito.',
        variant: 'destructive',
      });
      // Go back to patient step so they can select properly
      setCurrentStep('patient');
      return;
    }

    if (cart.total > 0 && cart.items.length === 0) {
      toast({
        title: 'Error de integridad',
        description: 'El total no coincide con productos registrados. Vacía el carrito e intenta de nuevo.',
        variant: 'destructive',
      });
      return;
    }

    const lensItems = getLensItemsRequiringPrescription();
    if (lensItems.length > 0 && !cart.prescriptionId && !prescriptionExceptionGranted) {
      setShowPrescriptionRequired(true);
      return;
    }

    if (
      creditSettings.settings.blockSalesToMorosos &&
      posCreditStatus.isMoroso &&
      !morosoExceptionGranted
    ) {
      setShowMorosoBlock(true);
      return;
    }

    if (!cashSession.isOpen && isOnline && (!cart.isCredit || cart.payments.length > 0)) {
      toast({
        title: 'Caja cerrada',
        description: 'Debes abrir caja antes de cobrar',
        variant: 'destructive',
      });
      return;
    }

    if (!cart.promotor) {
      setPromotorError(true);
      toast({
        title: 'Promotor requerido',
        description: 'Debe seleccionar un promotor para continuar',
        variant: 'destructive',
      });
      return;
    }

    if (saleChannel === 'CAMPO' && !campoCobradorId) {
      toast({
        title: 'Cobrador requerido',
        description: 'Debes asignar un cobrador para ventas en campo.',
        variant: 'destructive',
      });
      return;
    }

    if (!cart.isCredit && cart.balance > 0.01) {
      toast({
        title: 'Pago incompleto',
        description: 'El monto pagado no cubre el total',
        variant: 'destructive',
      });
      return;
    }

    setPromotorError(false);
    createSale.mutate();
  };

  // =========== STEP RENDERERS ===========

  const renderPatientStep = () => (
    <div className="space-y-4">
      {/* Quick select or search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Seleccionar Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerSelector
            onSelect={(customer) => {
              cart.setCustomer(customer);
              if (customer.patientId) {
                (async () => {
                  try {
                    const { data: pat } = await supabase
                      .from('patients')
                      .select('referido_promotor_id, referred_by')
                      .eq('id', customer.patientId!)
                      .single();
                    if (pat?.referido_promotor_id) {
                      cart.setPromotor({ id: pat.referido_promotor_id, nombre: pat.referred_by || 'Promotor' });
                    }
                  } catch { /* ignore */ }
                })();
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Skip patient button for quick sales */}
      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => setCurrentStep('products')}
      >
        Continuar sin cliente →
      </Button>
    </div>
  );

  const renderProductsStep = () => (
    <div className="space-y-4">
      {/* Customer info bar */}
      {cart.customer && (
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{cart.customer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {cart.customer.patientId && (
              <Dialog open={showPrescriptionSelector} onOpenChange={setShowPrescriptionSelector}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Receta</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Seleccionar Receta - {cart.customer.name}
                    </DialogTitle>
                  </DialogHeader>
                  <PrescriptionSelector
                    patientId={cart.customer.patientId}
                    patientName={cart.customer.name}
                    onSelectPrescription={(item) => {
                      cart.addItem(item);
                      setShowPrescriptionSelector(false);
                    }}
                    onCancel={() => setShowPrescriptionSelector(false)}
                  />
                </DialogContent>
              </Dialog>
            )}
            <Button variant="ghost" size="sm" onClick={() => {
              cart.setCustomer(null);
              setCurrentStep('patient');
            }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Credit Alert */}
      {cart.customer?.patientId && !posCreditStatus.loading && posCreditStatus.saldoPendienteTotal > 0 && (
        <CreditAlertBanner
          status={posCreditStatus}
          patientId={cart.customer.patientId}
          patientName={cart.customer.name}
          compact
          showAIRecommendation={false}
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar Producto</DialogTitle>
            </DialogHeader>
            <ProductSelector 
              onAdd={(item) => {
                cart.addItem(item);
                setShowProductSelector(false);
              }}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showPackageSelector} onOpenChange={setShowPackageSelector}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Paquete</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Seleccionar Paquete
              </DialogTitle>
            </DialogHeader>
            <PackageSelector
              onAddItems={(items, packageName) => {
                items.forEach(item => cart.addItem(item));
                setShowPackageSelector(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cart Items */}
      <Card className="min-h-[300px]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Productos ({cart.items.length})
            </CardTitle>
            {cart.items.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {cart.lastLocalSave && timeAgoLabel && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Hace {timeAgoLabel}</span>
                  </div>
                )}
                {cart.lastLocalSave && (
                  <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-300 animate-fade-in">
                    <Save className="h-3 w-3" />
                    Guardado
                  </Badge>
                )}
                {cart.isSyncingToCloud ? (
                  <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
                    <Cloud className="h-3 w-3 animate-pulse" />
                    Sincronizando...
                  </Badge>
                ) : cart.lastCloudSync ? (
                  <Badge variant="outline" className="gap-1 text-xs text-primary border-primary/30">
                    <Cloud className="h-3 w-3" />
                    En nube
                  </Badge>
                ) : null}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-20" />
              <p>No hay productos en el carrito</p>
              <p className="text-sm">Agregue productos para comenzar</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {cart.items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdate={(updates) => cart.updateItem(item.id, updates)}
                    onRemove={() => cart.removeItem(item.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Discount inputs moved to POSSummaryPanel */}

      {/* Draft action buttons moved to POSSummaryPanel */}
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-4">
      {/* Sale Channel Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Tipo de Venta</Label>
        <Select value={saleChannel} onValueChange={(v: 'OPTICA' | 'CAMPO') => {
          setSaleChannel(v);
          if (v === 'OPTICA') {
            setCampoCobradorId(null);
            setCampoCobradorName(null);
          }
        }}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPTICA">
              <span className="flex items-center gap-2">
                <Store className="h-3.5 w-3.5" />
                Óptica (Mostrador)
              </span>
            </SelectItem>
            <SelectItem value="CAMPO">
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Campo / Domicilio
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cobrador selector for campo sales */}
      {saleChannel === 'CAMPO' && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Cobrador Responsable *</Label>
          <Select
            value={campoCobradorId || ''}
            onValueChange={(v) => {
              setCampoCobradorId(v);
              const found = posCobradores.find(c => c.user_id === v);
              setCampoCobradorName(found?.full_name || null);
            }}
          >
            <SelectTrigger className={`h-9 ${!campoCobradorId ? 'border-destructive' : ''}`}>
              <SelectValue placeholder="Seleccionar cobrador..." />
            </SelectTrigger>
            <SelectContent>
              {posCobradores.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>
                  {c.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!campoCobradorId && (
            <p className="text-xs text-destructive">
              Debes asignar un cobrador para ventas en campo.
            </p>
          )}
        </div>
      )}

      {/* Promotor Selector */}
      <PromotorSelector
        value={cart.promotor}
        onChange={(p) => {
          cart.setPromotor(p);
          if (p) setPromotorError(false);
        }}
        required
        error={promotorError}
      />

      <Separator />

      {/* Warning: credit without registered patient */}
      {cart.isCredit && !cart.customer?.patientId && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {cart.customer
              ? `"${cart.customer.name}" no es un paciente registrado. Selecciona uno del buscador para ventas a crédito.`
              : 'Selecciona un paciente registrado para ventas a crédito.'}
          </span>
        </div>
      )}

      {/* Payment Panel - inline, no dialog */}
      <PaymentPanel
        total={cart.total}
        payments={cart.payments}
        balance={cart.balance}
        isCredit={cart.isCredit}
        creditDueDate={cart.creditDueDate}
        onAddPayment={cart.addPayment}
        onRemovePayment={cart.removePayment}
        onSetCredit={cart.setIsCredit}
        onSetCreditDueDate={cart.setCreditDueDate}
        onFinalize={handleFinalizeSale}
        isLoading={createSale.isPending}
        cartItemCount={cart.items.length}
        downPaymentConfig={{
          minPercent: creditSettings.settings.minDownPaymentPercent,
          minAmount: creditSettings.settings.minDownPaymentAmount,
          adminExceptionEnabled: creditSettings.settings.adminDownPaymentException,
        }}
        isAdmin={hasAnyRole(['admin'])}
        onDownPaymentException={(reason) => {
          console.log('📋 Excepción de enganche autorizada:', reason);
        }}
      />

      {/* Lab Order Button */}
      {showLabOrderButton && (
        <Button 
          variant="secondary"
          className="w-full gap-2"
          onClick={() => setShowLabOrderModal(true)}
        >
          <FlaskConical className="h-4 w-4" />
          Crear Orden a Laboratorio
        </Button>
      )}

      {createdLabOrder && (
        <Alert className="border-primary/30 bg-primary/5">
          <FlaskConical className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between">
            <span>Orden creada: <strong>{createdLabOrder.orderNumber}</strong></span>
            <Badge variant="secondary">Laboratorio</Badge>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <>
      {/* ─── Header bar (sticky) ─── */}
      <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-border bg-card md:rounded-t-xl flex items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ShoppingCart className="h-5 w-5 text-primary flex-shrink-0" />
          <h2 className="text-base font-semibold truncate">Punto de Venta</h2>
        </div>

        {/* Step Indicator inline */}
        <POSStepIndicator
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          hasPatient={!!cart.customer}
          hasItems={cart.items.length > 0}
        />

        {/* Close button */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-1 h-9 w-9 rounded-full hover:bg-muted text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* ─── Body (scrollable) ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 space-y-4 pb-24 lg:pb-6">
          {/* Cash Session Guard */}
          <CashSessionGuard
            isOpen={cashSession.isOpen}
            loading={cashSession.loading}
            onOpenSession={cashSession.openSession}
          />

          {/* Prescription Banner - from clinical module */}
          {showPreloadBanner && preloadedPatientId && (
            <PrescriptionBanner
              patientId={preloadedPatientId}
              examId={preloadedExamId}
              onClose={() => setShowPreloadBanner(false)}
              onPatientLoaded={(patient) => {
                cart.setCustomer({
                  name: `${patient.first_name} ${patient.last_name}`,
                  patientId: patient.id,
                  phone: patient.whatsapp || patient.mobile || patient.phone || null,
                  email: patient.email || null,
                });
              }}
              onPromotorSuggested={(promotorId, promotorName) => {
                if (promotorId) {
                  cart.setPromotor({ id: promotorId, nombre: promotorName });
                }
              }}
            />
          )}

          {/* Split Panel Layout — payment step gets full width */}
          {currentStep === 'payment' ? (
            /* Payment: full-focus centered layout */
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep('products')}
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  ← Volver a Productos
                </Button>
              </div>
              {renderPaymentStep()}
            </div>
          ) : (
            /* Patient / Products: 2-column layout */
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
              {/* Left Panel - Step Content */}
              <div className="min-w-0 overflow-x-hidden">
                {currentStep === 'patient' && renderPatientStep()}
                {currentStep === 'products' && renderProductsStep()}
              </div>

              {/* Right Panel - Summary */}
              <div className="hidden lg:block">
                <POSSummaryPanel
                  customer={cart.customer}
                  items={cart.items}
                  subtotal={cart.subtotal}
                  discountPercent={cart.discountPercent}
                  discountAmount={cart.discountAmount}
                  onDiscountPercentChange={cart.setDiscountPercent}
                  onDiscountAmountChange={cart.setDiscountAmount}
                  totalDiscount={cart.totalDiscount}
                  total={cart.total}
                  totalPaid={cart.totalPaid}
                  balance={cart.balance}
                  promotor={cart.promotor}
                  onRemoveItem={(id) => cart.removeItem(id)}
                  onStepChange={setCurrentStep}
                  onSaveDraft={cart.items.length > 0 ? cart.saveManualDraft : undefined}
                  onDiscard={cart.items.length > 0 ? () => { cart.clearCart(); setCreatedLabOrder(null); } : undefined}
                />
              </div>

              {/* Mobile: sticky bottom bar with total */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-background border-t shadow-lg p-3 ios-safe-footer">
                <div className="flex items-center justify-between max-w-screen-lg mx-auto">
                  <div>
                    <p className="text-xs text-muted-foreground">{cart.items.length} producto{cart.items.length !== 1 ? 's' : ''}</p>
                    <p className="text-xl font-bold text-primary">${cart.total.toFixed(2)}</p>
                  </div>
                  {cart.items.length > 0 && (
                    <Button size="lg" onClick={() => setCurrentStep('payment')} className="gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Cobrar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>

      {/* ========== MODALS ========== */}

      {/* Customer Selector Dialog (fallback for non-step usage) */}
      <Dialog open={showCustomerSelector} onOpenChange={setShowCustomerSelector}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Seleccionar Cliente</DialogTitle>
          </DialogHeader>
          <CustomerSelector
            onSelect={(customer) => {
              cart.setCustomer(customer);
              setShowCustomerSelector(false);
              if (customer.patientId) {
                (async () => {
                  try {
                    const { data: pat } = await supabase
                      .from('patients')
                      .select('referido_promotor_id, referred_by')
                      .eq('id', customer.patientId!)
                      .single();
                    if (pat?.referido_promotor_id) {
                      cart.setPromotor({ id: pat.referido_promotor_id, nombre: pat.referred_by || 'Promotor' });
                    }
                  } catch { /* ignore */ }
                })();
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Ticket Dialog */}
      {completedSale && (
        <Dialog open={showTicket} onOpenChange={setShowTicket}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Ticket de Venta
              </DialogTitle>
            </DialogHeader>
            <ThermalTicket
              sale={completedSale}
              items={completedItems}
              payments={completedPayments}
              customer={completedCustomer}
              paymentPlan={createdPaymentPlan}
            />
            {completedSale?.patient_id && (
              <div className="pt-2 border-t space-y-2">
                {/* Lab Order Button — show if sale has lens items */}
                {completedItems.some(item => 
                  item.productType === 'lens' || 
                  item.productType === 'lentes' ||
                  item.prescriptionData != null ||
                  (item.productName?.toLowerCase().includes('lente') ?? false)
                ) && !createdLabOrder && (
                  <Button 
                    className="w-full gap-2"
                    onClick={() => {
                      setShowTicket(false);
                      setShowLabOrderModal(true);
                    }}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Crear Orden a Laboratorio
                  </Button>
                )}
                {createdLabOrder && (
                  <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-sm">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    <span>Orden creada: <strong>{createdLabOrder.orderNumber}</strong></span>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => {
                    setShowTicket(false);
                    setShowDeliveryModal(true);
                  }}
                >
                  <Package className="h-4 w-4" />
                  Agendar Entrega
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Delivery Schedule Modal */}
      {completedSale && completedSale.patient_id && (
        <DeliveryScheduleModal
          open={showDeliveryModal}
          onOpenChange={setShowDeliveryModal}
          patientId={completedSale.patient_id}
          patientName={cart.customer?.name || completedSale.customer_name || 'Paciente'}
          patientPhone={cart.customer?.phone || completedSale.customer_phone}
          saleId={completedSale.id}
          saleNumber={completedSale.sale_number || completedSale.saleNumber}
          labOrderId={createdLabOrder?.id}
          branchId={profile?.defaultBranchId}
          defaultResponsibleType={completedSale.sale_responsible_type}
          defaultResponsibleUserId={completedSale.sale_responsible_user_id}
          defaultResponsibleName={completedSale.sale_responsible_name_snapshot}
        />
      )}

      {/* Restore Draft Prompt */}
      <Dialog open={cart.showRestorePrompt} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {cart.draftSource === 'cloud' ? (
                <Cloud className="h-5 w-5 text-primary" />
              ) : (
                <AlertCircle className="h-5 w-5 text-primary" />
              )}
              Carrito guardado encontrado
            </DialogTitle>
            <DialogDescription>
              Se encontró un carrito {cart.draftSource === 'cloud' ? 'en la nube' : 'guardado localmente'} con productos sin finalizar.
              {cart.pendingDraft && (
                <span className="block mt-1 text-xs">
                  Guardado: {new Date(cart.pendingDraft.savedAt).toLocaleString('es-MX')}
                  {cart.pendingDraft.state.items?.length > 0 && (
                    <> - {cart.pendingDraft.state.items.length} producto(s)</>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={cart.discardDraft} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Descartar
            </Button>
            <Button onClick={cart.restoreDraft} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lab Order Modal */}
      {(cart.customer?.patientId || completedCustomer?.patientId) && (
        <POSLabOrderModal
          open={showLabOrderModal}
          onOpenChange={setShowLabOrderModal}
          patientId={(cart.customer?.patientId || completedCustomer?.patientId)!}
          patientName={cart.customer?.name || completedCustomer?.name || ''}
          patientPhone={cart.customer?.phone || completedCustomer?.phone}
          saleId={completedSale?.id || null}
          saleNumber={completedSale?.sale_number || completedSale?.saleNumber || null}
          prescriptionId={cart.prescriptionId}
          branchId={profile?.defaultBranchId}
          cartItems={completedItems.length > 0 ? completedItems : cart.items}
          onSuccess={(orderId, orderNumber) => {
            setCreatedLabOrder({ id: orderId, orderNumber });
            toast({
              title: 'Orden de laboratorio creada',
              description: `Orden ${orderNumber} vinculada a esta venta`,
            });
          }}
        />
      )}

      {/* Moroso Block Modal */}
      {cart.customer?.patientId && (
        <MorosoBlockModal
          open={showMorosoBlock}
          onOpenChange={setShowMorosoBlock}
          patientName={cart.customer.name}
          patientId={cart.customer.patientId}
          creditStatus={posCreditStatus}
          isAdmin={hasAnyRole(['admin'])}
          adminExceptionOnly={creditSettings.settings.adminExceptionOnly}
          userId={profile?.userId || ''}
          onExceptionGranted={() => setMorosoExceptionGranted(true)}
        />
      )}

      {/* Prescription Required Modal */}
      <PrescriptionRequiredModal
        open={showPrescriptionRequired}
        onClose={() => setShowPrescriptionRequired(false)}
        onOpenExpediente={() => {
          setShowPrescriptionRequired(false);
          if (cart.customer?.patientId) {
            window.location.href = `/expediente?patientId=${cart.customer.patientId}&action=exam`;
          } else {
            toast({
              title: 'Paciente requerido',
              description: 'Selecciona un paciente antes de crear una graduación.',
              variant: 'destructive',
            });
          }
        }}
        onSelectPrescription={() => {
          setShowPrescriptionRequired(false);
          setShowPrescriptionSelector(true);
        }}
        lensProductNames={getLensItemsRequiringPrescription().map(i => i.productName)}
        isAdmin={hasAnyRole(['admin'])}
        adminExceptionEnabled={creditSettings.settings.adminDownPaymentException}
        onAdminException={(reason) => {
          setPrescriptionExceptionGranted(true);
          setShowPrescriptionRequired(false);
          console.log('📋 Excepción de receta autorizada:', reason);
          toast({
            title: 'Excepción autorizada',
            description: 'Venta de lentes sin receta autorizada por Administrador.',
          });
        }}
      />

      {/* Credit Payment Plan Modal */}
      {showPaymentPlanModal && pendingCreditSale && (
        <CreditPaymentPlanModal
          open={showPaymentPlanModal}
          saleId={pendingCreditSale.id}
          patientId={completedCustomer?.patientId || pendingCreditSale.patient_id || null}
          patientName={completedCustomer?.name || pendingCreditSale.customer_name || 'Cliente'}
          saleTotal={pendingCreditSale.total || 0}
          amountPaid={pendingCreditSale.amount_paid || 0}
          onPlanCreated={(plan) => {
            setCreatedPaymentPlan(plan);
            setShowPaymentPlanModal(false);
            setPendingCreditSale(null);
            setShowTicket(true);
          }}
          onCancel={() => {
            setShowPaymentPlanModal(false);
            // Keep pendingCreditSale so ticket can still show
            setShowTicket(true);
          }}
        />
      )}

    </>
  );
}
