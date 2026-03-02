import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FlaskConical, User, FileText, AlertCircle, Printer, CheckCircle2, Eye, Package } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';
import { THERMAL_PRINT_STYLES } from '@/lib/thermal-print-styles';
import type { CartItem } from '@/hooks/useOfflineSync';

interface Prescription {
  id: string;
  exam_date: string;
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_add: number | null;
  oi_sphere: number | null;
  oi_cylinder: number | null;
  oi_axis: number | null;
  oi_add: number | null;
  od_pupil_distance: number | null;
  oi_pupil_distance: number | null;
  total_pd: number | null;
  lens_type: string | null;
  lens_material: string | null;
  lens_treatment: string | null;
}

interface POSLabOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  saleId?: string | null;
  saleNumber?: string | null;
  prescriptionId?: string | null;
  branchId?: string | null;
  cartItems?: CartItem[];
  onSuccess?: (orderId: string, orderNumber: string) => void;
}

const LABORATORIES = [
  'Laboratorio Óptico Central',
  'Lentes Express',
  'Óptima Laboratorio',
  'Laboratorio Visual',
  'Otro',
];

const ORDER_TYPES = [
  { value: 'lenses', label: 'Lentes Oftálmicos' },
  { value: 'contact_lenses', label: 'Lentes de Contacto' },
  { value: 'repairs', label: 'Reparación' },
];

const PRIORITIES = [
  { value: 'normal', label: 'Normal', color: 'secondary' },
  { value: 'urgent', label: 'Urgente', color: 'destructive' },
];

// Category name matching helpers
const isFrameCategory = (name: string) => /armaz[oó]n/i.test(name);
const isMaterialCategory = (name: string) => /material|mica|lente/i.test(name) && !/contacto|sol/i.test(name);
const isTreatmentCategory = (name: string) => /tratamiento/i.test(name);

function formatRxValue(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const num = Number(val);
  if (num === 0) return '0.00';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}`;
}

function formatAxis(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return `${val}°`;
}

function formatPD(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return val.toFixed(1);
}

interface ExtractedProducts {
  frameName: string | null;
  lensMaterial: string | null;
  lensTreatment: string | null;
}

async function extractProductsFromCart(cartItems: CartItem[]): Promise<ExtractedProducts> {
  const result: ExtractedProducts = { frameName: null, lensMaterial: null, lensTreatment: null };
  if (!cartItems || cartItems.length === 0) return result;

  // Get all unique category IDs from cart
  const categoryIds = [...new Set(cartItems.map(i => i.categoryId).filter(Boolean))] as string[];
  if (categoryIds.length === 0) return result;

  // Fetch category names
  const { data: categories } = await supabase
    .from('product_categories')
    .select('id, name')
    .in('id', categoryIds);

  if (!categories) return result;

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  const frames: string[] = [];
  const materials: string[] = [];
  const treatments: string[] = [];

  for (const item of cartItems) {
    const catName = item.categoryId ? categoryMap.get(item.categoryId) : null;
    if (!catName) continue;

    if (isFrameCategory(catName)) {
      frames.push(item.productName);
    } else if (isMaterialCategory(catName)) {
      materials.push(item.productName);
    } else if (isTreatmentCategory(catName)) {
      treatments.push(item.productName);
    }
  }

  result.frameName = frames.length > 0 ? frames.join(', ') : null;
  result.lensMaterial = materials.length > 0 ? materials.join(', ') : null;
  result.lensTreatment = treatments.length > 0 ? treatments.join(' + ') : null;

  return result;
}

export function POSLabOrderModal({
  open,
  onOpenChange,
  patientId,
  patientName,
  patientPhone,
  saleId,
  saleNumber,
  prescriptionId: initialPrescriptionId,
  branchId,
  cartItems,
  onSuccess,
}: POSLabOrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(true);
  const [extractedProducts, setExtractedProducts] = useState<ExtractedProducts>({ frameName: null, lensMaterial: null, lensTreatment: null });
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [showPostCreate, setShowPostCreate] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { settings: companySettings } = useCompanySettings();
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      laboratory_name: '',
      order_type: 'lenses',
      priority: 'normal',
      estimated_delivery_date: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      special_instructions: '',
      patient_phone: patientPhone || '',
    },
  });

  const watchPriority = watch('priority');

  // Extract products from cart items
  useEffect(() => {
    if (open && cartItems && cartItems.length > 0) {
      extractProductsFromCart(cartItems).then(setExtractedProducts);
    }
  }, [open, cartItems]);

  // Load patient's prescriptions
  useEffect(() => {
    if (open && patientId) {
      loadPrescriptions();
    }
  }, [open, patientId]);

  // Set initial prescription if provided
  useEffect(() => {
    if (initialPrescriptionId && prescriptions.length > 0) {
      const found = prescriptions.find(p => p.id === initialPrescriptionId);
      if (found) {
        setSelectedPrescription(found);
      }
    } else if (prescriptions.length > 0 && !selectedPrescription) {
      setSelectedPrescription(prescriptions[0]);
    }
  }, [initialPrescriptionId, prescriptions]);

  const loadPrescriptions = async () => {
    setLoadingPrescriptions(true);
    try {
      const { data, error } = await supabase
        .from('patient_prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('exam_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error loading prescriptions:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las recetas',
        variant: 'destructive',
      });
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  const handlePrescriptionSelect = (prescriptionId: string) => {
    const prescription = prescriptions.find(p => p.id === prescriptionId);
    setSelectedPrescription(prescription || null);
  };

  const triggerPrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden de Laboratorio</title>
          <style>${THERMAL_PRINT_STYLES}</style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const onSubmit = async (formData: any) => {
    if (!selectedPrescription) {
      toast({
        title: 'Receta requerida',
        description: 'Debe seleccionar una receta para crear la orden',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: orderNumber, error: numError } = await supabase.rpc('generate_lab_order_number');
      if (numError) throw numError;

      // Use extracted products from cart, fallback to prescription data
      const finalLensMaterial = extractedProducts.lensMaterial || selectedPrescription.lens_material;
      const finalLensTreatment = extractedProducts.lensTreatment || selectedPrescription.lens_treatment;
      const finalFrameBrand = extractedProducts.frameName || null;

      const orderData = {
        order_number: orderNumber,
        patient_id: patientId,
        prescription_id: selectedPrescription.id,
        sale_id: saleId || null,
        branch_id: branchId || profile?.defaultBranchId || null,
        laboratory_name: formData.laboratory_name || null,
        order_type: formData.order_type || 'lenses',
        priority: formData.priority || 'normal',
        od_sphere: selectedPrescription.od_sphere,
        od_cylinder: selectedPrescription.od_cylinder,
        od_axis: selectedPrescription.od_axis,
        od_add: selectedPrescription.od_add,
        oi_sphere: selectedPrescription.oi_sphere,
        oi_cylinder: selectedPrescription.oi_cylinder,
        oi_axis: selectedPrescription.oi_axis,
        oi_add: selectedPrescription.oi_add,
        pd_right: selectedPrescription.od_pupil_distance,
        pd_left: selectedPrescription.oi_pupil_distance,
        pd_total: selectedPrescription.total_pd,
        lens_type: selectedPrescription.lens_type,
        lens_material: finalLensMaterial,
        lens_treatment: finalLensTreatment,
        frame_brand: finalFrameBrand,
        estimated_delivery_date: formData.estimated_delivery_date || null,
        special_instructions: formData.special_instructions || null,
        patient_phone: formData.patient_phone || patientPhone || null,
        status: 'RECIBIDA',
        location: 'EN_LABORATORIO',
        created_by: user?.id || null,
      };

      const { data: newOrder, error } = await supabase
        .from('lab_orders')
        .insert(orderData)
        .select('*, patients(first_name, last_name), branches(name, phone, address)')
        .single();

      if (error) throw error;

      // Fetch promotor name
      let promotorName: string | null = null;
      if (saleId) {
        const { data: saleData } = await supabase
          .from('sales')
          .select('promotor_id')
          .eq('id', saleId)
          .single();
        if (saleData?.promotor_id && saleData.promotor_id !== '00000000-0000-0000-0000-000000000001') {
          const { data: promotorData } = await supabase
            .from('promotores')
            .select('nombre_completo')
            .eq('id', saleData.promotor_id)
            .single();
          promotorName = promotorData?.nombre_completo || null;
        }
      }

      setCreatedOrder({ ...newOrder, promotorName });
      setShowPostCreate(true);

      toast({
        title: 'Orden creada',
        description: `Orden ${orderNumber} creada exitosamente`,
      });

      onSuccess?.(newOrder.id, newOrder.order_number);
    } catch (error: any) {
      console.error('Error creating lab order:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la orden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formIsDirty = !!watch('laboratory_name') || !!watch('special_instructions') || !!selectedPrescription;

  const doClose = () => {
    reset();
    setSelectedPrescription(null);
    setCreatedOrder(null);
    setShowPostCreate(false);
    setExtractedProducts({ frameName: null, lensMaterial: null, lensTreatment: null });
    onOpenChange(false);
  };

  const { confirmClose, UnsavedDialog } = useUnsavedChanges({
    isDirty: formIsDirty && !showPostCreate,
    enabled: open,
  });

  const handleClose = () => {
    if (showPostCreate) {
      doClose();
    } else {
      confirmClose(doClose);
    }
  };

  const formatRx = (p: Prescription | null) => {
    if (!p) return '';
    return `OD: ${p.od_sphere ?? 0}/${p.od_cylinder ?? 0}x${p.od_axis ?? 0}° | OI: ${p.oi_sphere ?? 0}/${p.oi_cylinder ?? 0}x${p.oi_axis ?? 0}°`;
  };

  const companyName = companySettings?.company_name || 'ÓPTICA ISTMEÑA';
  const companyPhone = companySettings?.phone || '';

  // Post-creation confirmation view
  if (showPostCreate && createdOrder) {
    const frameDisplay = createdOrder.frame_brand || '';
    const promotor = createdOrder.promotorName || 'Óptica Istmeña';
    const branchName = createdOrder.branches?.name || '';

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Orden Creada Exitosamente
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Orden:</span>
                    <p className="font-bold">{createdOrder.order_number}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paciente:</span>
                    <p className="font-medium">{patientName}</p>
                  </div>
                  {createdOrder.lens_material && (
                    <div>
                      <span className="text-muted-foreground">Material:</span>
                      <p className="font-medium">{createdOrder.lens_material}</p>
                    </div>
                  )}
                  {createdOrder.lens_treatment && (
                    <div>
                      <span className="text-muted-foreground">Tratamiento:</span>
                      <p className="font-medium">{createdOrder.lens_treatment}</p>
                    </div>
                  )}
                  {createdOrder.frame_brand && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Armazón:</span>
                      <p className="font-medium">{createdOrder.frame_brand}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hidden print content */}
            <div ref={printRef} className="hidden">
              <div className="header">
                {companySettings?.logo_url && (
                  <img src={companySettings.logo_url} alt="Logo" />
                )}
                <h1>ORDEN DE LABORATORIO</h1>
                {companySettings?.slogan && <p className="slogan">{companySettings.slogan}</p>}
              </div>

              <div className="meta-row">
                <div>
                  <span className="label">Orden</span>
                  <span className="value">{createdOrder.order_number}</span>
                  <br />
                  <span className="label">{format(new Date(createdOrder.created_at), "dd/MM/yyyy HH:mm", { locale: es })}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="label">Promotor</span>
                  <span className="value">{promotor}</span>
                  {createdOrder.priority === 'urgent' && (
                    <span className="priority-badge">Urgente</span>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '6px' }}>
                <span className="label" style={{ fontSize: '8px', color: '#555', textTransform: 'uppercase' }}>Paciente</span>
                <p style={{ fontSize: '13px', fontWeight: 700 }}>{patientName}</p>
              </div>

              <div className="section-title">Graduación</div>
              <table className="rx-table">
                <thead>
                  <tr>
                    <th>RX</th><th>SPH</th><th>CYL</th><th>EJE</th><th>ADD</th><th>DIP</th><th>ALT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="od-label">OD</td>
                    <td>{formatRxValue(createdOrder.od_sphere)}</td>
                    <td>{formatRxValue(createdOrder.od_cylinder)}</td>
                    <td>{formatAxis(createdOrder.od_axis)}</td>
                    <td>{formatRxValue(createdOrder.od_add)}</td>
                    <td>{formatPD(createdOrder.pd_right)}</td>
                    <td>{formatPD(createdOrder.fitting_height)}</td>
                  </tr>
                  <tr>
                    <td className="oi-label">OI</td>
                    <td>{formatRxValue(createdOrder.oi_sphere)}</td>
                    <td>{formatRxValue(createdOrder.oi_cylinder)}</td>
                    <td>{formatAxis(createdOrder.oi_axis)}</td>
                    <td>{formatRxValue(createdOrder.oi_add)}</td>
                    <td>{formatPD(createdOrder.pd_left)}</td>
                    <td>&nbsp;</td>
                  </tr>
                </tbody>
              </table>

              <div className="section-title">Detalles del Pedido</div>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">Material</span>
                  <span className="value">{createdOrder.lens_material || ''}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Tratamiento</span>
                  <span className="value">{createdOrder.lens_treatment || ''}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Tipo de Lente</span>
                  <span className="value">{createdOrder.lens_type || ''}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Color de Lente</span>
                  <span className="value">{createdOrder.lens_color || ''}</span>
                </div>
                <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                  <span className="label">Armazón</span>
                  <span className="value">{frameDisplay}</span>
                </div>
              </div>

              {createdOrder.special_instructions && (
                <>
                  <div className="section-title">Notas</div>
                  <div className="notes-box">{createdOrder.special_instructions}</div>
                </>
              )}

              {createdOrder.estimated_delivery_date && (
                <div className="delivery-date">
                  <span className="label">Fecha estimada de entrega</span>
                  <span className="value">
                    {format(new Date(createdOrder.estimated_delivery_date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </div>
              )}

              <div className="phone-bar">
                <span>Teléfono para notificaciones</span>
                <strong>{companyPhone || 'No configurado'}</strong>
              </div>

              <div className="signatures">
                <div className="sig-block">
                  <div className="sig-line" />
                  <span className="sig-label">Elaboró</span>
                </div>
                <div className="sig-block">
                  <div className="sig-line" />
                  <span className="sig-label">Recibió</span>
                </div>
              </div>

              <div className="footer">
                <p className="company">{companyName}</p>
                {branchName && <p className="branch">{branchName}</p>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              <Button onClick={triggerPrint} className="w-full gap-2">
                <Printer className="h-4 w-4" />
                Imprimir Orden
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={triggerPrint}>
                  <Printer className="h-4 w-4" />
                  Reimprimir
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <UnsavedDialog />
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" preventClose>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Nueva Orden a Laboratorio
          </DialogTitle>
          <DialogDescription>
            Crear orden de laboratorio desde la venta
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Patient & Sale Info */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{patientName}</span>
                </div>
                {saleNumber && (
                  <Badge variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {saleNumber}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Auto-detected products from cart */}
          {(extractedProducts.frameName || extractedProducts.lensMaterial || extractedProducts.lensTreatment) && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
                  <Package className="h-4 w-4" />
                  Productos detectados en la venta
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex flex-wrap gap-2">
                  {extractedProducts.frameName && (
                    <Badge variant="secondary" className="gap-1">
                      🕶️ {extractedProducts.frameName}
                    </Badge>
                  )}
                  {extractedProducts.lensMaterial && (
                    <Badge variant="secondary" className="gap-1">
                      🔍 {extractedProducts.lensMaterial}
                    </Badge>
                  )}
                  {extractedProducts.lensTreatment && (
                    <Badge variant="secondary" className="gap-1">
                      ✨ {extractedProducts.lensTreatment}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Estos datos se guardarán automáticamente en la orden.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Prescription Selection */}
          <div className="space-y-2">
            <Label>Receta *</Label>
            {loadingPrescriptions ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando recetas...
              </div>
            ) : prescriptions.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No se encontraron recetas para este paciente. 
                  Debe crear un examen/receta primero.
                </AlertDescription>
              </Alert>
            ) : (
              <Select 
                value={selectedPrescription?.id || ''} 
                onValueChange={handlePrescriptionSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una receta" />
                </SelectTrigger>
                <SelectContent>
                  {prescriptions.map((rx) => (
                    <SelectItem key={rx.id} value={rx.id}>
                      {format(new Date(rx.exam_date), 'dd/MM/yyyy')} - {formatRx(rx)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Prescription Preview */}
          {selectedPrescription && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Datos de Graduación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">OD:</span>{' '}
                    <span className="font-mono">
                      {selectedPrescription.od_sphere ?? 0} / {selectedPrescription.od_cylinder ?? 0} x {selectedPrescription.od_axis ?? 0}°
                      {selectedPrescription.od_add && ` ADD +${selectedPrescription.od_add}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">OI:</span>{' '}
                    <span className="font-mono">
                      {selectedPrescription.oi_sphere ?? 0} / {selectedPrescription.oi_cylinder ?? 0} x {selectedPrescription.oi_axis ?? 0}°
                      {selectedPrescription.oi_add && ` ADD +${selectedPrescription.oi_add}`}
                    </span>
                  </div>
                </div>
                {(selectedPrescription.lens_type || selectedPrescription.lens_material) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedPrescription.lens_type && (
                      <Badge variant="secondary">{selectedPrescription.lens_type}</Badge>
                    )}
                    {selectedPrescription.lens_material && (
                      <Badge variant="secondary">{selectedPrescription.lens_material}</Badge>
                    )}
                    {selectedPrescription.lens_treatment && (
                      <Badge variant="secondary">{selectedPrescription.lens_treatment}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="laboratory_name">Laboratorio</Label>
              <Select 
                onValueChange={(v) => setValue('laboratory_name', v)} 
                defaultValue=""
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione laboratorio" />
                </SelectTrigger>
                <SelectContent>
                  {LABORATORIES.map((lab) => (
                    <SelectItem key={lab} value={lab}>{lab}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_type">Tipo de Orden</Label>
              <Select 
                onValueChange={(v) => setValue('order_type', v)} 
                defaultValue="lenses"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select 
                onValueChange={(v) => setValue('priority', v)} 
                defaultValue="normal"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value}>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={priority.value === 'urgent' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {priority.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <MaskedDateInput
                value={watch('estimated_delivery_date') || ''}
                onChange={(val) => setValue('estimated_delivery_date', val)}
                label="Fecha Estimada de Entrega"
                mode="delivery"
              />
            </div>
          </div>

          {/* Teléfono de notificaciones removido - ya aparece en el ticket con el número de la óptica */}

          <div className="space-y-2">
            <Label htmlFor="special_instructions">Instrucciones Especiales</Label>
            <Textarea
              {...register('special_instructions')}
              placeholder="Notas para el laboratorio..."
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedPrescription}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <FlaskConical className="h-4 w-4" />
                  Crear Orden
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
