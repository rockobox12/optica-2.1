import { useState, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toTitleCaseName } from '@/lib/text-utils';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Phone, MapPin, Heart, MessageCircle, Stethoscope } from 'lucide-react';
import { BirthDatePicker } from './BirthDatePicker';
import { LocationPicker, type ReverseGeoData } from './LocationPicker';
import { WhatsAppInput } from './WhatsAppButton';
import { ReferredBySelector, ReferredByInfo, DEFAULT_PROMOTOR_NAME } from './ReferredBySelector';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  curp: string | null;
  rfc: string | null;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  current_medications: string | null;
  referred_by: string | null;
  referido_promotor_id?: string | null;
  occupation: string | null;
  notes: string | null;
  is_active: boolean;
  branch_id: string | null;
  latitude?: number | null;
  longitude?: number | null;
  whatsapp?: string | null;
}

interface PatientFormProps {
  patient?: Patient;
  onSuccess: () => void;
  onCancel: () => void;
  /** Called with patient ID after successful save to open clinical exam */
  onSuccessWithPatientId?: (patientId: string) => void;
  /** Show the "Save and open clinical" button - only for users with clinical access */
  showOpenClinicalButton?: boolean;
}

// RFC regex: Persona física (13 chars) o moral (12 chars)
const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/i;

// Validar formato RFC mexicano
function validateRFC(rfc: string): boolean {
  if (!rfc || !rfc.trim()) return true; // Optional
  return RFC_REGEX.test(rfc.trim());
}

// Validar formato WhatsApp México
function validateWhatsAppMX(phone: string): { valid: boolean; error?: string } {
  if (!phone || !phone.trim()) return { valid: true }; // Optional
  
  const cleaned = phone.replace(/\D/g, '');
  
  // Debe tener 10 dígitos (nacional) o 12 (con 52)
  if (cleaned.length === 10) {
    return { valid: true };
  }
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    return { valid: true };
  }
  if (cleaned.length === 13 && cleaned.startsWith('521')) {
    // Old format with 1 after country code
    return { valid: true };
  }
  
  return { 
    valid: false, 
    error: 'Número inválido. Ingresa 10 dígitos (ej: 9511234567)' 
  };
}

// Validar coordenadas GPS
function validateGPS(lat: number | null, lng: number | null): { valid: boolean; error?: string } {
  if (lat === null && lng === null) return { valid: true }; // Optional
  if (lat === null || lng === null) {
    return { valid: false, error: 'Coordenadas incompletas' };
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitud debe estar entre -90 y 90' };
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitud debe estar entre -180 y 180' };
  }
  return { valid: true };
}

const patientSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
});

export function PatientForm({ 
  patient, 
  onSuccess, 
  onCancel, 
  onSuccessWithPatientId,
  showOpenClinicalButton = false,
}: PatientFormProps) {
  const isEdit = !!patient;
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  // Track which button was clicked
  const [saveMode, setSaveMode] = useState<'default' | 'openClinical'>('default');
  
  const [loading, setLoading] = useState(false);
  // Estado para el selector de referido
  const [referredByInfo, setReferredByInfo] = useState<ReferredByInfo>({
    promotorId: patient?.referido_promotor_id ?? null,
    promotorNombre: patient?.referred_by || DEFAULT_PROMOTOR_NAME,
  });

  const [formData, setFormData] = useState({
    first_name: patient?.first_name || '',
    last_name: patient?.last_name || '',
    birth_date: patient?.birth_date || '',
    gender: patient?.gender || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    mobile: patient?.mobile || '',
    address: patient?.address || '',
    city: patient?.city || '',
    state: patient?.state || '',
    zip_code: patient?.zip_code || '',
    rfc: patient?.rfc || '',
    blood_type: patient?.blood_type || '',
    allergies: patient?.allergies || '',
    medical_conditions: patient?.medical_conditions || '',
    current_medications: patient?.current_medications || '',
    occupation: patient?.occupation || '',
    antecedentes_personales: (patient as any)?.antecedentes_personales || '',
    antecedentes_familiares: (patient as any)?.antecedentes_familiares || '',
    notes: patient?.notes || '',
    is_active: patient?.is_active ?? true,
    latitude: patient?.latitude ?? null,
    longitude: patient?.longitude ?? null,
    whatsapp: patient?.whatsapp || '',
    between_streets_1: (patient as any)?.between_streets_1 || '',
    between_streets_2: (patient as any)?.between_streets_2 || '',
    address_reference_notes: (patient as any)?.address_reference_notes || '',
    street: (patient as any)?.street || '',
    street_number: (patient as any)?.street_number || '',
    neighborhood: (patient as any)?.neighborhood || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);
  const [addressManuallyEdited, setAddressManuallyEdited] = useState(false);

  // Draft persistence - only for new patients (not edit mode)
  const {
    saveDraft,
    clearDraft,
    discardDraft,
    getRestoredData,
    isRestored,
    RestoreModal,
  } = useDraftPersistence<typeof formData>({
    formName: isEdit ? `patient-edit-${patient?.id}` : 'patient-new',
    formType: 'PATIENT',
    entityId: isEdit ? patient?.id : null,
    enabled: !isEdit, // Only enable drafts for new patients
  });

  // Restore draft data if available
  useEffect(() => {
    if (isRestored) {
      const restoredData = getRestoredData();
      if (restoredData) {
        setFormData(restoredData);
      }
    }
  }, [isRestored, getRestoredData]);

  // Auto-save draft on form changes
  useEffect(() => {
    if (!isEdit && formData.first_name) {
      saveDraft(formData);
    }
  }, [formData, isEdit, saveDraft]);

  const validateForm = () => {
    try {
      patientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  // Normalizar fecha a formato ISO yyyy-MM-dd
  const normalizeBirthDate = (value: string | null): string | null => {
    if (!value || !value.trim()) return null;
    
    const trimmed = value.trim();
    
    // Si ya está en formato ISO yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return trimmed;
    }
    
    // Formato dd/MMM/yyyy (ej: 01/sep/2020)
    const mesesEs: Record<string, string> = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
    };
    
    const match = trimmed.match(/^(\d{1,2})\/([a-z]{3})\/(\d{4})$/i);
    if (match) {
      const [, day, month, year] = match;
      const monthNum = mesesEs[month.toLowerCase()];
      if (monthNum) {
        return `${year}-${monthNum}-${day.padStart(2, '0')}`;
      }
    }
    
    // Formato dd/MM/yyyy
    const numericMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (numericMatch) {
      const [, day, month, year] = numericMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return null;
  };

  // Normalizar teléfono a formato +52XXXXXXXXXX
  const normalizePhone = (value: string | null): string | null => {
    if (!value || !value.trim()) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+52${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('52')) {
      return `+${digits}`;
    }
    return digits || null;
  };

  // Validar fecha no futura
  const isDateInFuture = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  // Extraer mensaje de error detallado de Supabase
  const extractSupabaseError = (error: unknown): { message: string; code?: string; details?: string } => {
    if (error && typeof error === 'object') {
      const err = error as { message?: string; code?: string; details?: string; hint?: string; status?: number };
      
      // Error de RLS o permisos
      if (err.code === '42501' || err.message?.includes('policy')) {
        return {
          message: 'Sin permisos para realizar esta acción. Verifique que esté autenticado.',
          code: '403',
          details: err.hint || err.details,
        };
      }
      
      // Error de duplicado
      if (err.code === '23505') {
        return {
          message: 'Ya existe un paciente con estos datos.',
          code: '409',
          details: err.details,
        };
      }
      
      // Error de validación de tipo
      if (err.code === '22P02' || err.code === '22007') {
        return {
          message: 'Formato de datos inválido. Revise la fecha de nacimiento y otros campos.',
          code: '400',
          details: err.message,
        };
      }
      
      // Error de referencia (FK)
      if (err.code === '23503') {
        return {
          message: 'Referencia inválida. El promotor seleccionado no existe.',
          code: '400',
          details: err.details,
        };
      }
      
      return {
        message: err.message || 'Error desconocido',
        code: err.status?.toString() || err.code,
        details: err.details || err.hint,
      };
    }
    
    if (error instanceof Error) {
      return { message: error.message };
    }
    
    return { message: 'Error desconocido al guardar el paciente' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Validar fecha de nacimiento
    const normalizedBirthDate = normalizeBirthDate(formData.birth_date);
    if (formData.birth_date && !normalizedBirthDate) {
      setErrors(prev => ({
        ...prev,
        birth_date: 'Formato de fecha inválido. Use dd/MMM/yyyy (ej: 01/sep/2020)',
      }));
      toast({
        title: 'Fecha inválida',
        description: 'El formato de fecha de nacimiento es inválido. Ejemplo: 01/sep/2020',
        variant: 'destructive',
      });
      return;
    }

    if (isDateInFuture(normalizedBirthDate)) {
      setErrors(prev => ({
        ...prev,
        birth_date: 'La fecha de nacimiento no puede ser futura',
      }));
      toast({
        title: 'Fecha inválida',
        description: 'La fecha de nacimiento no puede ser en el futuro.',
        variant: 'destructive',
      });
      return;
    }

    // Validar RFC (si se proporciona)
    const rfcValue = formData.rfc?.trim();
    if (rfcValue && !validateRFC(rfcValue)) {
      setErrors(prev => ({
        ...prev,
        rfc: 'RFC inválido. Formato: XXXX000000XXX (persona física) o XXX000000XXX (moral)',
      }));
      toast({
        title: 'RFC inválido',
        description: 'El formato del RFC no es correcto.',
        variant: 'destructive',
      });
      return;
    }

    // Validar WhatsApp (si se proporciona)
    const whatsappValidation = validateWhatsAppMX(formData.whatsapp);
    if (!whatsappValidation.valid) {
      setErrors(prev => ({
        ...prev,
        whatsapp: whatsappValidation.error || 'Número de WhatsApp inválido',
      }));
      toast({
        title: 'WhatsApp inválido',
        description: whatsappValidation.error || 'El número de WhatsApp no tiene el formato correcto.',
        variant: 'destructive',
      });
      return;
    }

    // Validar GPS (si se proporciona)
    const gpsValidation = validateGPS(formData.latitude, formData.longitude);
    if (!gpsValidation.valid) {
      setErrors(prev => ({
        ...prev,
        location: gpsValidation.error || 'Coordenadas inválidas',
      }));
      toast({
        title: 'Ubicación inválida',
        description: gpsValidation.error || 'Las coordenadas GPS no son válidas.',
        variant: 'destructive',
      });
      return;
    }

    // Validar usuario autenticado
    if (!user?.id) {
      toast({
        title: 'Sin permisos (401)',
        description: 'Debe iniciar sesión para registrar pacientes.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      // Normalizar WhatsApp
      const normalizedWhatsapp = normalizePhone(formData.whatsapp);
      
      // Asegurar referido por defecto
      const finalReferredBy = referredByInfo.promotorNombre || DEFAULT_PROMOTOR_NAME;

      // Limpiar RFC: no enviar placeholder como valor real
      const cleanRfc = rfcValue && validateRFC(rfcValue) ? rfcValue.toUpperCase() : null;

      const patientData = {
        first_name: toTitleCaseName(formData.first_name),
        last_name: toTitleCaseName(formData.last_name),
        birth_date: normalizedBirthDate,
        gender: formData.gender || null,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        mobile: formData.mobile?.trim() || null,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        zip_code: formData.zip_code?.trim() || null,
        rfc: cleanRfc,
        blood_type: formData.blood_type || null,
        allergies: formData.allergies?.trim() || null,
        medical_conditions: formData.medical_conditions?.trim() || null,
        current_medications: formData.current_medications?.trim() || null,
        referred_by: finalReferredBy,
        referido_promotor_id: referredByInfo.promotorId,
        occupation: formData.occupation?.trim() || null,
        antecedentes_personales: formData.antecedentes_personales?.trim() || null,
        antecedentes_familiares: formData.antecedentes_familiares?.trim() || null,
        notes: formData.notes?.trim() || null,
        is_active: formData.is_active,
        latitude: formData.latitude,
        longitude: formData.longitude,
        whatsapp: normalizedWhatsapp,
        between_streets_1: formData.between_streets_1?.trim() || null,
        between_streets_2: formData.between_streets_2?.trim() || null,
        address_reference_notes: formData.address_reference_notes?.trim() || null,
        street: formData.street?.trim() || null,
        street_number: formData.street_number?.trim() || null,
        neighborhood: formData.neighborhood?.trim() || null,
      };

      let savedPatientId: string | null = null;

      if (isEdit) {
        const { error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', patient.id);

        if (error) throw error;

        savedPatientId = patient.id;
        toast({
          title: 'Paciente actualizado',
          description: 'Los datos del paciente han sido actualizados',
        });
      } else {
        const { data, error } = await supabase
          .from('patients')
          .insert({
            ...patientData,
            created_by: user.id,
            branch_id: profile?.defaultBranchId || null,
          })
          .select('id')
          .single();

        if (error) throw error;

        savedPatientId = data?.id || null;
        toast({
          title: 'Paciente registrado',
          description: 'El nuevo paciente ha sido registrado correctamente',
        });
      }

      // Clear draft on successful save
      clearDraft();
      
      // Handle different save modes
      if (saveMode === 'openClinical' && savedPatientId && onSuccessWithPatientId) {
        onSuccessWithPatientId(savedPatientId);
      } else {
        onSuccess();
      }
      
      // Reset save mode
      setSaveMode('default');
    } catch (error: unknown) {
      const errorInfo = extractSupabaseError(error);
      
      console.error('Error al guardar paciente:', {
        code: errorInfo.code,
        message: errorInfo.message,
        details: errorInfo.details,
        originalError: error,
      });
      
      toast({
        title: errorInfo.code ? `Error (${errorInfo.code})` : 'Error',
        description: errorInfo.details 
          ? `${errorInfo.message}\n${errorInfo.details}`
          : errorInfo.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (lat: number | null, lng: number | null) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleAddressData = (data: ReverseGeoData) => {
    setFormData(prev => {
      const updates: Record<string, string> = {};

      // Save separate fields always
      if (data.street) updates.street = data.street;
      if (data.houseNumber) updates.street_number = data.houseNumber;
      if (data.neighbourhood) updates.neighborhood = data.neighbourhood;

      // Build formatted address for the address textarea (only if not manually edited)
      if (!addressManuallyEdited) {
        if (data.formattedAddress) {
          updates.address = data.formattedAddress;
        } else if (data.street) {
          updates.address = data.houseNumber
            ? `${data.street} #${data.houseNumber}`
            : data.street;
        }
      }

      // Always update city, state, zip from GPS
      if (data.city) updates.city = data.city;
      if (data.state) updates.state = data.state;
      if (data.zipCode) updates.zip_code = data.zipCode;

      // Always update cross streets from GPS
      if (data.crossStreet1) updates.between_streets_1 = data.crossStreet1;
      if (data.crossStreet2) updates.between_streets_2 = data.crossStreet2;

      return { ...prev, ...updates };
    });
    setAddressAutoFilled(true);
  };

  const handleAddressManualChange = (value: string) => {
    handleChange('address', value);
    if (addressAutoFilled) {
      setAddressManuallyEdited(true);
    }
  };

  return (
    <>
      <RestoreModal />
      <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">Contacto</span>
          </TabsTrigger>
          <TabsTrigger value="address" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Dirección</span>
          </TabsTrigger>
          <TabsTrigger value="medical" className="gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Médico</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Data */}
        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre(s) *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                onBlur={() => handleChange('first_name', toTitleCaseName(formData.first_name))}
                placeholder="Juan Carlos"
                required
              />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Apellidos *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                onBlur={() => handleChange('last_name', toTitleCaseName(formData.last_name))}
                placeholder="García López"
                required
              />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name}</p>
              )}
            </div>
          </div>

          {/* Birth Date + Age in same row */}
          <BirthDatePicker
            value={formData.birth_date}
            onChange={(value) => handleChange('birth_date', value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gender">Género</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MUJER">Mujer</SelectItem>
                  <SelectItem value="HOMBRE">Hombre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfc">RFC (Opcional)</Label>
              <Input
                id="rfc"
                value={formData.rfc}
                onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
                placeholder="Ej: GARC850101ABC"
                maxLength={13}
                className={errors.rfc ? 'border-destructive' : ''}
              />
              {errors.rfc && (
                <p className="text-xs text-destructive">{errors.rfc}</p>
              )}
              <p className="text-xs text-muted-foreground">
                13 caracteres persona física, 12 persona moral
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Ocupación</Label>
              <Input
                id="occupation"
                value={formData.occupation}
                onChange={(e) => handleChange('occupation', e.target.value)}
                placeholder="Profesión u oficio"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <ReferredBySelector
                value={referredByInfo}
                onChange={setReferredByInfo}
              />
            </div>
          </div>

          {/* Anamnesis */}
          <div className="rounded-lg border-l-4 border-primary/60 bg-primary/5 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Anamnesis del Paciente
            </h3>

            <div className="space-y-2">
              <Label htmlFor="antecedentes_personales">Antecedentes personales</Label>
              <Textarea
                id="antecedentes_personales"
                value={formData.antecedentes_personales}
                onChange={(e) => handleChange('antecedentes_personales', e.target.value)}
                placeholder="Ingrese antecedentes personales: enfermedades, cirugías, alergias, medicación actual, uso previo de lentes, etc."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Enfermedades sistémicas, alergias, cirugías oculares, medicación actual, uso de lentes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="antecedentes_familiares">Antecedentes familiares</Label>
              <Textarea
                id="antecedentes_familiares"
                value={formData.antecedentes_familiares}
                onChange={(e) => handleChange('antecedentes_familiares', e.target.value)}
                placeholder="Ingrese antecedentes familiares relevantes: diabetes, hipertensión, glaucoma, cataratas, etc."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Historial familiar de enfermedades visuales o sistémicas.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Contact */}
        <TabsContent value="contact" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                WhatsApp (Opcional)
              </Label>
              <WhatsAppInput
                value={formData.whatsapp}
                onChange={(value) => handleChange('whatsapp', value)}
                onValidationChange={(isValid, error) => {
                  if (!isValid && error) {
                    setErrors(prev => ({ ...prev, whatsapp: error }));
                  } else {
                    setErrors(prev => {
                      const { whatsapp, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
              />
              {errors.whatsapp && (
                <p className="text-xs text-destructive">{errors.whatsapp}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Celular</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                placeholder="+52 951 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono fijo</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="951 123 4567"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Address */}
        <TabsContent value="address" className="space-y-4 mt-4">
          {/* 1. Ubicación GPS */}
          <div>
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ubicación GPS
            </h4>
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationChange={handleLocationChange}
              onAddressData={handleAddressData}
              onGeocodingIncomplete={() => {}}
              addressAutoFilled={addressAutoFilled && !addressManuallyEdited}
            />
            {errors.location && (
              <p className="text-xs text-destructive mt-2">{errors.location}</p>
            )}
          </div>

          {/* 2. Dirección */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleAddressManualChange(e.target.value)}
              placeholder="Calle Rodrigo Carrasco #123"
              rows={2}
            />
            {addressAutoFilled && !addressManuallyEdited && (
              <p className="text-xs text-primary flex items-center gap-1">
                📍 Dirección sugerida por GPS, puedes corregirla.
              </p>
            )}
          </div>

          {/* 3. Colonia / Barrio */}
          <div className="space-y-2">
            <Label htmlFor="neighborhood">Colonia / Barrio</Label>
            <Input
              id="neighborhood"
              value={formData.neighborhood}
              onChange={(e) => handleChange('neighborhood', e.target.value)}
              placeholder="Ej: Col. Centro, Barrio La Soledad"
            />
          </div>

          {/* 4. Entre calles */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Entre calles <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                id="between_streets_1"
                value={formData.between_streets_1}
                onChange={(e) => handleChange('between_streets_1', e.target.value)}
                placeholder="Calle 1 (ej: Juárez)"
              />
              <Input
                id="between_streets_2"
                value={formData.between_streets_2}
                onChange={(e) => handleChange('between_streets_2', e.target.value)}
                placeholder="Calle 2 (ej: Morelos)"
              />
            </div>
          </div>

          {/* 5. Referencia adicional */}
          <div className="space-y-2">
            <Label htmlFor="address_reference_notes">Referencia adicional <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              id="address_reference_notes"
              value={formData.address_reference_notes}
              onChange={(e) => handleChange('address_reference_notes', e.target.value)}
              placeholder="Ej: Casa verde, esquina con farmacia, frente a tortillería"
              rows={2}
            />
          </div>

          {/* 6. Ciudad / Estado */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Oaxaca de Juárez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="Oaxaca"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">Código Postal</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => handleChange('zip_code', e.target.value)}
                  placeholder="70000"
                  maxLength={5}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Medical */}
        <TabsContent value="medical" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="blood_type">Tipo de sangre</Label>
              <Select
                value={formData.blood_type}
                onValueChange={(value) => handleChange('blood_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleChange('allergies', e.target.value)}
                placeholder="Alergias conocidas..."
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="medical_conditions">Enfermedades/Padecimientos</Label>
              <Textarea
                id="medical_conditions"
                value={formData.medical_conditions}
                onChange={(e) => handleChange('medical_conditions', e.target.value)}
                placeholder="Diabetes, hipertensión, etc."
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="current_medications">Medicamentos actuales</Label>
              <Textarea
                id="current_medications"
                value={formData.current_medications}
                onChange={(e) => handleChange('current_medications', e.target.value)}
                placeholder="Medicamentos que toma actualmente..."
                rows={2}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notas adicionales</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Observaciones generales..."
                rows={3}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between gap-3 pt-4 border-t border-border">
        <div>
          {!isEdit && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={discardDraft}
              className="text-muted-foreground"
            >
              Descartar borrador
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          
          {/* Secondary button: Save and open clinical exam - only for new patients */}
          {!isEdit && showOpenClinicalButton && onSuccessWithPatientId && (
            <Button 
              type="submit" 
              variant="secondary"
              disabled={loading}
              onClick={() => setSaveMode('openClinical')}
              className="gap-2"
            >
              {loading && saveMode === 'openClinical' ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4" />
                  Guardar y abrir expediente
                </>
              )}
            </Button>
          )}
          
          {/* Primary button: Regular save */}
          <Button 
            type="submit" 
            disabled={loading}
            onClick={() => setSaveMode('default')}
          >
            {loading && saveMode === 'default' ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {isEdit ? 'Guardando...' : 'Registrando...'}
              </span>
            ) : (
              isEdit ? 'Guardar Cambios' : 'Registrar Paciente'
            )}
          </Button>
        </div>
      </div>
    </form>
    </>
  );
}
