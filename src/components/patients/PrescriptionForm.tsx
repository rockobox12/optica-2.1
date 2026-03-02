import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Eye, Glasses, AlertCircle, User } from 'lucide-react';
import { OpticalValueInput } from '@/components/clinical/OpticalValueInput';
import { AxisInput } from '@/components/clinical/AxisInput';
import { AdditionInputWithAge } from '@/components/clinical/AdditionInputWithAge';
import { parseAddValue } from '@/lib/prescription-validation';
import { PrescriptionAIValidatorPanel } from '@/components/clinical/PrescriptionAIValidatorPanel';
import { usePrescriptionAIValidator } from '@/hooks/usePrescriptionAIValidator';
import { calculateAge } from '@/hooks/useAddClinicalConfig';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';
import {
  validatePrescription,
  calculateSignedValue,
  hasValue,
  parseSignedValue,
  type EyeData,
  type ValidationErrors,
} from '@/lib/prescription-validation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Prescription } from './PrescriptionHistory';

interface PrescriptionFormProps {
  patientId: string;
  patientBirthDate?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
  editingPrescription?: Prescription | null;
}

interface EyeFormData {
  sphereValue: string;
  sphereSign: '+' | '-' | '';
  cylinderValue: string;
  cylinderSign: '+' | '-' | '';
  axis: string;
  add: string;
  pupilDistance: string;
  vaSc: string;
  vaCc: string;
}

const initialEyeData: EyeFormData = {
  sphereValue: '',
  sphereSign: '',
  cylinderValue: '',
  cylinderSign: '',
  axis: '',
  add: '',
  pupilDistance: '',
  vaSc: '',
  vaCc: '',
};

// Convert a database value to form data
const dbValueToFormData = (dbValue: number | null): { value: string; sign: '+' | '-' | '' } => {
  return parseSignedValue(dbValue);
};

export function PrescriptionForm({ 
  patientId, 
  patientBirthDate,
  onSuccess, 
  onCancel, 
  editingPrescription 
}: PrescriptionFormProps) {
  const patientAge = calculateAge(patientBirthDate ?? null);
  const { toast } = useToast();
  const { user, profile, roles } = useAuth();
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ od: false, oi: false });
  
  // AI Validator
  const aiValidator = usePrescriptionAIValidator();
  const canUseAI = roles.some(role => role === 'admin' || role === 'doctor');
  
  const isEditMode = !!editingPrescription;
  
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [odData, setOdData] = useState<EyeFormData>(initialEyeData);
  const [oiData, setOiData] = useState<EyeFormData>(initialEyeData);
  const [editReason, setEditReason] = useState('');
  
  const [generalData, setGeneralData] = useState({
    totalPd: '',
    lensType: '',
    lensMaterial: '',
    lensTreatment: '',
    diagnosis: '',
    recommendations: '',
    notes: '',
  });

  // Validation state
  const [odErrors, setOdErrors] = useState<ValidationErrors>({});
  const [oiErrors, setOiErrors] = useState<ValidationErrors>({});
  const [odAxisFocus, setOdAxisFocus] = useState(false);
  const [oiAxisFocus, setOiAxisFocus] = useState(false);

  // Load existing data when editing
  useEffect(() => {
    if (editingPrescription) {
      setExamDate(editingPrescription.exam_date);
      
      // OD data
      const odSphere = dbValueToFormData(editingPrescription.od_sphere);
      const odCylinder = dbValueToFormData(editingPrescription.od_cylinder);
      setOdData({
        sphereValue: odSphere.value,
        sphereSign: odSphere.sign,
        cylinderValue: odCylinder.value,
        cylinderSign: odCylinder.sign,
        axis: editingPrescription.od_axis?.toString() || '',
        add: editingPrescription.od_add?.toString() || '',
        pupilDistance: editingPrescription.od_pupil_distance?.toString() || '',
        vaSc: editingPrescription.od_va_sc || '',
        vaCc: editingPrescription.od_va_cc || '',
      });
      
      // OI data
      const oiSphere = dbValueToFormData(editingPrescription.oi_sphere);
      const oiCylinder = dbValueToFormData(editingPrescription.oi_cylinder);
      setOiData({
        sphereValue: oiSphere.value,
        sphereSign: oiSphere.sign,
        cylinderValue: oiCylinder.value,
        cylinderSign: oiCylinder.sign,
        axis: editingPrescription.oi_axis?.toString() || '',
        add: editingPrescription.oi_add?.toString() || '',
        pupilDistance: editingPrescription.oi_pupil_distance?.toString() || '',
        vaSc: editingPrescription.oi_va_sc || '',
        vaCc: editingPrescription.oi_va_cc || '',
      });
      
      // General data
      setGeneralData({
        totalPd: editingPrescription.total_pd?.toString() || '',
        lensType: editingPrescription.lens_type || '',
        lensMaterial: editingPrescription.lens_material || '',
        lensTreatment: editingPrescription.lens_treatment || '',
        diagnosis: editingPrescription.diagnosis || '',
        recommendations: editingPrescription.recommendations || '',
        notes: editingPrescription.notes || '',
      });
    }
  }, [editingPrescription]);

  // Convert form data to validation format
  const getEyeValidationData = (data: EyeFormData): EyeData => ({
    sphereValue: data.sphereValue,
    sphereSign: data.sphereSign,
    cylinderValue: data.cylinderValue,
    cylinderSign: data.cylinderSign,
    axis: data.axis,
    add: data.add,
  });

  // Validate prescription on demand
  const runValidation = useCallback(() => {
    const result = validatePrescription(
      getEyeValidationData(odData),
      getEyeValidationData(oiData)
    );
    
    setOdErrors(result.odErrors);
    setOiErrors(result.oiErrors);
    setOdAxisFocus(result.odRequiresAxisFocus);
    setOiAxisFocus(result.oiRequiresAxisFocus);
    
    return result.isValid;
  }, [odData, oiData]);

  // Check if form has validation errors
  const hasErrors = useMemo(() => {
    const result = validatePrescription(
      getEyeValidationData(odData),
      getEyeValidationData(oiData)
    );
    return !result.isValid;
  }, [odData, oiData]);

  // Update OD data
  const updateOdData = (field: keyof EyeFormData, value: string | '+' | '-' | '') => {
    setOdData(prev => ({ ...prev, [field]: value }));
    if (touched.od) {
      setTimeout(() => runValidation(), 0);
    }
  };

  // Update OI data
  const updateOiData = (field: keyof EyeFormData, value: string | '+' | '-' | '') => {
    setOiData(prev => ({ ...prev, [field]: value }));
    if (touched.oi) {
      setTimeout(() => runValidation(), 0);
    }
  };

  // Handle blur events for validation
  const handleOdBlur = () => {
    setTouched(prev => ({ ...prev, od: true }));
    runValidation();
  };

  const handleOiBlur = () => {
    setTouched(prev => ({ ...prev, oi: true }));
    runValidation();
  };

  // AI Analysis function
  const handleAIAnalyze = async () => {
    const currentPrescription = {
      od_sphere: calculateSignedValue(odData.sphereValue, odData.sphereSign),
      od_cylinder: calculateSignedValue(odData.cylinderValue, odData.cylinderSign),
      od_axis: odData.axis ? parseInt(odData.axis) : null,
      od_add: odData.add ? parseFloat(odData.add) : null,
      oi_sphere: calculateSignedValue(oiData.sphereValue, oiData.sphereSign),
      oi_cylinder: calculateSignedValue(oiData.cylinderValue, oiData.cylinderSign),
      oi_axis: oiData.axis ? parseInt(oiData.axis) : null,
      oi_add: oiData.add ? parseFloat(oiData.add) : null,
    };

    const result = await aiValidator.analyze(patientId, currentPrescription);
    
    // Save audit record if there are findings
    if (result && result.findings.length > 0 && user) {
      await aiValidator.saveAudit(
        patientId,
        editingPrescription?.id || null,
        user.id,
        result.findings,
        result.severity
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Force validation on both eyes
    setTouched({ od: true, oi: true });
    const isValid = runValidation();
    
    if (!isValid) {
      toast({
        title: 'Errores de validación',
        description: 'Corrige los errores en el formulario antes de guardar',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const prescriptionData = {
        patient_id: patientId,
        examined_by: user?.id,
        branch_id: profile?.defaultBranchId || null,
        exam_date: examDate,
        // OD - using parseAddValue for ADD to ensure positive values only
        od_sphere: calculateSignedValue(odData.sphereValue, odData.sphereSign),
        od_cylinder: calculateSignedValue(odData.cylinderValue, odData.cylinderSign),
        od_axis: odData.axis ? parseInt(odData.axis) : null,
        od_add: parseAddValue(odData.add),
        od_va_sc: odData.vaSc || null,
        od_va_cc: odData.vaCc || null,
        od_pupil_distance: odData.pupilDistance ? parseFloat(odData.pupilDistance) : null,
        // OI - using parseAddValue for ADD to ensure positive values only
        oi_sphere: calculateSignedValue(oiData.sphereValue, oiData.sphereSign),
        oi_cylinder: calculateSignedValue(oiData.cylinderValue, oiData.cylinderSign),
        oi_axis: oiData.axis ? parseInt(oiData.axis) : null,
        oi_add: parseAddValue(oiData.add),
        oi_va_sc: oiData.vaSc || null,
        oi_va_cc: oiData.vaCc || null,
        oi_pupil_distance: oiData.pupilDistance ? parseFloat(oiData.pupilDistance) : null,
        // General
        total_pd: generalData.totalPd ? parseFloat(generalData.totalPd) : null,
        lens_type: generalData.lensType || null,
        lens_material: generalData.lensMaterial || null,
        lens_treatment: generalData.lensTreatment || null,
        diagnosis: generalData.diagnosis || null,
        recommendations: generalData.recommendations || null,
        notes: generalData.notes || null,
        // Version control
        status: 'VIGENTE' as const,
      };

      if (isEditMode && editingPrescription) {
        // EDIT MODE: Create new version and mark old as CORREGIDA
        
        // 1. Mark old prescription as CORREGIDA
        const { error: updateError } = await supabase
          .from('patient_prescriptions')
          .update({ 
            status: 'CORREGIDA',
            edited_by: user?.id,
            edited_at: new Date().toISOString(),
            edit_reason: editReason || 'Corrección de datos',
          })
          .eq('id', editingPrescription.id);

        if (updateError) throw updateError;

        // 2. Create new prescription with reference to old one
        const { error: insertError } = await supabase
          .from('patient_prescriptions')
          .insert({
            ...prescriptionData,
            previous_prescription_id: editingPrescription.id,
          });

        if (insertError) throw insertError;

        toast({
          title: 'Graduación corregida',
          description: 'Se ha creado una nueva versión de la graduación',
        });
      } else {
        // NEW MODE: Simple insert
        const { error } = await supabase
          .from('patient_prescriptions')
          .insert(prescriptionData);

        if (error) throw error;

        toast({
          title: 'Graduación registrada',
          description: 'La nueva graduación ha sido guardada correctamente',
        });
      }

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

  // Show summary of errors
  const errorSummary = useMemo(() => {
    const errors: string[] = [];
    if (odErrors.sphereSign) errors.push('OD: Esfera requiere signo');
    if (odErrors.cylinderSign) errors.push('OD: Cilindro requiere signo');
    if (odErrors.axis) errors.push('OD: ' + odErrors.axis);
    if (odErrors.add) errors.push('OD: ' + odErrors.add);
    if (oiErrors.sphereSign) errors.push('OI: Esfera requiere signo');
    if (oiErrors.cylinderSign) errors.push('OI: Cilindro requiere signo');
    if (oiErrors.axis) errors.push('OI: ' + oiErrors.axis);
    if (oiErrors.add) errors.push('OI: ' + oiErrors.add);
    return errors;
  }, [odErrors, oiErrors]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient age info banner */}
      {patientAge !== null && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/50 border border-accent">
          <User className="h-4 w-4 text-accent-foreground" />
          <span className="text-sm">
            <strong>Edad del paciente:</strong> {patientAge} años
          </span>
        </div>
      )}
      
      {/* Edit mode indicator */}
      {isEditMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Modo edición:</strong> Al guardar, se creará una nueva versión y la graduación anterior será marcada como "Corregida".
          </AlertDescription>
        </Alert>
      )}

      {/* Validation Errors Summary */}
      {errorSummary.length > 0 && (touched.od || touched.oi) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {errorSummary.map((err, i) => (
                <li key={i} className="text-sm">{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Fecha de examen */}
      <MaskedDateInput
        value={examDate}
        onChange={setExamDate}
        label="Fecha del examen"
        mode="general"
        required
      />

      {/* Edit reason (only in edit mode) */}
      {isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="edit_reason">Motivo de la corrección (opcional)</Label>
          <Input
            id="edit_reason"
            type="text"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Ej: Error de captura, valores incorrectos..."
            maxLength={200}
          />
        </div>
      )}

      {/* Prescription Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ojo Derecho */}
        <Card className={Object.keys(odErrors).length > 0 && touched.od ? 'border-destructive/50' : ''}>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              Ojo Derecho (OD)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <OpticalValueInput
                label="Esfera"
                value={odData.sphereValue}
                sign={odData.sphereSign}
                onChange={(value, sign) => {
                  updateOdData('sphereValue', value);
                  updateOdData('sphereSign', sign);
                }}
                onBlur={handleOdBlur}
                error={touched.od ? odErrors.sphereSign : undefined}
              />
              <OpticalValueInput
                label="Cilindro"
                value={odData.cylinderValue}
                sign={odData.cylinderSign}
                onChange={(value, sign) => {
                  updateOdData('cylinderValue', value);
                  updateOdData('cylinderSign', sign);
                }}
                onBlur={handleOdBlur}
                error={touched.od ? odErrors.cylinderSign : undefined}
              />
              <AxisInput
                value={odData.axis}
                onChange={(value) => updateOdData('axis', value)}
                onBlur={handleOdBlur}
                required={hasValue(odData.cylinderValue)}
                error={touched.od ? odErrors.axis : undefined}
                focusOnError={odAxisFocus}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <AdditionInputWithAge
                value={odData.add}
                onChange={(value) => updateOdData('add', value)}
                onBlur={handleOdBlur}
                error={touched.od ? odErrors.add : undefined}
                sphereHasValue={hasValue(odData.sphereValue)}
                patientBirthDate={patientBirthDate}
              />
              <div className="space-y-1">
                <Label className="text-xs">DP (mm)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={odData.pupilDistance}
                  onChange={(e) => updateOdData('pupilDistance', e.target.value)}
                  placeholder="32"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">AV s/c</Label>
                <Input
                  value={odData.vaSc}
                  onChange={(e) => updateOdData('vaSc', e.target.value)}
                  placeholder="20/200"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AV c/c</Label>
                <Input
                  value={odData.vaCc}
                  onChange={(e) => updateOdData('vaCc', e.target.value)}
                  placeholder="20/20"
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ojo Izquierdo */}
        <Card className={Object.keys(oiErrors).length > 0 && touched.oi ? 'border-destructive/50' : ''}>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              Ojo Izquierdo (OI)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <OpticalValueInput
                label="Esfera"
                value={oiData.sphereValue}
                sign={oiData.sphereSign}
                onChange={(value, sign) => {
                  updateOiData('sphereValue', value);
                  updateOiData('sphereSign', sign);
                }}
                onBlur={handleOiBlur}
                error={touched.oi ? oiErrors.sphereSign : undefined}
              />
              <OpticalValueInput
                label="Cilindro"
                value={oiData.cylinderValue}
                sign={oiData.cylinderSign}
                onChange={(value, sign) => {
                  updateOiData('cylinderValue', value);
                  updateOiData('cylinderSign', sign);
                }}
                onBlur={handleOiBlur}
                error={touched.oi ? oiErrors.cylinderSign : undefined}
              />
              <AxisInput
                value={oiData.axis}
                onChange={(value) => updateOiData('axis', value)}
                onBlur={handleOiBlur}
                required={hasValue(oiData.cylinderValue)}
                error={touched.oi ? oiErrors.axis : undefined}
                focusOnError={oiAxisFocus}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <AdditionInputWithAge
                value={oiData.add}
                onChange={(value) => updateOiData('add', value)}
                onBlur={handleOiBlur}
                error={touched.oi ? oiErrors.add : undefined}
                sphereHasValue={hasValue(oiData.sphereValue)}
                patientBirthDate={patientBirthDate}
              />
              <div className="space-y-1">
                <Label className="text-xs">DP (mm)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={oiData.pupilDistance}
                  onChange={(e) => updateOiData('pupilDistance', e.target.value)}
                  placeholder="32"
                  className="h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">AV s/c</Label>
                <Input
                  value={oiData.vaSc}
                  onChange={(e) => updateOiData('vaSc', e.target.value)}
                  placeholder="20/200"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AV c/c</Label>
                <Input
                  value={oiData.vaCc}
                  onChange={(e) => updateOiData('vaCc', e.target.value)}
                  placeholder="20/20"
                  className="h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Validator Panel - only for admin/doctor */}
      {canUseAI && (
        <PrescriptionAIValidatorPanel
          onAnalyze={handleAIAnalyze}
          loading={aiValidator.loading}
          result={aiValidator.result}
          error={aiValidator.error}
          onMarkReviewed={() => aiValidator.reset()}
        />
      )}

      {/* Lens Recommendations */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Glasses className="h-4 w-4 text-primary" />
            Recomendación de Lentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>DP Total (mm)</Label>
              <Input
                type="number"
                step="0.5"
                value={generalData.totalPd}
                onChange={(e) => setGeneralData(prev => ({ ...prev, totalPd: e.target.value }))}
                placeholder="64"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de lente</Label>
              <Select
                value={generalData.lensType}
                onValueChange={(value) => setGeneralData(prev => ({ ...prev, lensType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monofocal">Monofocal</SelectItem>
                  <SelectItem value="bifocal">Bifocal</SelectItem>
                  <SelectItem value="progresivo">Progresivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Material</Label>
              <Select
                value={generalData.lensMaterial}
                onValueChange={(value) => setGeneralData(prev => ({ ...prev, lensMaterial: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cr39">CR-39</SelectItem>
                  <SelectItem value="policarbonato">Policarbonato</SelectItem>
                  <SelectItem value="trivex">Trivex</SelectItem>
                  <SelectItem value="alto_indice">Alto índice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tratamiento</Label>
              <Select
                value={generalData.lensTreatment}
                onValueChange={(value) => setGeneralData(prev => ({ ...prev, lensTreatment: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="antirreflejante">Antirreflejante</SelectItem>
                  <SelectItem value="transitions">Transitions</SelectItem>
                  <SelectItem value="blue_block">Blue Block</SelectItem>
                  <SelectItem value="polarizado">Polarizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Diagnóstico</Label>
            <Textarea
              value={generalData.diagnosis}
              onChange={(e) => setGeneralData(prev => ({ ...prev, diagnosis: e.target.value }))}
              placeholder="Diagnóstico del examen visual..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Recomendaciones</Label>
            <Textarea
              value={generalData.recommendations}
              onChange={(e) => setGeneralData(prev => ({ ...prev, recommendations: e.target.value }))}
              placeholder="Recomendaciones para el paciente..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Notas adicionales</Label>
            <Textarea
              value={generalData.notes}
              onChange={(e) => setGeneralData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observaciones..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={loading || (hasErrors && (touched.od || touched.oi))}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Guardando...
            </span>
          ) : isEditMode ? (
            'Guardar Corrección'
          ) : (
            'Guardar Graduación'
          )}
        </Button>
      </div>
    </form>
  );
}
