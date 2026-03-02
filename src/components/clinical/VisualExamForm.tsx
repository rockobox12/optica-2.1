import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Activity, Search, User, ShoppingCart } from 'lucide-react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
}

interface VisualExamFormProps {
  patient: Patient | null;
  onSuccess: () => void;
  onCancel: () => void;
  /** Called with exam data after save to proceed to POS */
  onSuccessWithExamData?: (data: { patientId: string; examId: string }) => void;
  /** Show the "Guardar y pasar a venta" button */
  showGoToPOS?: boolean;
}

export function VisualExamForm({ 
  patient, 
  onSuccess, 
  onCancel,
  onSuccessWithExamData,
  showGoToPOS = false,
}: VisualExamFormProps) {
  const { toast } = useToast();
  const { user, profile, hasAnyRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saveMode, setSaveMode] = useState<'default' | 'goToPOS'>('default');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(patient);
  
  const [formData, setFormData] = useState({
    // Queratometría OD
    od_k1: '', od_k1_axis: '', od_k2: '', od_k2_axis: '',
    // Queratometría OI
    oi_k1: '', oi_k1_axis: '', oi_k2: '', oi_k2_axis: '',
    // Tonometría
    od_iop: '', oi_iop: '', iop_method: '',
    // Biomicroscopía
    od_anterior_segment: '', oi_anterior_segment: '',
    // Fondo de ojo
    od_fundus: '', oi_fundus: '',
    od_cup_disc_ratio: '', oi_cup_disc_ratio: '',
    // Motilidad
    cover_test: '', convergence_near_point: '',
    // Pupilas
    od_pupil_size: '', oi_pupil_size: '', pupil_reaction: '',
    // Diagnóstico
    diagnosis: '', notes: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const searchPatients = async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('patients')
      .select('id, first_name, last_name, birth_date')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
      .eq('is_active', true)
      .limit(5);
    setSearchResults(data || []);
  };

  const calculateKAvg = (k1: string, k2: string) => {
    const k1Num = parseFloat(k1);
    const k2Num = parseFloat(k2);
    if (!isNaN(k1Num) && !isNaN(k2Num)) {
      return ((k1Num + k2Num) / 2).toFixed(2);
    }
    return null;
  };

  const calculateCornealAstig = (k1: string, k2: string) => {
    const k1Num = parseFloat(k1);
    const k2Num = parseFloat(k2);
    if (!isNaN(k1Num) && !isNaN(k2Num)) {
      return Math.abs(k1Num - k2Num).toFixed(2);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast({
        title: 'Error',
        description: 'Selecciona un paciente',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const examData = {
        patient_id: selectedPatient.id,
        examined_by: user?.id,
        branch_id: profile?.defaultBranchId || null,
        // Queratometría OD
        od_k1: formData.od_k1 ? parseFloat(formData.od_k1) : null,
        od_k1_axis: formData.od_k1_axis ? parseInt(formData.od_k1_axis) : null,
        od_k2: formData.od_k2 ? parseFloat(formData.od_k2) : null,
        od_k2_axis: formData.od_k2_axis ? parseInt(formData.od_k2_axis) : null,
        od_k_avg: calculateKAvg(formData.od_k1, formData.od_k2) ? parseFloat(calculateKAvg(formData.od_k1, formData.od_k2)!) : null,
        od_corneal_astig: calculateCornealAstig(formData.od_k1, formData.od_k2) ? parseFloat(calculateCornealAstig(formData.od_k1, formData.od_k2)!) : null,
        // Queratometría OI
        oi_k1: formData.oi_k1 ? parseFloat(formData.oi_k1) : null,
        oi_k1_axis: formData.oi_k1_axis ? parseInt(formData.oi_k1_axis) : null,
        oi_k2: formData.oi_k2 ? parseFloat(formData.oi_k2) : null,
        oi_k2_axis: formData.oi_k2_axis ? parseInt(formData.oi_k2_axis) : null,
        oi_k_avg: calculateKAvg(formData.oi_k1, formData.oi_k2) ? parseFloat(calculateKAvg(formData.oi_k1, formData.oi_k2)!) : null,
        oi_corneal_astig: calculateCornealAstig(formData.oi_k1, formData.oi_k2) ? parseFloat(calculateCornealAstig(formData.oi_k1, formData.oi_k2)!) : null,
        // Tonometría
        od_iop: formData.od_iop ? parseFloat(formData.od_iop) : null,
        oi_iop: formData.oi_iop ? parseFloat(formData.oi_iop) : null,
        iop_method: formData.iop_method || null,
        // Biomicroscopía
        od_anterior_segment: formData.od_anterior_segment || null,
        oi_anterior_segment: formData.oi_anterior_segment || null,
        // Fondo de ojo
        od_fundus: formData.od_fundus || null,
        oi_fundus: formData.oi_fundus || null,
        od_cup_disc_ratio: formData.od_cup_disc_ratio ? parseFloat(formData.od_cup_disc_ratio) : null,
        oi_cup_disc_ratio: formData.oi_cup_disc_ratio ? parseFloat(formData.oi_cup_disc_ratio) : null,
        // Motilidad
        cover_test: formData.cover_test || null,
        convergence_near_point: formData.convergence_near_point || null,
        // Pupilas
        od_pupil_size: formData.od_pupil_size ? parseFloat(formData.od_pupil_size) : null,
        oi_pupil_size: formData.oi_pupil_size ? parseFloat(formData.oi_pupil_size) : null,
        pupil_reaction: formData.pupil_reaction || null,
        // Diagnóstico
        diagnosis: formData.diagnosis || null,
        notes: formData.notes || null,
      };

      const { data: savedExam, error } = await supabase
        .from('visual_exams')
        .insert(examData)
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Examen registrado',
        description: 'El examen visual ha sido guardado correctamente',
      });

      // Handle different save modes
      if (saveMode === 'goToPOS' && savedExam && onSuccessWithExamData) {
        onSuccessWithExamData({
          patientId: selectedPatient.id,
          examId: savedExam.id,
        });
      } else {
        onSuccess();
      }
      
      // Reset save mode
      setSaveMode('default');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient Selection */}
      {!selectedPatient ? (
        <div className="space-y-2">
          <Label>Buscar Paciente *</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nombre del paciente..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchPatients(e.target.value);
              }}
              className="pl-10"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              {searchResults.map(p => (
                <div
                  key={p.id}
                  className="p-3 hover:bg-secondary/50 cursor-pointer border-b last:border-b-0"
                  onClick={() => {
                    setSelectedPatient(p);
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                >
                  <p className="font-medium">{p.first_name} {p.last_name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
          <User className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{selectedPatient.first_name} {selectedPatient.last_name}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setSelectedPatient(null)}
          >
            Cambiar
          </Button>
        </div>
      )}

      <Tabs defaultValue="keratometry" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keratometry">Queratometría</TabsTrigger>
          <TabsTrigger value="tonometry">Tonometría</TabsTrigger>
          <TabsTrigger value="biomicroscopy">Biomicroscopía</TabsTrigger>
          <TabsTrigger value="diagnosis">Diagnóstico</TabsTrigger>
        </TabsList>

        {/* Queratometría */}
        <TabsContent value="keratometry" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OD */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  Ojo Derecho (OD)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">K1 (D)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={formData.od_k1}
                      onChange={(e) => handleChange('od_k1', e.target.value)}
                      placeholder="43.00"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">K1 Eje°</Label>
                    <Input
                      type="number"
                      min="0"
                      max="180"
                      value={formData.od_k1_axis}
                      onChange={(e) => handleChange('od_k1_axis', e.target.value)}
                      placeholder="180"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">K2 (D)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={formData.od_k2}
                      onChange={(e) => handleChange('od_k2', e.target.value)}
                      placeholder="44.00"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">K2 Eje°</Label>
                    <Input
                      type="number"
                      min="0"
                      max="180"
                      value={formData.od_k2_axis}
                      onChange={(e) => handleChange('od_k2_axis', e.target.value)}
                      placeholder="90"
                      className="h-9"
                    />
                  </div>
                </div>
                {formData.od_k1 && formData.od_k2 && (
                  <div className="pt-2 border-t text-sm">
                    <p><span className="text-muted-foreground">K Promedio:</span> {calculateKAvg(formData.od_k1, formData.od_k2)} D</p>
                    <p><span className="text-muted-foreground">Astig. Corneal:</span> {calculateCornealAstig(formData.od_k1, formData.od_k2)} D</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OI */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-500" />
                  Ojo Izquierdo (OI)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">K1 (D)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={formData.oi_k1}
                      onChange={(e) => handleChange('oi_k1', e.target.value)}
                      placeholder="43.00"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">K1 Eje°</Label>
                    <Input
                      type="number"
                      min="0"
                      max="180"
                      value={formData.oi_k1_axis}
                      onChange={(e) => handleChange('oi_k1_axis', e.target.value)}
                      placeholder="180"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">K2 (D)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={formData.oi_k2}
                      onChange={(e) => handleChange('oi_k2', e.target.value)}
                      placeholder="44.00"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">K2 Eje°</Label>
                    <Input
                      type="number"
                      min="0"
                      max="180"
                      value={formData.oi_k2_axis}
                      onChange={(e) => handleChange('oi_k2_axis', e.target.value)}
                      placeholder="90"
                      className="h-9"
                    />
                  </div>
                </div>
                {formData.oi_k1 && formData.oi_k2 && (
                  <div className="pt-2 border-t text-sm">
                    <p><span className="text-muted-foreground">K Promedio:</span> {calculateKAvg(formData.oi_k1, formData.oi_k2)} D</p>
                    <p><span className="text-muted-foreground">Astig. Corneal:</span> {calculateCornealAstig(formData.oi_k1, formData.oi_k2)} D</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tonometría */}
        <TabsContent value="tonometry" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>PIO OD (mmHg)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.od_iop}
                onChange={(e) => handleChange('od_iop', e.target.value)}
                placeholder="14"
              />
            </div>
            <div className="space-y-2">
              <Label>PIO OI (mmHg)</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.oi_iop}
                onChange={(e) => handleChange('oi_iop', e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-2">
              <Label>Método</Label>
              <Select
                value={formData.iop_method}
                onValueChange={(value) => handleChange('iop_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goldman">Goldman</SelectItem>
                  <SelectItem value="nct">NCT (Aire)</SelectItem>
                  <SelectItem value="icare">iCare</SelectItem>
                  <SelectItem value="perkins">Perkins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Relación Copa/Disco OD</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.od_cup_disc_ratio}
                onChange={(e) => handleChange('od_cup_disc_ratio', e.target.value)}
                placeholder="0.3"
              />
            </div>
            <div className="space-y-2">
              <Label>Relación Copa/Disco OI</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.oi_cup_disc_ratio}
                onChange={(e) => handleChange('oi_cup_disc_ratio', e.target.value)}
                placeholder="0.3"
              />
            </div>
          </div>
        </TabsContent>

        {/* Biomicroscopía */}
        <TabsContent value="biomicroscopy" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Segmento Anterior OD</Label>
              <Textarea
                value={formData.od_anterior_segment}
                onChange={(e) => handleChange('od_anterior_segment', e.target.value)}
                placeholder="Córnea clara, CA profunda, cristalino transparente..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Segmento Anterior OI</Label>
              <Textarea
                value={formData.oi_anterior_segment}
                onChange={(e) => handleChange('oi_anterior_segment', e.target.value)}
                placeholder="Córnea clara, CA profunda, cristalino transparente..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Fondo de Ojo OD</Label>
              <Textarea
                value={formData.od_fundus}
                onChange={(e) => handleChange('od_fundus', e.target.value)}
                placeholder="Papila rosada, bordes definidos, mácula normal..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Fondo de Ojo OI</Label>
              <Textarea
                value={formData.oi_fundus}
                onChange={(e) => handleChange('oi_fundus', e.target.value)}
                placeholder="Papila rosada, bordes definidos, mácula normal..."
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cover Test</Label>
              <Input
                value={formData.cover_test}
                onChange={(e) => handleChange('cover_test', e.target.value)}
                placeholder="Ortoforia, exoforia 4Δ..."
              />
            </div>
            <div className="space-y-2">
              <Label>PPC (Punto Próximo Convergencia)</Label>
              <Input
                value={formData.convergence_near_point}
                onChange={(e) => handleChange('convergence_near_point', e.target.value)}
                placeholder="8 cm"
              />
            </div>
          </div>
        </TabsContent>

        {/* Diagnóstico */}
        <TabsContent value="diagnosis" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Textarea
              value={formData.diagnosis}
              onChange={(e) => handleChange('diagnosis', e.target.value)}
              placeholder="Miopía simple, astigmatismo miópico compuesto..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Notas adicionales</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Observaciones, recomendaciones..."
              rows={3}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        
        {/* Secondary button: Save and go to POS */}
        {showGoToPOS && onSuccessWithExamData && (
          <Button 
            type="submit"
            variant="secondary"
            disabled={loading || !selectedPatient}
            onClick={() => setSaveMode('goToPOS')}
            className="gap-2"
          >
            {loading && saveMode === 'goToPOS' ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Guardar y pasar a venta
              </>
            )}
          </Button>
        )}
        
        {/* Primary button: Regular save */}
        <Button 
          type="submit" 
          disabled={loading || !selectedPatient}
          onClick={() => setSaveMode('default')}
        >
          {loading && saveMode === 'default' ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Guardando...
            </span>
          ) : (
            'Guardar Examen'
          )}
        </Button>
      </div>
    </form>
  );
}
