import { useState, useEffect, useCallback, useRef } from 'react';
import { useIOSKeyboard } from '@/hooks/useIOSKeyboard';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toTitleCaseName } from '@/lib/text-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  User, 
  MapPin, 
  Phone,
  FileText,
  X, 
  Loader2,
  Stethoscope,
  Navigation,
  ExternalLink,
  MessageCircle,
  Save,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';
import { ReferredBySelector, ReferredByInfo, DEFAULT_PROMOTOR_NAME } from './ReferredBySelector';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { DuplicateAlert } from './DuplicateAlert';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

interface PatientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onSuccessWithExam?: (patientId: string) => void;
}

const RFC_REGEX = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/i;
function validateRFC(rfc: string): boolean {
  if (!rfc || !rfc.trim()) return true;
  return RFC_REGEX.test(rfc.trim());
}

function validateWhatsAppMX(phone: string): { valid: boolean; error?: string } {
  if (!phone || !phone.trim()) return { valid: true };
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) return { valid: true };
  if (cleaned.length === 12 && cleaned.startsWith('52')) return { valid: true };
  if (cleaned.length === 13 && cleaned.startsWith('521')) return { valid: true };
  return { valid: false, error: 'Número inválido. Ingresa 10 dígitos (ej: 9511234567)' };
}

const patientSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
});

const REGIMENES_FISCALES = [
  { value: '601', label: '601 - General de Ley Personas Morales' },
  { value: '603', label: '603 - Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 - Sueldos y Salarios' },
  { value: '606', label: '606 - Arrendamiento' },
  { value: '608', label: '608 - Demás ingresos' },
  { value: '610', label: '610 - Residentes en el Extranjero' },
  { value: '612', label: '612 - Personas Físicas con Actividades Empresariales y Profesionales' },
  { value: '616', label: '616 - Sin obligaciones fiscales' },
  { value: '620', label: '620 - Sociedades Cooperativas de Producción' },
  { value: '621', label: '621 - Incorporación Fiscal' },
  { value: '625', label: '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { value: '626', label: '626 - Régimen Simplificado de Confianza' },
];

// Section definitions for accordion + progress
const SECTIONS = [
  { id: 'personal', label: 'Datos personales', icon: User },
  { id: 'address', label: 'Dirección y ubicación', icon: MapPin },
  { id: 'contact', label: 'Contacto', icon: Phone },
  { id: 'extra', label: 'Datos adicionales', icon: FileText },
] as const;

// Quick-capture field order (IDs for focus flow)
const CAPTURE_FIELD_ORDER = [
  'first_name',
  'last_name',
  'birth_date_input',
  'gender',
  'occupation',
  'address',
  'city',
  'state',
  'whatsapp',
  'email',
  'rfc',
];

// Map field → section
const FIELD_TO_SECTION: Record<string, string> = {
  first_name: 'personal',
  last_name: 'personal',
  birth_date_input: 'personal',
  gender: 'personal',
  occupation: 'personal',
  address: 'address',
  city: 'address',
  state: 'address',
  whatsapp: 'contact',
  email: 'contact',
  rfc: 'extra',
};

export function PatientFormSheet({ 
  open, 
  onOpenChange,
  onSuccess, 
  onSuccessWithExam,
}: PatientFormSheetProps) {
  const { toast } = useToast();
  const { user, profile, hasAnyRole } = useAuth();
  const canCreateExam = hasAnyRole(['admin', 'doctor', 'asistente']);
  const isMobile = useIsMobile();
  const formRef = useRef<HTMLFormElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  useIOSKeyboard(scrollContainerRef);
  
  const [loading, setLoading] = useState(false);
  const [duplicateOverridden, setDuplicateOverridden] = useState(false);
  const { matches: duplicateMatches, checkDuplicates, logIgnored, clearMatches } = useDuplicateDetection();
  const [quickCapture, setQuickCapture] = useState(true);
  const [openSections, setOpenSections] = useState<string[]>(['personal']);

  const [referredByInfo, setReferredByInfo] = useState<ReferredByInfo>({
    promotorId: null,
    promotorNombre: DEFAULT_PROMOTOR_NAME,
  });

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    gender: '',
    occupation: '',
    antecedentes_personales: '',
    antecedentes_familiares: '',
    address: '',
    city: '',
    state: '',
    latitude: null as number | null,
    longitude: null as number | null,
    whatsapp: '',
    email: '',
    rfc: '',
    regimen_fiscal: '',
    is_active: true,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const isFormDirty = !!(formData.first_name || formData.last_name || formData.birth_date || formData.whatsapp || formData.email || formData.address || formData.rfc);

  const doClose = () => {
    discardDraft();
    onOpenChange(false);
  };

  const { confirmClose, UnsavedDialog } = useUnsavedChanges({
    isDirty: isFormDirty,
    onSaveDraft: () => saveManualDraft(formData),
    enabled: open,
  });

  const handleBack = () => {
    confirmClose(doClose);
  };

  const {
    saveDraft,
    clearDraft,
    discardDraft,
    saveManualDraft,
    getRestoredData,
    isRestored,
    RestoreModal,
  } = useDraftPersistence<typeof formData>({
    formName: 'patient-new-sheet',
    formType: 'PATIENT',
    entityId: null,
    enabled: true,
  });

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  useEffect(() => {
    if (isRestored && open) {
      const restoredData = getRestoredData();
      if (restoredData) setFormData(restoredData);
    }
  }, [isRestored, open, getRestoredData]);

  useEffect(() => {
    if (formData.first_name && open) saveDraft(formData);
  }, [formData, open, saveDraft]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setFormData({
          first_name: '', last_name: '', birth_date: '', gender: '',
          occupation: '', antecedentes_personales: '', antecedentes_familiares: '',
          address: '', city: '', state: '',
          latitude: null, longitude: null, whatsapp: '', email: '',
          rfc: '', regimen_fiscal: '', is_active: true,
        });
        setReferredByInfo({ promotorId: null, promotorNombre: DEFAULT_PROMOTOR_NAME });
        setErrors({});
        setDuplicateOverridden(false);
        clearMatches();
        setOpenSections(['personal']);
      }, 300);
    }
  }, [open, clearMatches]);

  // Duplicate detection
  useEffect(() => {
    if (!open || duplicateOverridden) return;
    if (formData.first_name.length >= 2 && formData.last_name.length >= 2) {
      checkDuplicates({
        firstName: formData.first_name,
        lastName: formData.last_name,
        whatsapp: formData.whatsapp,
        birthDate: formData.birth_date || undefined,
      });
    }
  }, [open, formData.first_name, formData.last_name, formData.whatsapp, formData.birth_date, checkDuplicates, duplicateOverridden]);

  const handleChange = (field: string, value: string | boolean | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const { [field]: _, ...rest } = prev; return rest; });
    }
  };

  const calculateAge = (): string => {
    if (!formData.birth_date) return '—';
    const date = new Date(formData.birth_date + 'T00:00:00');
    if (isNaN(date.getTime())) return '—';
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) age--;
    if (age < 0) return '—';
    return `${age} años`;
  };

  const [addressFromGPS, setAddressFromGPS] = useState(false);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'es' } }
      );
      if (!response.ok) return;
      const data = await response.json();
      const addr = data.address;
      if (addr) {
        const city = addr.city || addr.town || addr.village || addr.municipality || '';
        const state = addr.state || '';
        const street = addr.road || addr.street || '';
        const number = addr.house_number || '';
        const colony = addr.neighbourhood || addr.suburb || addr.quarter || addr.hamlet || '';
        const addressParts: string[] = [];
        if (street) addressParts.push(number ? `${street} ${number}` : street);
        if (colony) addressParts.push(colony);
        const builtAddress = addressParts.join(', ');
        setFormData(prev => ({
          ...prev,
          city: prev.city || city,
          state: prev.state || state,
          address: builtAddress || prev.address,
        }));
        if (builtAddress) setAddressFromGPS(true);
        if (!builtAddress) {
          toast({ title: 'Dirección incompleta', description: 'No se pudo obtener la dirección completa. Captúrala manualmente.', variant: 'default' });
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e);
      toast({ title: 'Dirección no disponible', description: 'No se pudo obtener la dirección. Captúrala manualmente.', variant: 'default' });
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Tu navegador no soporta geolocalización', variant: 'destructive' });
      return;
    }
    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setIsLoadingLocation(false);
        toast({ title: 'Ubicación obtenida', description: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
        reverseGeocode(lat, lng);
      },
      (geoError) => {
        setIsLoadingLocation(false);
        let message = 'No se pudo obtener la ubicación';
        if (geoError.code === geoError.PERMISSION_DENIED) message = 'Permiso de ubicación denegado.';
        else if (geoError.code === geoError.TIMEOUT) message = 'Tiempo agotado. Intenta de nuevo.';
        toast({ title: 'Error de ubicación', description: message, variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/[^\d+\s-]/g, '');
    handleChange('whatsapp', input);
  };

  const handleWhatsAppBlur = () => {
    if (!formData.whatsapp || !formData.whatsapp.trim()) {
      setErrors(prev => { const { whatsapp, ...rest } = prev; return rest; });
      return;
    }
    const validation = validateWhatsAppMX(formData.whatsapp);
    if (!validation.valid) {
      setErrors(prev => ({ ...prev, whatsapp: validation.error || 'Número inválido' }));
    } else {
      setErrors(prev => { const { whatsapp, ...rest } = prev; return rest; });
      const cleaned = formData.whatsapp.replace(/\D/g, '');
      let digits = cleaned;
      if (cleaned.startsWith('52')) digits = cleaned.slice(2);
      else if (cleaned.startsWith('521') && cleaned.length === 13) digits = cleaned.slice(3);
      if (digits.length === 10) {
        handleChange('whatsapp', `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`);
      }
    }
  };

  const normalizeBirthDate = (value: string | null): string | null => {
    if (!value || !value.trim()) return null;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return trimmed;
    }
    const mesesEs: Record<string, string> = {
      'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'ago': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
    };
    const match = trimmed.match(/^(\d{1,2})\/([a-z]{3})\/(\d{4})$/i);
    if (match) {
      const [, day, month, year] = match;
      const monthNum = mesesEs[month.toLowerCase()];
      if (monthNum) return `${year}-${monthNum}-${day.padStart(2, '0')}`;
    }
    const numericMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (numericMatch) {
      const [, day, month, year] = numericMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return null;
  };

  const normalizePhone = (value: string | null): string | null => {
    if (!value || !value.trim()) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 10) return `+52${digits}`;
    if (digits.length === 12 && digits.startsWith('52')) return `+${digits}`;
    return digits || null;
  };

  const isDateInFuture = (dateStr: string | null): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  const extractSupabaseError = (error: unknown): { message: string; code?: string } => {
    if (error && typeof error === 'object') {
      const err = error as { message?: string; code?: string; details?: string; hint?: string };
      if (err.code === '42501' || err.message?.includes('policy')) return { message: 'Sin permisos para realizar esta acción.', code: '403' };
      if (err.code === '23505') return { message: 'Ya existe un paciente con estos datos.', code: '409' };
      if (err.code === '22P02' || err.code === '22007') return { message: 'Formato de datos inválido.', code: '400' };
      if (err.code === '23503') return { message: 'Referencia inválida.', code: '400' };
      return { message: err.message || 'Error desconocido', code: err.code };
    }
    if (error instanceof Error) return { message: error.message };
    return { message: 'Error desconocido al guardar el paciente' };
  };

  const validateForm = () => {
    try {
      patientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const [saveMode, setSaveMode] = useState<'save' | 'exam'>('exam');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const normalizedBirthDate = normalizeBirthDate(formData.birth_date);
    if (formData.birth_date && !normalizedBirthDate) {
      setErrors(prev => ({ ...prev, birth_date: 'Formato de fecha inválido' }));
      return;
    }
    if (isDateInFuture(normalizedBirthDate)) {
      setErrors(prev => ({ ...prev, birth_date: 'La fecha no puede ser futura' }));
      return;
    }

    const rfcValue = formData.rfc?.trim();
    if (rfcValue && !validateRFC(rfcValue)) {
      setErrors(prev => ({ ...prev, rfc: 'RFC inválido' }));
      return;
    }

    const whatsappValidation = validateWhatsAppMX(formData.whatsapp);
    if (!whatsappValidation.valid) {
      setErrors(prev => ({ ...prev, whatsapp: whatsappValidation.error || 'Número inválido' }));
      return;
    }

    if (!user?.id) {
      toast({ title: 'Sin permisos', description: 'Debe iniciar sesión.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const normalizedWhatsapp = normalizePhone(formData.whatsapp);
      const patientData = {
        first_name: toTitleCaseName(formData.first_name),
        last_name: toTitleCaseName(formData.last_name),
        birth_date: normalizedBirthDate,
        gender: formData.gender || null,
        email: formData.email?.trim() || null,
        phone: null,
        mobile: normalizedWhatsapp,
        address: formData.address?.trim() || null,
        city: formData.city?.trim() || null,
        state: formData.state?.trim() || null,
        zip_code: null,
        rfc: rfcValue && validateRFC(rfcValue) ? rfcValue.toUpperCase() : null,
        referred_by: referredByInfo.promotorNombre || DEFAULT_PROMOTOR_NAME,
        referido_promotor_id: referredByInfo.promotorId,
        occupation: formData.occupation?.trim() || null,
        antecedentes_personales: formData.antecedentes_personales?.trim() || null,
        antecedentes_familiares: formData.antecedentes_familiares?.trim() || null,
        notes: null,
        is_active: formData.is_active,
        latitude: formData.latitude,
        longitude: formData.longitude,
        whatsapp: normalizedWhatsapp,
        created_by: user.id,
        branch_id: profile?.defaultBranchId || null,
      };

      const { data, error } = await supabase
        .from('patients')
        .insert(patientData)
        .select('id')
        .single();

      if (error) throw error;

      clearDraft();
      
      toast({
        title: 'Paciente registrado',
        description: `${formData.first_name} ${formData.last_name} ha sido registrado correctamente.`,
      });

      if (saveMode === 'exam' && data?.id && onSuccessWithExam && canCreateExam) {
        onOpenChange(false);
        onSuccessWithExam(data.id);
      } else {
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: unknown) {
      const errorInfo = extractSupabaseError(error);
      console.error('Error al guardar paciente:', error);
      toast({
        title: errorInfo.code ? `Error (${errorInfo.code})` : 'Error',
        description: errorInfo.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick-capture: advance to next field + auto-scroll + auto-open section
  const advanceToNextField = useCallback((currentFieldId: string) => {
    if (!quickCapture) return;
    const idx = CAPTURE_FIELD_ORDER.indexOf(currentFieldId);
    if (idx < 0 || idx >= CAPTURE_FIELD_ORDER.length - 1) return;

    const nextFieldId = CAPTURE_FIELD_ORDER[idx + 1];
    const nextSection = FIELD_TO_SECTION[nextFieldId];

    // Auto-open target section if needed
    if (nextSection && !openSections.includes(nextSection)) {
      setOpenSections(prev => [...prev, nextSection]);
    }

    // Small delay to let accordion animate
    setTimeout(() => {
      const nextEl = document.getElementById(nextFieldId);
      if (nextEl) {
        nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => nextEl.focus(), 150);
      }
    }, 100);
  }, [quickCapture, openSections]);

  // Keyboard: Ctrl+Enter to save, Enter to advance fields
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!open) return;
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      setSaveMode('exam');
      formRef.current?.requestSubmit();
      return;
    }

    // Shift+Enter = previous field
    if (e.key === 'Enter' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        e.preventDefault();
        const fieldId = target.id;
        if (quickCapture && fieldId) {
          const idx = CAPTURE_FIELD_ORDER.indexOf(fieldId);
          if (idx > 0) {
            const prevFieldId = CAPTURE_FIELD_ORDER[idx - 1];
            const prevSection = FIELD_TO_SECTION[prevFieldId];
            if (prevSection && !openSections.includes(prevSection)) {
              setOpenSections(prev => [...prev, prevSection]);
            }
            setTimeout(() => {
              const prevEl = document.getElementById(prevFieldId);
              if (prevEl) {
                prevEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => prevEl.focus(), 150);
              }
            }, 100);
          }
        } else {
          const form = formRef.current;
          if (!form) return;
          const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([disabled])'));
          const idx = inputs.indexOf(target as HTMLInputElement);
          if (idx > 0) inputs[idx - 1].focus();
        }
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        e.preventDefault();
        const fieldId = target.id;
        if (quickCapture && fieldId) {
          advanceToNextField(fieldId);
        } else {
          const form = formRef.current;
          if (!form) return;
          const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([disabled])'));
          const idx = inputs.indexOf(target as HTMLInputElement);
          if (idx >= 0 && idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          }
        }
      }
    }
  }, [open, quickCapture, advanceToNextField]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const hasValidLocation = formData.latitude !== null && formData.longitude !== null;
  const googleMapsUrl = hasValidLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${formData.latitude},${formData.longitude}`
    : null;

  // Progress calculation
  const completedSections = (() => {
    let count = 0;
    if (formData.first_name && formData.last_name) count++;
    if (formData.address || hasValidLocation) count++;
    if (formData.whatsapp || formData.email) count++;
    if (referredByInfo.promotorNombre && referredByInfo.promotorNombre !== DEFAULT_PROMOTOR_NAME) count++;
    return count;
  })();
  const progressPercent = Math.round((completedSections / SECTIONS.length) * 100);

  // ─── Field renderers ───

  const renderPersonalFields = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="first_name" className="text-[13px] font-semibold text-foreground">Nombres *</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            onBlur={() => {
              handleChange('first_name', toTitleCaseName(formData.first_name));
              if (quickCapture && formData.first_name.length >= 2) advanceToNextField('first_name');
            }}
            placeholder="Juan Carlos"
            required
            autoFocus={open}
            className={`h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60 ${errors.first_name ? 'border-destructive' : ''}`}
          />
          {errors.first_name && <p className="text-[11px] text-destructive">{errors.first_name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="last_name" className="text-[13px] font-semibold text-foreground">Apellidos *</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            onBlur={() => handleChange('last_name', toTitleCaseName(formData.last_name))}
            placeholder="García López"
            required
            className={`h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60 ${errors.last_name ? 'border-destructive' : ''}`}
          />
          {errors.last_name && <p className="text-[11px] text-destructive">{errors.last_name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
        <MaskedDateInput
          value={formData.birth_date}
          onChange={(value) => handleChange('birth_date', value)}
          error={errors.birth_date}
          label="Fecha de nacimiento"
          mode="birthdate"
          showAge={false}
        />
        <div className="space-y-1.5">
          <Label className="text-[13px] font-semibold text-foreground">Edad</Label>
          <div className="h-9 flex items-center px-3 rounded-lg border border-border/80 bg-secondary/50 text-accent text-sm font-semibold min-w-[80px] justify-center">
            {calculateAge()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="gender" className="text-[13px] font-semibold text-foreground">Género</Label>
          <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
            <SelectTrigger id="gender" className="h-9 bg-card border-border/80 hover:border-muted-foreground/40"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="HOMBRE">Hombre</SelectItem>
              <SelectItem value="MUJER">Mujer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="occupation" className="text-[13px] font-semibold text-foreground">Ocupación</Label>
          <Input
            id="occupation"
            value={formData.occupation}
            onChange={(e) => handleChange('occupation', e.target.value)}
            placeholder="Profesión u oficio"
            className="h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Antecedentes personales */}
      <div className="space-y-1.5">
        <Label htmlFor="antecedentes_personales" className="text-[13px] font-semibold text-foreground">Antecedentes personales</Label>
        <Textarea
          id="antecedentes_personales"
          value={formData.antecedentes_personales}
          onChange={(e) => handleChange('antecedentes_personales', e.target.value)}
          placeholder="Enfermedades, cirugías, alergias, medicación actual, uso previo de lentes, etc."
          rows={2}
          className="min-h-[60px]"
        />
      </div>

      {/* Antecedentes familiares */}
      <div className="space-y-1.5">
        <Label htmlFor="antecedentes_familiares" className="text-[13px] font-semibold text-foreground">Antecedentes familiares</Label>
        <Textarea
          id="antecedentes_familiares"
          value={formData.antecedentes_familiares}
          onChange={(e) => handleChange('antecedentes_familiares', e.target.value)}
          placeholder="Diabetes, hipertensión, glaucoma, cataratas, etc."
          rows={2}
          className="min-h-[60px]"
        />
      </div>
    </div>
  );

  const renderAddressFields = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[13px] font-semibold text-foreground">Ubicación GPS</Label>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={isLoadingLocation}
            className="gap-1.5 h-8 text-xs"
          >
            {isLoadingLocation ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Obteniendo...</>
            ) : (
              <><Navigation className="h-3.5 w-3.5" /> Obtener ubicación</>
            )}
          </Button>
          {hasValidLocation && (
            <>
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded border">
                {formData.latitude?.toFixed(4)}, {formData.longitude?.toFixed(4)}
              </span>
              {googleMapsUrl && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="gap-1 p-0 h-auto text-xs text-primary"
                  onClick={() => window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-3 w-3" />
                  Maps
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="address" className="text-[13px] font-semibold text-foreground">Dirección</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => { handleChange('address', e.target.value); setAddressFromGPS(false); }}
          placeholder="Calle, número, colonia"
          className="h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60"
        />
        {addressFromGPS && (
          <p className="text-[11px] text-muted-foreground">📍 Dirección sugerida por GPS, puedes corregirla.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-[13px] font-semibold text-foreground">Ciudad</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Juchitán de Zaragoza"
            className="h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state" className="text-[13px] font-semibold text-foreground">Estado</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="Oaxaca"
            className="h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

    </div>
  );

  const renderContactFields = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="whatsapp" className="text-[13px] font-semibold text-foreground">Celular / WhatsApp</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <MessageCircle className="h-3.5 w-3.5 text-primary" />
          </div>
          <Input
            id="whatsapp"
            type="tel"
            value={formData.whatsapp}
            onChange={handleWhatsAppChange}
            onBlur={handleWhatsAppBlur}
            placeholder="951 123 4567"
            className={`pl-9 h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60 ${errors.whatsapp ? 'border-destructive' : ''}`}
          />
        </div>
        {errors.whatsapp && <p className="text-[11px] text-destructive">{errors.whatsapp}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[13px] font-semibold text-foreground">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="correo@ejemplo.com"
          className={`h-9 bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60 ${errors.email ? 'border-destructive' : ''}`}
        />
        {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
      </div>
    </div>
  );

  const renderExtraFields = () => (
    <div className="space-y-3">
      <ReferredBySelector value={referredByInfo} onChange={setReferredByInfo} />

      <div className="space-y-1.5">
        <Label htmlFor="rfc" className="text-[13px] font-semibold text-foreground">RFC (opcional)</Label>
        <Input
          id="rfc"
          value={formData.rfc}
          onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
          placeholder="GARC850101ABC"
          maxLength={13}
          className={`h-9 max-w-xs bg-card border-border/80 hover:border-muted-foreground/40 text-foreground placeholder:text-muted-foreground/60 ${errors.rfc ? 'border-destructive' : ''}`}
        />
        {errors.rfc && <p className="text-[11px] text-destructive">{errors.rfc}</p>}
      </div>

      {formData.rfc.trim().length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="regimen_fiscal" className="text-[13px] font-semibold text-foreground">Régimen fiscal</Label>
          <Select value={formData.regimen_fiscal} onValueChange={(value) => handleChange('regimen_fiscal', value)}>
            <SelectTrigger className="h-9 max-w-md bg-card border-border/80 hover:border-muted-foreground/40"><SelectValue placeholder="Seleccionar régimen" /></SelectTrigger>
            <SelectContent>
              {REGIMENES_FISCALES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  // Section content map
  const sectionContent: Record<string, JSX.Element> = {
    personal: renderPersonalFields(),
    address: renderAddressFields(),
    contact: renderContactFields(),
    extra: renderExtraFields(),
  };

  // Check if a section has data filled
  const sectionHasData = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'personal': return !!(formData.first_name || formData.last_name);
      case 'address': return !!(formData.address || formData.city || hasValidLocation);
      case 'contact': return !!(formData.whatsapp || formData.email);
      case 'extra': return !!(formData.rfc || (referredByInfo.promotorNombre && referredByInfo.promotorNombre !== DEFAULT_PROMOTOR_NAME));
      default: return false;
    }
  };

  // ─── Mobile layout: accordion ───
  const renderMobileLayout = () => (
    <Accordion
      type="multiple"
      value={openSections}
      onValueChange={setOpenSections}
      className="space-y-2"
    >
      {SECTIONS.map((section) => (
        <AccordionItem key={section.id} value={section.id} className="border rounded-lg bg-card/50">
          <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
            <div className="flex items-center gap-2">
              <section.icon className="h-4 w-4 text-primary" />
              <span>{section.label}</span>
              {sectionHasData(section.id) && (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {sectionContent[section.id]}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );

  // ─── Desktop layout: Column 1 = Personal + Dirección, Column 2 = Contacto + Extra ───
  const desktopColumns: [string[], string[]] = [
    ['personal', 'address'],
    ['contact', 'extra'],
  ];

  const renderDesktopLayout = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {desktopColumns.map((colSections, colIdx) => (
        <div key={colIdx} className="space-y-6">
          {colSections.map((sectionId) => {
            const sectionDef = SECTIONS.find(s => s.id === sectionId)!;
            const globalIdx = SECTIONS.findIndex(s => s.id === sectionId);
            return (
              <div key={sectionId} className="border-l-4 border-primary/70 bg-primary/[0.03] rounded-r-lg p-4 space-y-3">
                <SectionLabel
                  icon={sectionDef.icon}
                  title={sectionDef.label}
                  index={globalIdx + 1}
                  done={sectionHasData(sectionId)}
                />
                {sectionContent[sectionId]}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <RestoreModal />
      <UnsavedDialog />
      <div
        className={`fixed inset-0 z-50 flex items-stretch md:items-center md:justify-center ${!open ? 'hidden' : ''}`}
      >
        {/* Backdrop — NO close on click */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200" />

          {/* Modal container */}
          <div className={
            'relative z-10 flex flex-col bg-background shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300 ' +
            'w-screen h-screen ' +
            'md:w-[90vw] md:max-w-[1100px] md:h-auto md:max-h-[90vh] md:rounded-xl md:border'
          }>
            {/* ─── Header (sticky) ─── */}
            <div className="flex-shrink-0 px-4 md:px-6 py-3 border-b border-border bg-card md:rounded-t-xl flex items-center gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <User className="h-5 w-5 text-primary flex-shrink-0" />
                <h2 className="text-base font-semibold truncate">Registrar Nuevo Paciente</h2>
              </div>

              {/* Progress indicator */}
              <div className="hidden sm:flex items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                  {SECTIONS.map((s) => (
                    <div
                      key={s.id}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        sectionHasData(s.id) ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-accent">{progressPercent}%</span>
              </div>

              {/* Desktop: action buttons in header */}
              <div className="hidden sm:flex items-center gap-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={handleBack}
                  className="text-muted-foreground gap-1.5 h-8"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>

                <Button 
                  type="submit"
                  form="patient-form-sheet"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  className="gap-1.5 h-8"
                  onClick={() => setSaveMode('save')}
                >
                  {loading && saveMode === 'save' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Guardar
                </Button>

                {canCreateExam && (
                  <Button 
                    type="submit"
                    form="patient-form-sheet"
                    disabled={loading}
                    size="sm"
                    className="gap-1.5 h-9 px-4"
                    onClick={() => setSaveMode('exam')}
                  >
                    {loading && saveMode === 'exam' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Stethoscope className="h-3.5 w-3.5" />
                    )}
                    Guardar y abrir examen
                  </Button>
                )}
              </div>

              {/* Mobile: close button */}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleBack}
                className="sm:hidden h-9 w-9 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Quick-capture toggle + keyboard hint */}
            <div className="flex-shrink-0 px-4 md:px-6 py-1.5 bg-muted/30 border-b border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <label htmlFor="quick-capture-toggle" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                  Modo captura rápida
                </label>
                <Switch
                  id="quick-capture-toggle"
                  checked={quickCapture}
                  onCheckedChange={setQuickCapture}
                  className="scale-75"
                />
              </div>
              <div className="hidden md:block">
                <p className="text-[11px] text-muted-foreground">
                  <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd> siguiente · <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Shift+Enter</kbd> anterior · <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Ctrl+Enter</kbd> guardar
                </p>
              </div>
              {/* Mobile progress */}
              <div className="sm:hidden flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {SECTIONS.map((s) => (
                  <div
                    key={s.id}
                    className={`w-1.5 h-1.5 rounded-full ${
                      sectionHasData(s.id) ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Duplicate alert (if any) */}
            {duplicateMatches.length > 0 && !duplicateOverridden && (
              <div className="flex-shrink-0 px-4 md:px-6 py-2 border-b border-border">
                <DuplicateAlert 
                  matches={duplicateMatches} 
                  onSelectPatient={(id) => {
                    onOpenChange(false);
                  }}
                  onContinueCreating={() => {
                    setDuplicateOverridden(true);
                  }}
                  onLogIgnored={(matchedPatientId, score, reasons) => {
                    logIgnored(matchedPatientId, score, reasons);
                    setDuplicateOverridden(true);
                  }} 
                />
              </div>
            )}

            {/* ─── Scrollable body ─── */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-6 py-4">
              <form id="patient-form-sheet" ref={formRef} onSubmit={handleSubmit}>
                {isMobile ? renderMobileLayout() : renderDesktopLayout()}
              </form>
            </div>

            {/* ─── Mobile sticky footer ─── */}
            <div className="sm:hidden flex-shrink-0 border-t border-border bg-card p-3 ios-safe-footer flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={handleBack}
                disabled={loading}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                type="submit"
                form="patient-form-sheet"
                variant="secondary"
                className="flex-1 gap-1.5"
                disabled={loading}
                onClick={() => setSaveMode('save')}
              >
                {loading && saveMode === 'save' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar
              </Button>
              {canCreateExam && (
                <Button 
                  type="submit"
                  form="patient-form-sheet"
                  className="flex-1 gap-1.5"
                  disabled={loading}
                  onClick={() => setSaveMode('exam')}
                >
                  {loading && saveMode === 'exam' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Stethoscope className="h-4 w-4" />
                  )}
                  Guardar + Examen
                </Button>
              )}
            </div>
          </div>
      </div>
    </>
  );
}

// ─── Section label for desktop ───
function SectionLabel({ icon: Icon, title, index, done }: { icon: React.ElementType; title: string; index: number; done: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm ${
        done ? 'bg-primary text-primary-foreground' : 'bg-accent/10 text-accent border border-accent/30'
      }`}>
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : index}
      </div>
      <Icon className="h-4 w-4 text-accent" />
      <h3 className="text-sm font-bold text-accent uppercase tracking-wide">{title}</h3>
      <Separator className="flex-1 ml-1" />
    </div>
  );
}
