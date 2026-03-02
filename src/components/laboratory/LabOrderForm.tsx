import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { THERMAL_PRINT_STYLES, LAB_ORDER_LANDSCAPE_STYLES } from '@/lib/thermal-print-styles';
import { useToast } from '@/hooks/use-toast';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, FileText, ShoppingCart, CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Printer } from 'lucide-react';

interface LabOrderFormProps {
  onSuccess?: () => void;
  prescriptionId?: string;
  saleId?: string;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string | null;
  phone: string | null;
}

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
  patient_id: string;
  patients?: Patient;
}

interface Sale {
  id: string;
  sale_number: string;
  patient_id: string | null;
  patients?: Patient;
  prescription_id: string | null;
}

export function LabOrderForm({ onSuccess, prescriptionId, saleId }: LabOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [sourceType, setSourceType] = useState<'prescription' | 'sale'>('prescription');
  const [patientSearch, setPatientSearch] = useState('');
  const { toast } = useToast();
  const { register, handleSubmit, setValue, watch, reset } = useForm();
  const { settings: companySettings, isLoading: companyLoading } = useCompanySettings();
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const companyPhone = companySettings?.phone || '';

  // Search patients
  const searchPatients = async (query: string) => {
    if (query.length < 2) return;
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, first_name, last_name, mobile, phone')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error searching patients:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load prescriptions for patient
  const loadPrescriptions = async (patientId: string) => {
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
    }
  };

  // Load sales for patient
  const loadSales = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sale_number, patient_id, prescription_id')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
    }
  };

  // Handle patient selection
  const handlePatientSelect = async (patient: Patient) => {
    setSelectedPatient(patient);
    setPatients([]);
    setPatientSearch(`${patient.first_name} ${patient.last_name}`);
    await Promise.all([
      loadPrescriptions(patient.id),
      loadSales(patient.id),
    ]);
    setValue('patient_phone', patient.mobile || patient.phone || '');
  };

  // Handle prescription selection
  const handlePrescriptionSelect = (prescriptionId: string) => {
    const prescription = prescriptions.find(p => p.id === prescriptionId);
    if (prescription) {
      setSelectedPrescription(prescription);
      // Auto-fill form with prescription data
      setValue('od_sphere', prescription.od_sphere);
      setValue('od_cylinder', prescription.od_cylinder);
      setValue('od_axis', prescription.od_axis);
      setValue('od_add', prescription.od_add);
      setValue('oi_sphere', prescription.oi_sphere);
      setValue('oi_cylinder', prescription.oi_cylinder);
      setValue('oi_axis', prescription.oi_axis);
      setValue('oi_add', prescription.oi_add);
      setValue('pd_right', prescription.od_pupil_distance);
      setValue('pd_left', prescription.oi_pupil_distance);
      setValue('pd_total', prescription.total_pd);
      setValue('lens_type', prescription.lens_type || '');
      setValue('lens_material', prescription.lens_material || '');
      setValue('lens_treatment', prescription.lens_treatment || '');
    }
  };

  // Handle sale selection
  const handleSaleSelect = async (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setSelectedSale(sale);
      // If sale has a prescription, load it
      if (sale.prescription_id) {
        const { data } = await supabase
          .from('patient_prescriptions')
          .select('*')
          .eq('id', sale.prescription_id)
          .single();
        
        if (data) {
          handlePrescriptionSelect(data.id);
        }
      }
    }
  };

  const onSubmit = async (formData: any) => {
    if (!selectedPatient) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar un paciente',
        variant: 'destructive',
      });
      return;
    }

    // Validate required lab data
    const missingFields: string[] = [];
    if (!formData.lens_material) missingFields.push('Material');
    if (!formData.lens_treatment) missingFields.push('Tratamiento');
    if (!formData.frame_brand && !formData.frame_model) missingFields.push('Armazón');

    if (missingFields.length > 0) {
      toast({
        title: 'Datos incompletos',
        description: `No se puede generar orden sin datos completos de laboratorio. Falta: ${missingFields.join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Generate order number
      const { data: orderNumber } = await supabase.rpc('generate_lab_order_number');

      const orderData = {
        order_number: orderNumber,
        patient_id: selectedPatient.id,
        prescription_id: selectedPrescription?.id || null,
        sale_id: selectedSale?.id || null,
        laboratory_name: formData.laboratory_name,
        order_type: formData.order_type || 'lenses',
        priority: formData.priority || 'normal',
        od_sphere: formData.od_sphere ? parseFloat(formData.od_sphere) : null,
        od_cylinder: formData.od_cylinder ? parseFloat(formData.od_cylinder) : null,
        od_axis: formData.od_axis ? parseInt(formData.od_axis) : null,
        od_add: formData.od_add ? parseFloat(formData.od_add) : null,
        oi_sphere: formData.oi_sphere ? parseFloat(formData.oi_sphere) : null,
        oi_cylinder: formData.oi_cylinder ? parseFloat(formData.oi_cylinder) : null,
        oi_axis: formData.oi_axis ? parseInt(formData.oi_axis) : null,
        oi_add: formData.oi_add ? parseFloat(formData.oi_add) : null,
        lens_type: formData.lens_type || null,
        lens_material: formData.lens_material || null,
        lens_treatment: formData.lens_treatment || null,
        lens_color: formData.lens_color || null,
        frame_brand: formData.frame_brand || null,
        frame_model: formData.frame_model || null,
        frame_color: formData.frame_color || null,
        frame_size: formData.frame_size || null,
        pd_right: formData.pd_right ? parseFloat(formData.pd_right) : null,
        pd_left: formData.pd_left ? parseFloat(formData.pd_left) : null,
        pd_total: formData.pd_total ? parseFloat(formData.pd_total) : null,
        fitting_height: formData.fitting_height ? parseFloat(formData.fitting_height) : null,
        estimated_delivery_date: formData.estimated_delivery_date || null,
        laboratory_cost: formData.laboratory_cost ? parseFloat(formData.laboratory_cost) : 0,
        special_instructions: formData.special_instructions || null,
        internal_notes: formData.internal_notes || null,
        patient_phone: selectedPatient.mobile || selectedPatient.phone || null,
        notification_phone: companyPhone || null,
        status: 'pending',
      };

      const { data: insertedOrder, error } = await supabase.from('lab_orders').insert(orderData).select('*').single();

      if (error) throw error;

      // Fetch promotor name for print
      let promotorNameSnapshot: string | null = null;
      if (selectedSale?.id) {
        const { data: saleData } = await supabase
          .from('sales')
          .select('promotor_id')
          .eq('id', selectedSale.id)
          .single();
        if (saleData?.promotor_id && saleData.promotor_id !== '00000000-0000-0000-0000-000000000001') {
          const { data: promotorData } = await supabase
            .from('promotores')
            .select('nombre_completo')
            .eq('id', saleData.promotor_id)
            .single();
          promotorNameSnapshot = promotorData?.nombre_completo || null;
        }
      }

      // Set created order for print, then trigger print after render
      const orderForPrint = {
        ...insertedOrder,
        patients: { first_name: selectedPatient.first_name, last_name: selectedPatient.last_name },
      };
      setCreatedOrder({ order: orderForPrint, promotorName: promotorNameSnapshot });

      toast({
        title: 'Orden guardada e impresión lista',
        description: `Orden ${insertedOrder.order_number} creada exitosamente`,
      });

      // Delay to allow render of print view, then print
      setTimeout(() => {
        triggerPrint();
        // After print, clean up
        reset();
        setSelectedPatient(null);
        setSelectedPrescription(null);
        setSelectedSale(null);
        setPatientSearch('');
        setCreatedOrder(null);
        onSuccess?.();
      }, 500);
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear la orden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerPrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use landscape format by default for auto-print after creation
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden de Laboratorio</title>
          <style>${LAB_ORDER_LANDSCAPE_STYLES}</style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Patient Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Paciente</CardTitle>
          <CardDescription>Busque y seleccione el paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente por nombre..."
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                searchPatients(e.target.value);
              }}
              className="pl-10"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>

          {/* Patient search results */}
          {patients.length > 0 && (
            <div className="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full text-left px-4 py-2 hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{patient.first_name} {patient.last_name}</span>
                  {patient.mobile && (
                    <span className="text-sm text-muted-foreground ml-2">
                      Tel: {patient.mobile}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedPatient && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
              <div className="mt-2">
                <Label htmlFor="notification_phone">Teléfono para notificaciones</Label>
                {companyPhone ? (
                  <Input
                    id="notification_phone"
                    value={companyPhone}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed"
                  />
                ) : (
                  <Alert variant="destructive" className="mt-1">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Configura el Teléfono Principal en Settings → Información de la Empresa
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source Selection */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Origen de la orden</CardTitle>
            <CardDescription>Seleccione desde receta o venta</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as 'prescription' | 'sale')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="prescription" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Desde Receta
                </TabsTrigger>
                <TabsTrigger value="sale" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Desde Venta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="prescription" className="mt-4">
                {prescriptions.length > 0 ? (
                  <Select onValueChange={handlePrescriptionSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una receta" />
                    </SelectTrigger>
                    <SelectContent>
                      {prescriptions.map((rx) => (
                        <SelectItem key={rx.id} value={rx.id}>
                          {new Date(rx.exam_date).toLocaleDateString('es-MX')} - 
                          OD: {rx.od_sphere || 0}/{rx.od_cylinder || 0} | 
                          OI: {rx.oi_sphere || 0}/{rx.oi_cylinder || 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-muted-foreground text-sm">No hay recetas disponibles</p>
                )}
              </TabsContent>

              <TabsContent value="sale" className="mt-4">
                {sales.length > 0 ? (
                  <Select onValueChange={handleSaleSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una venta" />
                    </SelectTrigger>
                    <SelectContent>
                      {sales.map((sale) => (
                        <SelectItem key={sale.id} value={sale.id}>
                          {sale.sale_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-muted-foreground text-sm">No hay ventas disponibles</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalles del pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="laboratory_name">Laboratorio</Label>
              <Input
                id="laboratory_name"
                {...register('laboratory_name')}
                placeholder="Nombre del laboratorio"
              />
            </div>
            <div>
              <Label htmlFor="order_type">Tipo de orden</Label>
              <Select onValueChange={(v) => setValue('order_type', v)} defaultValue="lenses">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lenses">Lentes oftálmicos</SelectItem>
                  <SelectItem value="contact_lenses">Lentes de contacto</SelectItem>
                  <SelectItem value="repairs">Reparación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Prioridad</Label>
              <Select onValueChange={(v) => setValue('priority', v)} defaultValue="normal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescription Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Graduación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* OD Row */}
            <div>
              <Label className="text-primary font-semibold">Ojo Derecho (OD)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <div>
                  <Label className="text-xs">Esfera</Label>
                  <Input type="number" step="0.25" {...register('od_sphere')} />
                </div>
                <div>
                  <Label className="text-xs">Cilindro</Label>
                  <Input type="number" step="0.25" {...register('od_cylinder')} />
                </div>
                <div>
                  <Label className="text-xs">Eje</Label>
                  <Input type="number" min="0" max="180" {...register('od_axis')} />
                </div>
                <div>
                  <Label className="text-xs">Adición</Label>
                  <Input type="number" step="0.25" {...register('od_add')} />
                </div>
              </div>
            </div>

            {/* OI Row */}
            <div>
              <Label className="text-primary font-semibold">Ojo Izquierdo (OI)</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                <div>
                  <Label className="text-xs">Esfera</Label>
                  <Input type="number" step="0.25" {...register('oi_sphere')} />
                </div>
                <div>
                  <Label className="text-xs">Cilindro</Label>
                  <Input type="number" step="0.25" {...register('oi_cylinder')} />
                </div>
                <div>
                  <Label className="text-xs">Eje</Label>
                  <Input type="number" min="0" max="180" {...register('oi_axis')} />
                </div>
                <div>
                  <Label className="text-xs">Adición</Label>
                  <Input type="number" step="0.25" {...register('oi_add')} />
                </div>
              </div>
            </div>

            {/* PD */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">DIP Derecha</Label>
                <Input type="number" step="0.5" {...register('pd_right')} />
              </div>
              <div>
                <Label className="text-xs">DIP Izquierda</Label>
                <Input type="number" step="0.5" {...register('pd_left')} />
              </div>
              <div>
                <Label className="text-xs">DIP Total</Label>
                <Input type="number" step="0.5" {...register('pd_total')} />
              </div>
              <div>
                <Label className="text-xs">Altura de montaje</Label>
                <Input type="number" step="0.5" {...register('fitting_height')} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lens Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Especificaciones del lente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Tipo de lente</Label>
              <Select onValueChange={(v) => setValue('lens_type', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monofocal">Monofocal</SelectItem>
                  <SelectItem value="bifocal">Bifocal</SelectItem>
                  <SelectItem value="progressive">Progresivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Material</Label>
              <Select onValueChange={(v) => setValue('lens_material', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cr39">CR-39</SelectItem>
                  <SelectItem value="policarbonato">Policarbonato</SelectItem>
                  <SelectItem value="alto_indice_1.67">Alto índice 1.67</SelectItem>
                  <SelectItem value="alto_indice_1.74">Alto índice 1.74</SelectItem>
                  <SelectItem value="trivex">Trivex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tratamiento</Label>
              <Select onValueChange={(v) => setValue('lens_treatment', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="antireflejo">Antirreflejo</SelectItem>
                  <SelectItem value="fotocromatico">Fotocromático</SelectItem>
                  <SelectItem value="blue_cut">Blue Cut</SelectItem>
                  <SelectItem value="polarizado">Polarizado</SelectItem>
                  <SelectItem value="transitions">Transitions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <Input {...register('lens_color')} placeholder="Color del lente" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Frame Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos del armazón</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Marca</Label>
              <Input {...register('frame_brand')} placeholder="Marca" />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input {...register('frame_model')} placeholder="Modelo" />
            </div>
            <div>
              <Label>Color</Label>
              <Input {...register('frame_color')} placeholder="Color" />
            </div>
            <div>
              <Label>Medidas</Label>
              <Input {...register('frame_size')} placeholder="Ej: 52-18-140" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información adicional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Fecha estimada de entrega</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !watch('estimated_delivery_date') && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {watch('estimated_delivery_date')
                      ? format(parse(watch('estimated_delivery_date'), 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')
                      : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={watch('estimated_delivery_date') ? parse(watch('estimated_delivery_date'), 'yyyy-MM-dd', new Date()) : undefined}
                    onSelect={(date) => {
                      if (date) setValue('estimated_delivery_date', format(date, 'yyyy-MM-dd'));
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    locale={es}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Costo de laboratorio</Label>
              <Input type="number" step="0.01" {...register('laboratory_cost')} placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Instrucciones especiales</Label>
            <Textarea
              {...register('special_instructions')}
              placeholder="Instrucciones para el laboratorio..."
              rows={2}
            />
          </div>
          <div>
            <Label>Notas internas</Label>
            <Textarea
              {...register('internal_notes')}
              placeholder="Notas internas (no se envían al laboratorio)..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => {
          reset();
          setSelectedPatient(null);
          setSelectedPrescription(null);
          setSelectedSale(null);
          setPatientSearch('');
        }}>
          Limpiar
        </Button>
        <Button type="submit" disabled={loading || !selectedPatient} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Crear Orden de Laboratorio
        </Button>
      </div>

      {/* Hidden Print View - rendered after order creation for auto-print */}
      {createdOrder && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={printRef}>
            {/* Landscape header */}
            <div className="lab-header">
              {companySettings?.logo_url && (
                <img src={companySettings.logo_url} alt="Logo" />
              )}
              <div className="company-name">{companySettings?.company_name || 'ÓPTICA ISTMEÑA'}</div>
              {companySettings?.slogan && <div className="slogan">{companySettings.slogan}</div>}
              <div className="order-title">ORDEN DE LABORATORIO</div>
            </div>

            {/* Meta */}
            <div className="lab-meta">
              <div className="meta-item">
                <div className="meta-label">Folio</div>
                <div className="meta-value">{createdOrder.order.order_number}</div>
              </div>
              <div className="meta-item" style={{ textAlign: 'center' }}>
                <div className="meta-label">Promotor</div>
                <div className="meta-value">{createdOrder.promotorName || 'Óptica Istmeña'}</div>
              </div>
              <div className="meta-item" style={{ textAlign: 'right' }}>
                <div className="meta-label">Fecha</div>
                <div className="meta-value">
                  {new Date(createdOrder.order.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Patient */}
            <div className="lab-patient">
              <div className="patient-label">Nombre del Paciente</div>
              <div className="patient-name">{createdOrder.order.patients?.first_name} {createdOrder.order.patients?.last_name}</div>
            </div>

            {/* RX Table */}
            <table className="lab-rx-table">
              <thead>
                <tr>
                  {['RX','SPH','CYL','EJE','ADD','DIP','ALT'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="od-row">
                  <td className="eye-label od-label">OD</td>
                  <td>{formatRxVal(createdOrder.order.od_sphere)}</td>
                  <td>{formatRxVal(createdOrder.order.od_cylinder)}</td>
                  <td>{createdOrder.order.od_axis != null ? `${createdOrder.order.od_axis}°` : ''}</td>
                  <td>{formatRxVal(createdOrder.order.od_add)}</td>
                  <td>{createdOrder.order.pd_right != null ? Number(createdOrder.order.pd_right).toFixed(1) : ''}</td>
                  <td>{createdOrder.order.fitting_height != null ? Number(createdOrder.order.fitting_height).toFixed(1) : ''}</td>
                </tr>
                <tr className="oi-row">
                  <td className="eye-label oi-label">OI</td>
                  <td>{formatRxVal(createdOrder.order.oi_sphere)}</td>
                  <td>{formatRxVal(createdOrder.order.oi_cylinder)}</td>
                  <td>{createdOrder.order.oi_axis != null ? `${createdOrder.order.oi_axis}°` : ''}</td>
                  <td>{formatRxVal(createdOrder.order.oi_add)}</td>
                  <td>{createdOrder.order.pd_left != null ? Number(createdOrder.order.pd_left).toFixed(1) : ''}</td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>

            {/* Details */}
            <div className="lab-details">
              <div className="lab-detail-item">
                <div className="detail-label">Material</div>
                <div className="detail-value">{createdOrder.order.lens_material || '—'}</div>
              </div>
              <div className="lab-detail-item">
                <div className="detail-label">Color de Lente</div>
                <div className="detail-value">{createdOrder.order.lens_color || '—'}</div>
              </div>
              <div className="lab-detail-item">
                <div className="detail-label">Tratamiento</div>
                <div className="detail-value">{createdOrder.order.lens_treatment || '—'}</div>
              </div>
              <div className="lab-detail-item">
                <div className="detail-label">Fecha Estimada Entrega</div>
                <div className="detail-value">
                  {createdOrder.order.estimated_delivery_date
                    ? new Date(createdOrder.order.estimated_delivery_date).toLocaleDateString('es-MX')
                    : '—'}
                </div>
              </div>
              <div className="lab-detail-item">
                <div className="detail-label">Tipo de Lente</div>
                <div className="detail-value">{createdOrder.order.lens_type || '—'}</div>
              </div>
              <div className="lab-detail-item">
                <div className="detail-label">Teléfono Notificaciones</div>
                <div className="detail-value">{companyPhone || '—'}</div>
              </div>
              <div className="lab-detail-item" style={{ gridColumn: '1 / -1' }}>
                <div className="detail-label">Armazón</div>
                <div className="detail-value">{[createdOrder.order.frame_brand, createdOrder.order.frame_model, createdOrder.order.frame_color].filter(Boolean).join(' / ') || '—'}</div>
              </div>
            </div>

            {/* Notes */}
            {(createdOrder.order.special_instructions || createdOrder.order.internal_notes) && (
              <div className="lab-notes">
                <div className="notes-label">Notas / Instrucciones Especiales</div>
                <div className="notes-box">
                  {createdOrder.order.special_instructions || createdOrder.order.internal_notes}
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="lab-signatures">
              <div className="lab-sig-block">
                <div className="lab-sig-line" />
                <div className="lab-sig-label">Elaboró</div>
              </div>
              <div className="lab-sig-block">
                <div className="lab-sig-line" />
                <div className="lab-sig-label">Recibió</div>
              </div>
            </div>

            {/* Footer */}
            <div className="lab-footer">
              <div className="company">{companySettings?.company_name || 'ÓPTICA ISTMEÑA'}</div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function formatRxVal(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const num = Number(val);
  if (num === 0) return '0.00';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}`;
}
