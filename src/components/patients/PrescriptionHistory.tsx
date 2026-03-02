import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Calendar, TrendingUp, TrendingDown, Minus, Edit, AlertTriangle } from 'lucide-react';

export interface Prescription {
  id: string;
  exam_date: string;
  od_sphere: number | null;
  od_cylinder: number | null;
  od_axis: number | null;
  od_add: number | null;
  od_va_sc: string | null;
  od_va_cc: string | null;
  od_pupil_distance: number | null;
  oi_sphere: number | null;
  oi_cylinder: number | null;
  oi_axis: number | null;
  oi_add: number | null;
  oi_va_sc: string | null;
  oi_va_cc: string | null;
  oi_pupil_distance: number | null;
  total_pd: number | null;
  lens_type: string | null;
  lens_material: string | null;
  lens_treatment: string | null;
  diagnosis: string | null;
  recommendations: string | null;
  notes: string | null;
  examined_by: string | null;
  branch_id: string | null;
  status: 'VIGENTE' | 'CORREGIDA';
  previous_prescription_id: string | null;
  edited_by: string | null;
  edited_at: string | null;
  edit_reason: string | null;
  profiles?: { full_name: string } | null;
}

interface PrescriptionHistoryProps {
  patientId: string;
  onEdit?: (prescription: Prescription) => void;
}

export interface PrescriptionHistoryRef {
  refresh: () => void;
}

export const PrescriptionHistory = forwardRef<PrescriptionHistoryRef, PrescriptionHistoryProps>(
  ({ patientId, onEdit }, ref) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { roles } = useAuth();

  // Check if user can edit prescriptions (admin or doctor)
  const canEdit = roles.some(role => 
    role === 'admin' || role === 'doctor'
  );

  useEffect(() => {
    fetchPrescriptions();
  }, [patientId]);

  useImperativeHandle(ref, () => ({
    refresh: fetchPrescriptions
  }));

  const fetchPrescriptions = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('patient_prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('exam_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar el historial de graduaciones',
        variant: 'destructive',
      });
    } else {
      setPrescriptions((data || []) as Prescription[]);
    }
    
    setLoading(false);
  };

  const formatValue = (value: number | null, prefix: string = '') => {
    if (value === null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${prefix}${sign}${value.toFixed(2)}`;
  };

  const getChangeIndicator = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    const diff = Math.abs(current) - Math.abs(previous);
    if (Math.abs(diff) < 0.25) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (diff > 0) return <TrendingUp className="h-3 w-3 text-orange-500" />;
    return <TrendingDown className="h-3 w-3 text-green-500" />;
  };

  const lensTypeLabels: Record<string, string> = {
    monofocal: 'Monofocal',
    bifocal: 'Bifocal',
    progresivo: 'Progresivo',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-secondary/30 rounded-lg">
        <Eye className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">No hay graduaciones registradas</p>
        <p className="text-sm text-muted-foreground mt-1">
          Registra la primera graduación del paciente
        </p>
      </div>
    );
  }

  // Separate vigentes and corregidas
  const vigentes = prescriptions.filter(rx => rx.status === 'VIGENTE');
  const corregidas = prescriptions.filter(rx => rx.status === 'CORREGIDA');

  // Get previous prescription for change indicators (only from vigentes)
  const getPreviousVigente = (currentRx: Prescription) => {
    const currentIndex = vigentes.findIndex(rx => rx.id === currentRx.id);
    return vigentes[currentIndex + 1];
  };

  const renderPrescriptionCard = (rx: Prescription, isVigente: boolean) => {
    const prevRx = isVigente ? getPreviousVigente(rx) : undefined;
    const isLatest = isVigente && vigentes[0]?.id === rx.id;
    
    return (
      <Card 
        key={rx.id} 
        className={`
          ${isLatest ? 'border-primary/50 bg-primary/5' : ''}
          ${!isVigente ? 'opacity-60 bg-muted/30' : ''}
        `}
      >
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {format(new Date(rx.exam_date), "d 'de' MMMM yyyy", { locale: es })}
              {isLatest && (
                <Badge variant="default" className="ml-2">Vigente</Badge>
              )}
              {!isVigente && (
                <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Corregida
                </Badge>
              )}
            </CardTitle>
            
            {/* Edit button - only for vigentes and authorized users */}
            {isVigente && canEdit && onEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(rx)}
              >
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
          
          {/* Edit info for corrections */}
          {rx.edited_at && (
            <p className="text-xs text-muted-foreground mt-1">
              {rx.edit_reason && <span>Motivo: {rx.edit_reason} • </span>}
              Corregida el {format(new Date(rx.edited_at), "d/MMM/yyyy HH:mm", { locale: es })}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* OD */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Ojo Derecho (OD)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Esf</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{formatValue(rx.od_sphere)}</span>
                    {prevRx && getChangeIndicator(rx.od_sphere, prevRx.od_sphere)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Cil</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{formatValue(rx.od_cylinder)}</span>
                    {prevRx && getChangeIndicator(rx.od_cylinder, prevRx.od_cylinder)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Eje</span>
                  <span className="font-mono block">{rx.od_axis !== null ? `${rx.od_axis}°` : '—'}</span>
                </div>
                {rx.od_add && (
                  <div>
                    <span className="text-xs text-muted-foreground">Add</span>
                    <span className="font-mono block">{formatValue(rx.od_add)}</span>
                  </div>
                )}
                {rx.od_va_cc && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">AV c/c</span>
                    <span className="font-mono block">{rx.od_va_cc}</span>
                  </div>
                )}
              </div>
            </div>

            {/* OI */}
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Ojo Izquierdo (OI)</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Esf</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{formatValue(rx.oi_sphere)}</span>
                    {prevRx && getChangeIndicator(rx.oi_sphere, prevRx.oi_sphere)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Cil</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono">{formatValue(rx.oi_cylinder)}</span>
                    {prevRx && getChangeIndicator(rx.oi_cylinder, prevRx.oi_cylinder)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Eje</span>
                  <span className="font-mono block">{rx.oi_axis !== null ? `${rx.oi_axis}°` : '—'}</span>
                </div>
                {rx.oi_add && (
                  <div>
                    <span className="text-xs text-muted-foreground">Add</span>
                    <span className="font-mono block">{formatValue(rx.oi_add)}</span>
                  </div>
                )}
                {rx.oi_va_cc && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">AV c/c</span>
                    <span className="font-mono block">{rx.oi_va_cc}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
            {rx.total_pd && (
              <Badge variant="outline">DP: {rx.total_pd}mm</Badge>
            )}
            {rx.lens_type && (
              <Badge variant="secondary">{lensTypeLabels[rx.lens_type] || rx.lens_type}</Badge>
            )}
          </div>

          {rx.diagnosis && (
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground">Diagnóstico:</span>
              <p className="text-sm mt-1">{rx.diagnosis}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Vigentes first */}
      {vigentes.map(rx => renderPrescriptionCard(rx, true))}
      
      {/* Corregidas section */}
      {corregidas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pt-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Graduaciones Corregidas ({corregidas.length})
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          {corregidas.map(rx => renderPrescriptionCard(rx, false))}
        </div>
      )}
    </div>
  );
});

PrescriptionHistory.displayName = 'PrescriptionHistory';
