import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Eye, Calendar, FileText, AlertCircle, Check, Search } from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { CartItem } from '@/hooks/useOfflineSync';

interface PrescriptionSelectorProps {
  patientId: string;
  patientName: string;
  onSelectPrescription: (item: Omit<CartItem, 'id' | 'subtotal'>) => void;
  onCancel: () => void;
}

interface Prescription {
  id: string;
  exam_date: string;
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_add: number | null;
  od_pupil_distance: number | null;
  oi_sphere: number | null;
  oi_cylinder: number | null;
  oi_axis: number | null;
  oi_add: number | null;
  oi_pupil_distance: number | null;
  total_pd: number | null;
  lens_type: string | null;
  lens_material: string | null;
  lens_treatment: string | null;
  diagnosis: string | null;
}

const lensTypeLabels: Record<string, string> = {
  monofocal: 'Monofocal',
  bifocal: 'Bifocal',
  progresivo: 'Progresivo',
};

const lensMaterialLabels: Record<string, string> = {
  cr39: 'CR-39',
  policarbonato: 'Policarbonato',
  alto_indice: 'Alto Índice',
  trivex: 'Trivex',
};

const lensTreatmentLabels: Record<string, string> = {
  antirreflejante: 'Antirreflejante',
  fotocromatico: 'Fotocromático',
  blue_block: 'Blue Block',
  transitions: 'Transitions',
};

export function PrescriptionSelector({ 
  patientId, 
  patientName,
  onSelectPrescription, 
  onCancel 
}: PrescriptionSelectorProps) {
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [lensPrice, setLensPrice] = useState('');
  const [lensDescription, setLensDescription] = useState('');

  // Fetch patient prescriptions
  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: ['patient-prescriptions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_prescriptions')
        .select('*')
        .eq('patient_id', patientId)
        .order('exam_date', { ascending: false });

      if (error) throw error;
      return data as Prescription[];
    },
  });

  const formatValue = (value: number | null, prefix: string = '') => {
    if (value === null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${prefix}${sign}${value.toFixed(2)}`;
  };

  const getPrescriptionAge = (date: string) => {
    const months = differenceInMonths(new Date(), new Date(date));
    if (months < 1) return 'Esta semana';
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    return `${years} año${years > 1 ? 's' : ''}`;
  };

  const isExpired = (date: string) => {
    return differenceInMonths(new Date(), new Date(date)) > 24;
  };

  const handleAddToCart = () => {
    if (!selectedPrescription || !lensPrice) return;

    const rx = selectedPrescription;
    const description = lensDescription || `${lensTypeLabels[rx.lens_type || 'monofocal'] || 'Lentes'} - OD: ${formatValue(rx.od_sphere)} ${formatValue(rx.od_cylinder)} x ${rx.od_axis || 0}° | OI: ${formatValue(rx.oi_sphere)} ${formatValue(rx.oi_cylinder)} x ${rx.oi_axis || 0}°`;

    const cartItem: Omit<CartItem, 'id' | 'subtotal'> = {
      productType: 'lens',
      productName: `Lentes Oftálmicos - ${patientName}`,
      description,
      quantity: 1,
      unitPrice: parseFloat(lensPrice),
      discountPercent: 0,
      discountAmount: 0,
      prescriptionData: {
        prescriptionId: rx.id,
        examDate: rx.exam_date,
        od: {
          sphere: rx.od_sphere,
          cylinder: rx.od_cylinder,
          axis: rx.od_axis,
          add: rx.od_add,
          pd: rx.od_pupil_distance,
        },
        oi: {
          sphere: rx.oi_sphere,
          cylinder: rx.oi_cylinder,
          axis: rx.oi_axis,
          add: rx.oi_add,
          pd: rx.oi_pupil_distance,
        },
        totalPd: rx.total_pd,
        lensType: rx.lens_type,
        lensMaterial: rx.lens_material,
        lensTreatment: rx.lens_treatment,
      },
    };

    onSelectPrescription(cartItem);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-medium">Sin recetas registradas</p>
        <p className="text-sm text-muted-foreground mt-1">
          El paciente no tiene graduaciones en el sistema
        </p>
        <Button variant="outline" className="mt-4" onClick={onCancel}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Prescription List */}
      {!selectedPrescription ? (
        <>
          <div className="text-sm text-muted-foreground">
            Selecciona una receta para agregar lentes al carrito
          </div>
          <ScrollArea className="h-[350px]">
            <div className="space-y-3">
              {prescriptions.map((rx, index) => {
                const expired = isExpired(rx.exam_date);
                
                return (
                  <button
                    key={rx.id}
                    onClick={() => setSelectedPrescription(rx)}
                    className={`w-full text-left p-4 rounded-lg border transition-all hover:border-primary/50 hover:bg-primary/5 ${
                      index === 0 ? 'border-primary/30 bg-primary/5' : ''
                    } ${expired ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {format(new Date(rx.exam_date), "d 'de' MMMM yyyy", { locale: es })}
                        </span>
                        {index === 0 && (
                          <Badge variant="default" className="text-xs">Más reciente</Badge>
                        )}
                      </div>
                      <Badge variant={expired ? 'destructive' : 'secondary'} className="text-xs">
                        {getPrescriptionAge(rx.exam_date)}
                      </Badge>
                    </div>

                    {expired && (
                      <div className="flex items-center gap-2 text-xs text-destructive mb-2">
                        <AlertCircle className="h-3 w-3" />
                        Receta vencida (+2 años)
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {/* OD */}
                      <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Eye className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium">OD</span>
                        </div>
                        <div className="text-xs font-mono">
                          {formatValue(rx.od_sphere)} {formatValue(rx.od_cylinder)} x {rx.od_axis || 0}°
                          {rx.od_add && <span className="text-muted-foreground"> Add {formatValue(rx.od_add)}</span>}
                        </div>
                      </div>

                      {/* OI */}
                      <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Eye className="h-3 w-3 text-green-500" />
                          <span className="text-xs font-medium">OI</span>
                        </div>
                        <div className="text-xs font-mono">
                          {formatValue(rx.oi_sphere)} {formatValue(rx.oi_cylinder)} x {rx.oi_axis || 0}°
                          {rx.oi_add && <span className="text-muted-foreground"> Add {formatValue(rx.oi_add)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {rx.total_pd && (
                        <Badge variant="outline" className="text-xs">DP: {rx.total_pd}mm</Badge>
                      )}
                      {rx.lens_type && (
                        <Badge variant="outline" className="text-xs">{lensTypeLabels[rx.lens_type]}</Badge>
                      )}
                      {rx.lens_material && (
                        <Badge variant="outline" className="text-xs">{lensMaterialLabels[rx.lens_material]}</Badge>
                      )}
                      {rx.lens_treatment && (
                        <Badge variant="outline" className="text-xs">{lensTreatmentLabels[rx.lens_treatment]}</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </>
      ) : (
        /* Selected Prescription - Configure & Add */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Receta seleccionada
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setSelectedPrescription(null)}>
              Cambiar
            </Button>
          </div>

          {/* Prescription Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm">
                {format(new Date(selectedPrescription.exam_date), "d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-blue-600 font-medium">OD:</span> {formatValue(selectedPrescription.od_sphere)} {formatValue(selectedPrescription.od_cylinder)} x {selectedPrescription.od_axis || 0}°
              </div>
              <div>
                <span className="text-green-600 font-medium">OI:</span> {formatValue(selectedPrescription.oi_sphere)} {formatValue(selectedPrescription.oi_cylinder)} x {selectedPrescription.oi_axis || 0}°
              </div>
            </div>
            {selectedPrescription.lens_type && (
              <div className="mt-2 p-2 bg-primary/10 border border-primary/20 rounded-md">
                <p className="text-xs text-muted-foreground">Tipo de lentes sugerido por el especialista:</p>
                <p className="text-sm font-semibold text-primary">{lensTypeLabels[selectedPrescription.lens_type] || selectedPrescription.lens_type}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Price & Description */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="lensPrice">Precio de los lentes *</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="lensPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={lensPrice}
                  onChange={(e) => setLensPrice(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <Label htmlFor="lensDescription">Descripción (opcional)</Label>
              <Input
                id="lensDescription"
                value={lensDescription}
                onChange={(e) => setLensDescription(e.target.value)}
                placeholder="Ej: Lentes progresivos con antirreflejante"
                className="mt-1"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleAddToCart}
              disabled={!lensPrice || parseFloat(lensPrice) <= 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Agregar Lentes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
