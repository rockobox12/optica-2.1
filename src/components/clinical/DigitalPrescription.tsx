import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Search, User, Eye, Printer, FileText, Glasses } from 'lucide-react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  address: string | null;
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
  total_pd: number | null;
  lens_type: string | null;
  diagnosis: string | null;
}

interface DigitalPrescriptionProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function DigitalPrescription({ onSuccess, onCancel }: DigitalPrescriptionProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [prescriptionType, setPrescriptionType] = useState('anteojos');
  const [notes, setNotes] = useState('');
  const [expiryDays, setExpiryDays] = useState('180');

  const searchPatients = useCallback(async (term: string) => {
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('patients')
      .select('id, first_name, last_name, birth_date, address')
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`)
      .eq('is_active', true)
      .limit(5);
    setSearchResults(data || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchPatients(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, searchPatients]);

  const fetchPrescriptions = async (patientId: string) => {
    const { data } = await supabase
      .from('patient_prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('exam_date', { ascending: false })
      .limit(10);
    
    setPrescriptions((data || []) as Prescription[]);
    if (data && data.length > 0) {
      setSelectedPrescription(data[0] as Prescription);
    }
  };

  const formatPower = (value: number | null) => {
    if (value === null) return '—';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  };

  const getAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const generatePrescription = async () => {
    if (!selectedPatient || !selectedPrescription) {
      toast({
        title: 'Error',
        description: 'Selecciona un paciente y una graduación',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Generate prescription number
      const { data: numberData, error: numberError } = await supabase.rpc('generate_prescription_number');
      
      if (numberError) throw numberError;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));

      const prescriptionData = JSON.parse(JSON.stringify({
        patient: {
          name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
          age: getAge(selectedPatient.birth_date),
          address: selectedPatient.address,
        },
        prescription: selectedPrescription,
        type: prescriptionType,
        notes,
      }));

      const { error } = await supabase
        .from('digital_prescriptions')
        .insert([{
          patient_id: selectedPatient.id,
          prescription_id: selectedPrescription.id,
          created_by: user?.id,
          branch_id: profile?.defaultBranchId || null,
          prescription_type: prescriptionType,
          prescription_number: numberData as string,
          issue_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate.toISOString().split('T')[0],
          prescription_data: prescriptionData,
          doctor_license: profile?.fullName || '',
          notes: notes || null,
        }]);

      if (error) throw error;

      onSuccess();
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
    <div className="space-y-6">
      {/* Patient Selection */}
      {!selectedPatient ? (
        <div className="space-y-2">
          <Label>Buscar Paciente</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nombre del paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
                    fetchPrescriptions(p.id);
                    setSearchTerm('');
                    setSearchResults([]);
                  }}
                >
                  <p className="font-medium">{p.first_name} {p.last_name}</p>
                  {p.birth_date && (
                    <p className="text-sm text-muted-foreground">{getAge(p.birth_date)} años</p>
                  )}
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
            {selectedPatient.birth_date && (
              <p className="text-sm text-muted-foreground">{getAge(selectedPatient.birth_date)} años</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setSelectedPatient(null);
              setPrescriptions([]);
              setSelectedPrescription(null);
            }}
          >
            Cambiar
          </Button>
        </div>
      )}

      {/* Prescription Selection */}
      {selectedPatient && prescriptions.length > 0 && (
        <div className="space-y-2">
          <Label>Seleccionar Graduación</Label>
          <Select
            value={selectedPrescription?.id || ''}
            onValueChange={(value) => {
              const rx = prescriptions.find(p => p.id === value);
              setSelectedPrescription(rx || null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar graduación" />
            </SelectTrigger>
            <SelectContent>
              {prescriptions.map(rx => (
                <SelectItem key={rx.id} value={rx.id}>
                  {format(new Date(rx.exam_date), "d 'de' MMMM yyyy", { locale: es })}
                  {rx.diagnosis && ` - ${rx.diagnosis}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Prescription Preview */}
      {selectedPrescription && (
        <Card className="border-primary/30">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Glasses className="h-4 w-4 text-primary" />
              Datos de la Receta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    <span className="font-mono block">{formatPower(selectedPrescription.od_sphere)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Cil</span>
                    <span className="font-mono block">{formatPower(selectedPrescription.od_cylinder)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Eje</span>
                    <span className="font-mono block">{selectedPrescription.od_axis !== null ? `${selectedPrescription.od_axis}°` : '—'}</span>
                  </div>
                </div>
                {selectedPrescription.od_add && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Adición: </span>
                    <span className="font-mono">{formatPower(selectedPrescription.od_add)}</span>
                  </div>
                )}
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
                    <span className="font-mono block">{formatPower(selectedPrescription.oi_sphere)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Cil</span>
                    <span className="font-mono block">{formatPower(selectedPrescription.oi_cylinder)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Eje</span>
                    <span className="font-mono block">{selectedPrescription.oi_axis !== null ? `${selectedPrescription.oi_axis}°` : '—'}</span>
                  </div>
                </div>
                {selectedPrescription.oi_add && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Adición: </span>
                    <span className="font-mono">{formatPower(selectedPrescription.oi_add)}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedPrescription.total_pd && (
              <div className="text-sm">
                <span className="text-muted-foreground">DP Total: </span>
                <span className="font-mono font-medium">{selectedPrescription.total_pd} mm</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prescription Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Receta</Label>
          <Select value={prescriptionType} onValueChange={setPrescriptionType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anteojos">Anteojos</SelectItem>
              <SelectItem value="lentes_contacto">Lentes de Contacto</SelectItem>
              <SelectItem value="ambos">Ambos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Vigencia (días)</Label>
          <Select value={expiryDays} onValueChange={setExpiryDays}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="60">60 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
              <SelectItem value="180">6 meses</SelectItem>
              <SelectItem value="365">1 año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Notas adicionales</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Indicaciones especiales, recomendaciones..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          onClick={generatePrescription} 
          disabled={loading || !selectedPatient || !selectedPrescription}
          className="gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Generando...
            </span>
          ) : (
            <>
              <FileText className="h-4 w-4" />
              Generar Receta
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
