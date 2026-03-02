import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { PreviousExamData } from '@/lib/clinical-advanced-diagnosis';
import type { HistoricalExam } from '@/lib/clinical-predictive';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Eye, User, ShoppingCart, Stethoscope, Phone, MessageCircle,
  Glasses, ClipboardList, Activity, FileText, ArrowLeftRight,
  Calendar, Building2, CheckCircle2, AlertTriangle, LayoutDashboard,
  Shield,
} from 'lucide-react';
import { DiagnosisPanel } from '@/components/clinical/DiagnosisPanel';
import { ClinicalPrescriptionTable } from '@/components/clinical/ClinicalPrescriptionTable';
import { ClinicalAlertsPanel } from '@/components/clinical/ClinicalAlertsPanel';
import { PredictiveClinicPanel } from '@/components/clinical/PredictiveClinicPanel';
import { VisualProfilePanel } from '@/components/clinical/VisualProfilePanel';
import { VisualAcuitySelect } from '@/components/clinical/VisualAcuitySelect';
import { ClinicalAIChat } from '@/components/clinical/ClinicalAIChat';
import { MobileClinicalSummary } from '@/components/clinical/MobileClinicalSummary';
import { GraduationChangeIndicator } from '@/components/clinical/GraduationChangeIndicator';
import { VisualScreening, type VisualScreeningData } from '@/components/clinical/VisualScreening';
import { PrescriptionPDFButton } from '@/components/clinical/PrescriptionPDF';
import { parseAddValue } from '@/lib/prescription-validation';

import { computeAdvancedDiagnosis } from '@/lib/clinical-advanced-diagnosis';
import { computePredictiveAnalysis } from '@/lib/clinical-predictive';
import { calculateAge } from '@/hooks/useAddClinicalConfig';
import {
  validatePrescription,
  calculateSignedValue,
  hasValue,
  type EyeData,
  type ValidationErrors,
} from '@/lib/prescription-validation';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  whatsapp: string | null;
  mobile: string | null;
  phone: string | null;
}

interface UnifiedExamFormProps {
  patient: Patient;
  onSuccess: () => void;
  onCancel: () => void;
  onSuccessWithExamData?: (data: { patientId: string; examId: string; prescriptionId: string }) => void;
  showGoToPOS?: boolean;
}

interface EyeFormData {
  sphereValue: string;
  sphereSign: '+' | '-' | '';
  cylinderValue: string;
  cylinderSign: '+' | '-' | '';
  axis: string;
  add: string;
  pupilDistance: string;
  alt: string;
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
  alt: '',
  vaSc: '',
  vaCc: '',
};

const formatD = (v: number | null) => v !== null ? (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '—';

/* ===== Section Title Component ===== */
function SectionTitle({ icon: Icon, children, accent = false }: { icon: React.ElementType; children: React.ReactNode; accent?: boolean }) {
  return (
    <h4 className={cn(
      "text-sm font-bold flex items-center gap-2",
      accent ? "text-accent" : "text-foreground"
    )}>
      <Icon className="h-4 w-4" />
      {children}
    </h4>
  );
}

export function UnifiedExamForm({ 
  patient, 
  onSuccess, 
  onCancel,
  onSuccessWithExamData,
  showGoToPOS = false,
}: UnifiedExamFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [saveMode, setSaveMode] = useState<'default' | 'goToPOS'>('default');
  const patientAge = calculateAge(patient.birth_date ?? null);
  const [activeTab, setActiveTab] = useState('summary');
  const [examType, setExamType] = useState<'completo' | 'tamiz'>('completo');

  // Touch state for validation
  const [touched, setTouched] = useState({ od: false, oi: false });

  // Exam Data
  const [examData, setExamData] = useState({
    consultReason: '',
    avOdSc: '',
    avOdCc: '',
    avOiSc: '',
    avOiCc: '',
    clinicalObservations: '',
    diagnosis: '',
    notes: '',
  });

  // Prescription Data (OD and OI)
  const [odData, setOdData] = useState<EyeFormData>(initialEyeData);
  const [oiData, setOiData] = useState<EyeFormData>(initialEyeData);

  // General prescription data
  const [generalData, setGeneralData] = useState({
    totalPd: '',
    lensType: '',
    recommendations: '',
  });

  // Visual Screening data
  const [screeningData, setScreeningData] = useState<VisualScreeningData>({
    distanceVision: '',
    nearVision: '',
    amblyopiaDetection: '',
    strabismus: '',
    contrastSensitivity: '',
    screeningNotes: '',
    requiresFullEval: false,
    patientApt: false,
  });

  const handleScreeningChange = (field: keyof VisualScreeningData, value: string | boolean) => {
    setScreeningData(prev => ({ ...prev, [field]: value }));
  };

  // Previous exam data for advanced clinical intelligence
  const [previousExam, setPreviousExam] = useState<PreviousExamData | null>(null);
  const [previousPrescription, setPreviousPrescription] = useState<{
    odSphere: number | null; odCylinder: number | null; odAxis: number | null; odAdd: number | null;
    oiSphere: number | null; oiCylinder: number | null; oiAxis: number | null; oiAdd: number | null;
    examDate: string;
  } | null>(null);
  const [examHistory, setExamHistory] = useState<HistoricalExam[]>([]);

  // Fetch previous prescriptions
  useEffect(() => {
    async function fetchExamHistory() {
      const { data } = await supabase
        .from('patient_prescriptions')
        .select('exam_date, od_sphere, od_cylinder, od_axis, od_add, oi_sphere, oi_cylinder, oi_axis, oi_add')
        .eq('patient_id', patient.id)
        .eq('status', 'VIGENTE')
        .order('exam_date', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const latest = data[0];
        setPreviousExam({
          examDate: latest.exam_date,
          odSphere: latest.od_sphere,
          odCylinder: latest.od_cylinder,
          odAxis: latest.od_axis,
          oiSphere: latest.oi_sphere,
          oiCylinder: latest.oi_cylinder,
          oiAxis: latest.oi_axis,
        });
        setPreviousPrescription({
          odSphere: latest.od_sphere,
          odCylinder: latest.od_cylinder,
          odAxis: latest.od_axis,
          odAdd: latest.od_add,
          oiSphere: latest.oi_sphere,
          oiCylinder: latest.oi_cylinder,
          oiAxis: latest.oi_axis,
          oiAdd: latest.oi_add,
          examDate: latest.exam_date,
        });
        setExamHistory(data.map(e => ({
          examDate: e.exam_date,
          odSphere: e.od_sphere,
          odCylinder: e.od_cylinder,
          oiSphere: e.oi_sphere,
          oiCylinder: e.oi_cylinder,
        })));
      }
    }
    fetchExamHistory();
  }, [patient.id]);

  // Validation state
  const [odErrors, setOdErrors] = useState<ValidationErrors>({});
  const [oiErrors, setOiErrors] = useState<ValidationErrors>({});
  const [odAxisFocus, setOdAxisFocus] = useState(false);
  const [oiAxisFocus, setOiAxisFocus] = useState(false);

  const consultReasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      consultReasonRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const getEyeValidationData = (data: EyeFormData): EyeData => ({
    sphereValue: data.sphereValue,
    sphereSign: data.sphereSign,
    cylinderValue: data.cylinderValue,
    cylinderSign: data.cylinderSign,
    axis: data.axis,
    add: data.add,
  });

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

  const hasErrors = useMemo(() => {
    const result = validatePrescription(
      getEyeValidationData(odData),
      getEyeValidationData(oiData)
    );
    return !result.isValid;
  }, [odData, oiData]);

  const updateOdData = (field: keyof EyeFormData, value: string | '+' | '-' | '') => {
    setOdData(prev => ({ ...prev, [field]: value }));
    if (touched.od) setTimeout(() => runValidation(), 0);
  };

  const updateOiData = (field: keyof EyeFormData, value: string | '+' | '-' | '') => {
    setOiData(prev => ({ ...prev, [field]: value }));
    if (touched.oi) setTimeout(() => runValidation(), 0);
  };

  const handleOdBlur = () => {
    setTouched(prev => ({ ...prev, od: true }));
    runValidation();
  };

  const handleOiBlur = () => {
    setTouched(prev => ({ ...prev, oi: true }));
    runValidation();
  };

  const handleExamChange = (field: string, value: string) => {
    setExamData(prev => ({ ...prev, [field]: value }));
  };

  const hasPrescriptionData = useMemo(() => {
    return (
      hasValue(odData.sphereValue) ||
      hasValue(odData.cylinderValue) ||
      hasValue(oiData.sphereValue) ||
      hasValue(oiData.cylinderValue)
    );
  }, [odData, oiData]);

  const handleSubmit = async (e: React.FormEvent, mode: 'default' | 'goToPOS' = 'default') => {
    e.preventDefault();
    
    if (hasPrescriptionData) {
      setTouched({ od: true, oi: true });
      const isValid = runValidation();
      if (!isValid) {
        toast({
          title: 'Errores de validación',
          description: 'Corrige los errores en la pestaña Refracción antes de guardar',
          variant: 'destructive',
        });
        setActiveTab('refraction');
        return;
      }
    }

    setLoading(true);
    setSaveMode(mode);

    try {
      const screeningNotes = [
        screeningData.distanceVision && `Visión lejana: ${screeningData.distanceVision}`,
        screeningData.nearVision && `Visión cercana: ${screeningData.nearVision}`,
        screeningData.amblyopiaDetection && `Ambliopía: ${screeningData.amblyopiaDetection}`,
        screeningData.strabismus && `Estrabismo: ${screeningData.strabismus}`,
        screeningData.contrastSensitivity && `Sensibilidad contraste: ${screeningData.contrastSensitivity}`,
        screeningData.requiresFullEval && '⚠️ Requiere evaluación completa',
        screeningData.patientApt && '✅ Paciente apto',
        screeningData.screeningNotes,
      ].filter(Boolean).join('\n');

      const examPayload = {
        patient_id: patient.id,
        examined_by: user?.id,
        branch_id: profile?.defaultBranchId || null,
        diagnosis: examData.diagnosis || null,
        notes: [
          examType === 'tamiz' ? '📋 TAMIZ VISUAL' : '',
          examData.consultReason, examData.clinicalObservations, screeningNotes, examData.notes
        ].filter(Boolean).join('\n\n') || null,
      };

      const { data: savedExam, error: examError } = await supabase
        .from('visual_exams')
        .insert(examPayload)
        .select('id')
        .single();

      if (examError) throw examError;

      let savedPrescriptionId: string | null = null;

      if (hasPrescriptionData) {
        const prescriptionPayload = {
          patient_id: patient.id,
          examined_by: user?.id,
          branch_id: profile?.defaultBranchId || null,
          exam_date: new Date().toISOString().split('T')[0],
          visual_exam_id: savedExam.id,
          od_sphere: calculateSignedValue(odData.sphereValue, odData.sphereSign),
          od_cylinder: calculateSignedValue(odData.cylinderValue, odData.cylinderSign),
          od_axis: odData.axis ? parseInt(odData.axis) : null,
          od_add: parseAddValue(odData.add),
          od_va_sc: odData.vaSc || examData.avOdSc || null,
          od_va_cc: odData.vaCc || examData.avOdCc || null,
          od_pupil_distance: odData.pupilDistance ? parseFloat(odData.pupilDistance) : null,
          oi_sphere: calculateSignedValue(oiData.sphereValue, oiData.sphereSign),
          oi_cylinder: calculateSignedValue(oiData.cylinderValue, oiData.cylinderSign),
          oi_axis: oiData.axis ? parseInt(oiData.axis) : null,
          oi_add: parseAddValue(oiData.add),
          oi_va_sc: oiData.vaSc || examData.avOiSc || null,
          oi_va_cc: oiData.vaCc || examData.avOiCc || null,
          oi_pupil_distance: oiData.pupilDistance ? parseFloat(oiData.pupilDistance) : null,
          total_pd: generalData.totalPd ? parseFloat(generalData.totalPd) : null,
          lens_type: generalData.lensType || null,
          recommendations: generalData.recommendations || null,
          diagnosis: examData.diagnosis || null,
          status: 'VIGENTE' as const,
        };

        const { data: savedPrescription, error: prescriptionError } = await supabase
          .from('patient_prescriptions')
          .insert(prescriptionPayload)
          .select('id')
          .single();

        if (prescriptionError) {
          await supabase.from('visual_exams').delete().eq('id', savedExam.id);
          throw prescriptionError;
        }

        savedPrescriptionId = savedPrescription.id;

        await supabase
          .from('visual_exams')
          .update({ prescription_id: savedPrescriptionId })
          .eq('id', savedExam.id);
      }

      toast({
        title: 'Examen guardado',
        description: hasPrescriptionData 
          ? 'El examen y la graduación han sido guardados correctamente' 
          : 'El examen visual ha sido guardado correctamente',
      });

      if (mode === 'goToPOS' && savedExam && onSuccessWithExamData) {
        if (!savedPrescriptionId) {
          toast({
            title: 'Sin graduación',
            description: 'No se puede pasar a venta sin graduación.',
            variant: 'destructive',
          });
          return;
        }
        onSuccessWithExamData({
          patientId: patient.id,
          examId: savedExam.id,
          prescriptionId: savedPrescriptionId,
        });
      } else {
        onSuccess();
      }
    } catch (error: unknown) {
      const supaError = error as { code?: string; message?: string; details?: string; hint?: string };
      const errorParts: string[] = [];
      if (supaError.code) errorParts.push(`[${supaError.code}]`);
      if (supaError.message) errorParts.push(supaError.message);
      if (supaError.details) errorParts.push(supaError.details);
      if (supaError.hint) errorParts.push(`Hint: ${supaError.hint}`);
      
      const errorMessage = errorParts.length > 0 
        ? errorParts.join(' — ') 
        : (error instanceof Error ? error.message : 'Error desconocido');

      toast({
        title: 'Error al guardar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setSaveMode('default');
    }
  };

  const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`}`;
  };

  // Current RX values for comparison
  const currentOdSph = odData.sphereValue ? calculateSignedValue(odData.sphereValue, odData.sphereSign) : null;
  const currentOdCyl = odData.cylinderValue ? calculateSignedValue(odData.cylinderValue, odData.cylinderSign) : null;
  const currentOdAxis = odData.axis ? parseInt(odData.axis) : null;
  const currentOdAdd = odData.add ? parseAddValue(odData.add) : null;
  const currentOiSph = oiData.sphereValue ? calculateSignedValue(oiData.sphereValue, oiData.sphereSign) : null;
  const currentOiCyl = oiData.cylinderValue ? calculateSignedValue(oiData.cylinderValue, oiData.cylinderSign) : null;
  const currentOiAxis = oiData.axis ? parseInt(oiData.axis) : null;
  const currentOiAdd = oiData.add ? parseAddValue(oiData.add) : null;

  // Compute intelligence results
  const advancedResult = useMemo(() => computeAdvancedDiagnosis(
    currentOdSph, currentOdCyl, currentOdAxis, currentOdAdd,
    currentOiSph, currentOiCyl, currentOiAxis, currentOiAdd,
    patientAge, previousExam, examData.diagnosis,
  ), [currentOdSph, currentOdCyl, currentOdAxis, currentOdAdd, currentOiSph, currentOiCyl, currentOiAxis, currentOiAdd, patientAge, previousExam, examData.diagnosis]);

  const predictiveResult = useMemo(() => computePredictiveAnalysis(
    currentOdSph, currentOdCyl, currentOdAdd,
    currentOiSph, currentOiCyl, currentOiAdd,
    patientAge, examHistory,
  ), [currentOdSph, currentOdCyl, currentOdAdd, currentOiSph, currentOiCyl, currentOiAdd, patientAge, examHistory]);

  // Diff helper for comparison
  const getDiffClass = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return '';
    const diff = Math.abs(current - previous);
    if (diff >= 1) return 'text-destructive font-bold';
    if (diff >= 0.5) return 'text-warning font-semibold';
    if (diff > 0) return 'text-primary';
    return '';
  };

  const getDiffBadge = (current: number | null, previous: number | null) => {
    if (current === null || previous === null) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return null;
    return (
      <span className={cn(
        'text-[10px] font-mono ml-1',
        diff > 0 ? 'text-destructive' : 'text-primary'
      )}>
        ({diff > 0 ? '+' : ''}{diff.toFixed(2)})
      </span>
    );
  };

  const specialistName = profile?.fullName || 'Dra. Belem Castillejos Valle';

  const prescriptionPDFData = {
    patientName: `${patient.first_name} ${patient.last_name}`,
    patientAge,
    examDate: new Date().toLocaleDateString('es-MX'),
    specialistName,
    odSphere: currentOdSph, odCylinder: currentOdCyl, odAxis: currentOdAxis, odAdd: currentOdAdd,
    odPd: odData.pupilDistance ? parseFloat(odData.pupilDistance) : null,
    oiSphere: currentOiSph, oiCylinder: currentOiCyl, oiAxis: currentOiAxis, oiAdd: currentOiAdd,
    oiPd: oiData.pupilDistance ? parseFloat(oiData.pupilDistance) : null,
    totalPd: generalData.totalPd ? parseFloat(generalData.totalPd) : null,
    lensType: generalData.lensType,
    recommendations: generalData.recommendations,
    diagnosis: examData.diagnosis,
    consultReason: examData.consultReason,
    clinicalObservations: examData.clinicalObservations,
    aiDiagnosis: advancedResult?.clinicalSummary || '',
  };

  // Tabs config based on exam type
  const tabs = examType === 'tamiz'
    ? [
        { value: 'summary', label: 'Resumen', icon: LayoutDashboard },
        { value: 'screening', label: 'Tamiz', icon: Shield },
        { value: 'observations', label: 'Diagnóstico', icon: Stethoscope },
      ]
    : [
        { value: 'summary', label: 'Resumen', icon: LayoutDashboard },
        { value: 'acuity', label: 'Agudeza', icon: Eye },
        { value: 'refraction', label: 'Refracción', icon: Glasses },
        { value: 'screening', label: 'Tamiz', icon: Shield },
        { value: 'observations', label: 'Diagnóstico', icon: Stethoscope },
        { value: 'comparison', label: 'Comparación', icon: ArrowLeftRight },
      ];

  return (
    <form
      onSubmit={(e) => handleSubmit(e, 'default')}
      className="flex flex-col h-full w-full overflow-hidden"
      style={{ maxWidth: '100vw' }}
    >
      {/* ===== SCROLLABLE AREA (header + tabs sticky inside) ===== */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {/* ===== STICKY PATIENT HEADER ===== */}
        <div className="sticky top-0 z-30 bg-background border-b border-border shadow-sm" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'hsl(var(--card) / 0.97)' }}>
          <div className="max-w-5xl mx-auto px-3 md:px-6 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {patient.first_name} {patient.last_name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    {patientAge !== null && <span>{patientAge} años</span>}
                    {patient.gender && <span>• {patient.gender}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date().toLocaleDateString('es-MX')}
                    </span>
                    <span className="flex items-center gap-1 hidden sm:flex">
                      <Stethoscope className="h-3 w-3" />
                      <span className="truncate max-w-[140px]">{specialistName}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {previousPrescription && hasPrescriptionData && (
                  <GraduationChangeIndicator
                    currentOdSph={currentOdSph} currentOdCyl={currentOdCyl}
                    currentOdAxis={currentOdAxis} currentOdAdd={currentOdAdd}
                    currentOiSph={currentOiSph} currentOiCyl={currentOiCyl}
                    currentOiAxis={currentOiAxis} currentOiAdd={currentOiAdd}
                    previousOdSph={previousPrescription.odSphere} previousOdCyl={previousPrescription.odCylinder}
                    previousOdAxis={previousPrescription.odAxis} previousOdAdd={previousPrescription.odAdd}
                    previousOiSph={previousPrescription.oiSphere} previousOiCyl={previousPrescription.oiCylinder}
                    previousOiAxis={previousPrescription.oiAxis} previousOiAdd={previousPrescription.oiAdd}
                    compact
                  />
                )}
                <Badge variant="outline" className={cn(
                  "text-[10px]",
                  examType === 'tamiz'
                    ? "bg-ai/10 text-ai border-ai/30"
                    : "bg-warning/10 text-warning border-warning/30"
                )}>
                  {examType === 'tamiz' ? 'Tamiz Visual' : 'Borrador'}
                </Badge>
                {patient.whatsapp && (
                  <a
                    href={getWhatsAppLink(patient.whatsapp) || ''}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
                {(patient.mobile || patient.phone) && (
                  <a
                    href={`tel:${patient.mobile || patient.phone}`}
                    className="p-1.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== TABS SECTION ===== */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0">
          {/* ===== STICKY TABS BAR ===== */}
          <div className="sticky top-[52px] z-20 border-b border-border/80 shadow-[0_1px_3px_0_hsl(var(--foreground)/0.06)]" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'hsl(var(--card) / 0.97)' }}>
            <div className="max-w-5xl mx-auto px-1 md:px-2 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              <TabsList className={cn(
                "w-max sm:w-full rounded-none h-auto p-0 bg-transparent flex"
              )} style={!isMobile ? { display: 'grid', gridTemplateColumns: `repeat(${tabs.length}, 1fr)` } : undefined}>
                {tabs.map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      "rounded-none border-b-2 border-transparent py-2.5 px-3 md:px-4 text-xs font-medium whitespace-nowrap",
                      "gap-1.5 transition-all duration-200 shrink-0",
                      "hover:bg-muted/40 hover:text-foreground",
                      "data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=active]:font-semibold"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className={isMobile ? "text-[11px]" : ""}>{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          {/* ===== TAB CONTENT ===== */}
          <div className="max-w-5xl mx-auto w-full px-3 md:px-6 py-4 space-y-4 pb-32 overflow-x-hidden">
            {/* ===== TAB 0: RESUMEN ===== */}
            <TabsContent value="summary" className="mt-0 space-y-4">
              {/* Exam Type Selector */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-4">
                  <Label className="text-xs font-bold text-accent whitespace-nowrap">Tipo de evaluación</Label>
                  <Select value={examType} onValueChange={(v) => setExamType(v as 'completo' | 'tamiz')}>
                    <SelectTrigger className="h-9 w-56 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completo">
                        <span className="flex items-center gap-2">
                          <Glasses className="h-3.5 w-3.5 text-primary" />
                          Examen completo
                        </span>
                      </SelectItem>
                      <SelectItem value="tamiz">
                        <span className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-ai" />
                          Tamiz Visual
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Motivo de Consulta */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <SectionTitle icon={ClipboardList} accent>Motivo de Consulta</SectionTitle>
                <Textarea
                  ref={consultReasonRef}
                  id="consultReason"
                  value={examData.consultReason}
                  onChange={(e) => handleExamChange('consultReason', e.target.value)}
                  placeholder="¿Por qué acude el paciente?"
                  rows={2}
                  className="bg-background border-border/80"
                  tabIndex={1}
                />
              </div>

              {/* Graduation Change Indicator (full) */}
              {previousPrescription && hasPrescriptionData && (
                <GraduationChangeIndicator
                  currentOdSph={currentOdSph} currentOdCyl={currentOdCyl}
                  currentOdAxis={currentOdAxis} currentOdAdd={currentOdAdd}
                  currentOiSph={currentOiSph} currentOiCyl={currentOiCyl}
                  currentOiAxis={currentOiAxis} currentOiAdd={currentOiAdd}
                  previousOdSph={previousPrescription.odSphere} previousOdCyl={previousPrescription.odCylinder}
                  previousOdAxis={previousPrescription.odAxis} previousOdAdd={previousPrescription.odAdd}
                  previousOiSph={previousPrescription.oiSphere} previousOiCyl={previousPrescription.oiCylinder}
                  previousOiAxis={previousPrescription.oiAxis} previousOiAdd={previousPrescription.oiAdd}
                  previousExamDate={previousPrescription.examDate}
                />
              )}

              {!previousPrescription && (
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Sin historial previo para comparar</p>
                </div>
              )}

              {/* Quick RX Overview */}
              {hasPrescriptionData && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-accent/5 border-b border-border">
                    <SectionTitle icon={Glasses} accent>Graduación Actual</SectionTitle>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <span className="font-sans font-bold text-primary text-[11px]">OD</span>
                        <p>SPH: {formatD(currentOdSph)} CYL: {formatD(currentOdCyl)}</p>
                        <p>EJE: {currentOdAxis ?? '—'}° ADD: {formatD(currentOdAdd)}</p>
                      </div>
                      <div>
                        <span className="font-sans font-bold text-success text-[11px]">OI</span>
                        <p>SPH: {formatD(currentOiSph)} CYL: {formatD(currentOiCyl)}</p>
                        <p>EJE: {currentOiAxis ?? '—'}° ADD: {formatD(currentOiAdd)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PDF & WhatsApp buttons */}
              <PrescriptionPDFButton data={prescriptionPDFData} whatsappPhone={patient.whatsapp} />

              {/* Clinical Alerts on summary */}
              <ClinicalAlertsPanel
                odSphere={currentOdSph} odCylinder={currentOdCyl} odAxis={currentOdAxis} odAdd={currentOdAdd}
                oiSphere={currentOiSph} oiCylinder={currentOiCyl} oiAxis={currentOiAxis} oiAdd={currentOiAdd}
                patientAge={patientAge} previousExam={previousExam} globalDiagnosis={examData.diagnosis}
              />
            </TabsContent>

            {/* ===== TAB 1: AGUDEZA VISUAL ===== */}
            <TabsContent value="acuity" className="mt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OD Card */}
                <div className="rounded-xl border-2 border-primary/30 bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/20">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Ojo Derecho (OD)
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <VisualAcuitySelect
                      label="Sin Corrección (SC)"
                      value={examData.avOdSc}
                      onChange={(v) => handleExamChange('avOdSc', v === 'none' ? '' : v)}
                      tabIndex={2}
                    />
                    <VisualAcuitySelect
                      label="Con Corrección (CC)"
                      value={examData.avOdCc}
                      onChange={(v) => handleExamChange('avOdCc', v === 'none' ? '' : v)}
                      tabIndex={3}
                    />
                  </div>
                </div>

                {/* OI Card */}
                <div className="rounded-xl border-2 border-success/30 bg-card overflow-hidden">
                  <div className="px-4 py-2.5 bg-success/5 border-b border-success/20">
                    <h4 className="text-sm font-bold text-success flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Ojo Izquierdo (OI)
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <VisualAcuitySelect
                      label="Sin Corrección (SC)"
                      value={examData.avOiSc}
                      onChange={(v) => handleExamChange('avOiSc', v === 'none' ? '' : v)}
                      tabIndex={4}
                    />
                    <VisualAcuitySelect
                      label="Con Corrección (CC)"
                      value={examData.avOiCc}
                      onChange={(v) => handleExamChange('avOiCc', v === 'none' ? '' : v)}
                      tabIndex={5}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== TAB 2: REFRACCIÓN ===== */}
            <TabsContent value="refraction" className="mt-0 space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <SectionTitle icon={Glasses} accent>Tabla de Graduación</SectionTitle>
                <div className="mt-3">
                  <ClinicalPrescriptionTable
                    odData={odData}
                    oiData={oiData}
                    onOdChange={(field, value) => updateOdData(field, value)}
                    onOiChange={(field, value) => updateOiData(field, value)}
                    onOdSignChange={(field, value) => updateOdData(field, value)}
                    onOiSignChange={(field, value) => updateOiData(field, value)}
                    onOdBlur={handleOdBlur}
                    onOiBlur={handleOiBlur}
                    odErrors={odErrors}
                    oiErrors={oiErrors}
                    touched={touched}
                    patientBirthDate={patient.birth_date}
                    odAxisFocus={odAxisFocus}
                    oiAxisFocus={oiAxisFocus}
                  />
                </div>
              </div>

              {/* General Data */}
              <div className="rounded-xl border border-border bg-card p-4">
                <SectionTitle icon={Activity} accent>Datos Generales</SectionTitle>
                <div className="grid grid-cols-1 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo de lentes sugerido por el especialista</Label>
                    <Input
                      value={generalData.lensType}
                      onChange={(e) => setGeneralData(prev => ({ ...prev, lensType: e.target.value }))}
                      placeholder="Monofocal, Bifocal, Progresivo..."
                      className="h-9 bg-background"
                      tabIndex={31}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== TAB 3: TAMIZ VISUAL ===== */}
            <TabsContent value="screening" className="mt-0">
              <VisualScreening data={screeningData} onChange={handleScreeningChange} />
            </TabsContent>

            {/* ===== TAB 4: DIAGNÓSTICO / OBSERVACIONES ===== */}
            <TabsContent value="observations" className="mt-0 space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <SectionTitle icon={FileText} accent>Observaciones Clínicas</SectionTitle>
                <Textarea
                  id="clinicalObservations"
                  value={examData.clinicalObservations}
                  onChange={(e) => handleExamChange('clinicalObservations', e.target.value)}
                  placeholder="Hallazgos del examen..."
                  rows={3}
                  className="bg-background"
                  tabIndex={6}
                />
              </div>

              <DiagnosisPanel
                odData={odData}
                oiData={oiData}
                patientAge={patientAge}
                diagnosisText={examData.diagnosis}
                onDiagnosisTextChange={(text) => handleExamChange('diagnosis', text)}
                diagnosisNotes={examData.notes}
                onDiagnosisNotesChange={(notes) => handleExamChange('notes', notes)}
              />

              {/* Recommendations */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <SectionTitle icon={Stethoscope} accent>Plan de Tratamiento y Recomendaciones</SectionTitle>
                <Textarea
                  value={generalData.recommendations}
                  onChange={(e) => setGeneralData(prev => ({ ...prev, recommendations: e.target.value }))}
                  placeholder="Uso permanente, solo lectura..."
                  rows={2}
                  className="bg-background"
                  tabIndex={41}
                />
              </div>
            </TabsContent>

            {/* ===== TAB 5: COMPARACIÓN ===== */}
            <TabsContent value="comparison" className="mt-0 space-y-4">
              {/* Full Graduation Change Indicator */}
              {previousPrescription && hasPrescriptionData && (
                <GraduationChangeIndicator
                  currentOdSph={currentOdSph} currentOdCyl={currentOdCyl}
                  currentOdAxis={currentOdAxis} currentOdAdd={currentOdAdd}
                  currentOiSph={currentOiSph} currentOiCyl={currentOiCyl}
                  currentOiAxis={currentOiAxis} currentOiAdd={currentOiAdd}
                  previousOdSph={previousPrescription.odSphere} previousOdCyl={previousPrescription.odCylinder}
                  previousOdAxis={previousPrescription.odAxis} previousOdAdd={previousPrescription.odAdd}
                  previousOiSph={previousPrescription.oiSphere} previousOiCyl={previousPrescription.oiCylinder}
                  previousOiAxis={previousPrescription.oiAxis} previousOiAdd={previousPrescription.oiAdd}
                  previousExamDate={previousPrescription.examDate}
                />
              )}

              {previousPrescription ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-primary/5 border-b border-border">
                    <SectionTitle icon={ArrowLeftRight} accent>Tabla Comparativa Detallada</SectionTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Examen previo: {new Date(previousPrescription.examDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2 text-left text-xs font-bold text-accent uppercase">Campo</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-primary uppercase" colSpan={2}>OD</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-success uppercase" colSpan={2}>OI</th>
                        </tr>
                        <tr className="border-b border-border bg-muted/10">
                          <th className="px-3 py-1.5 text-xs text-muted-foreground"></th>
                          <th className="px-3 py-1.5 text-center text-[10px] text-muted-foreground font-medium">Anterior</th>
                          <th className="px-3 py-1.5 text-center text-[10px] text-primary font-semibold">Actual</th>
                          <th className="px-3 py-1.5 text-center text-[10px] text-muted-foreground font-medium">Anterior</th>
                          <th className="px-3 py-1.5 text-center text-[10px] text-success font-semibold">Actual</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-xs">
                        {[
                          { label: 'Esfera', odPrev: previousPrescription.odSphere, odCur: currentOdSph, oiPrev: previousPrescription.oiSphere, oiCur: currentOiSph },
                          { label: 'Cilindro', odPrev: previousPrescription.odCylinder, odCur: currentOdCyl, oiPrev: previousPrescription.oiCylinder, oiCur: currentOiCyl },
                          { label: 'Eje°', odPrev: previousPrescription.odAxis, odCur: currentOdAxis, oiPrev: previousPrescription.oiAxis, oiCur: currentOiAxis, isAxis: true },
                          { label: 'ADD', odPrev: previousPrescription.odAdd, odCur: currentOdAdd, oiPrev: previousPrescription.oiAdd, oiCur: currentOiAdd },
                        ].map((row, i) => (
                          <tr key={row.label} className={i < 3 ? "border-b border-border/50" : ""}>
                            <td className="px-3 py-2.5 font-sans font-semibold text-accent">{row.label}</td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">
                              {row.isAxis ? (row.odPrev ?? '—') : formatD(row.odPrev)}
                            </td>
                            <td className={cn("px-3 py-2.5 text-center", getDiffClass(row.odCur, row.odPrev))}>
                              {row.isAxis ? (row.odCur ?? '—') : formatD(row.odCur)}
                              {!row.isAxis && getDiffBadge(row.odCur, row.odPrev)}
                            </td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">
                              {row.isAxis ? (row.oiPrev ?? '—') : formatD(row.oiPrev)}
                            </td>
                            <td className={cn("px-3 py-2.5 text-center", getDiffClass(row.oiCur, row.oiPrev))}>
                              {row.isAxis ? (row.oiCur ?? '—') : formatD(row.oiCur)}
                              {!row.isAxis && getDiffBadge(row.oiCur, row.oiPrev)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-4 py-2 bg-muted/20 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-success" />
                      Estable (&lt;0.50D)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-warning" />
                      Moderado (≥0.50D)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                      Significativo (≥1.00D)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted/20 p-8 text-center">
                  <ArrowLeftRight className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Sin examen previo</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    La comparación estará disponible cuando exista un examen anterior registrado.
                  </p>
                </div>
              )}

              {/* IA Clínica inline */}
              <PredictiveClinicPanel
                odSphere={currentOdSph} odCylinder={currentOdCyl} odAdd={currentOdAdd}
                oiSphere={currentOiSph} oiCylinder={currentOiCyl} oiAdd={currentOiAdd}
                patientAge={patientAge} examHistory={examHistory}
              />

              <VisualProfilePanel
                odSphere={currentOdSph} odCylinder={currentOdCyl} odAdd={currentOdAdd}
                oiSphere={currentOiSph} oiCylinder={currentOiCyl} oiAdd={currentOiAdd}
                patientAge={patientAge}
                diagnosis={examData.diagnosis}
                predictive={predictiveResult} advanced={advancedResult}
              />

              <ClinicalAIChat
                patientId={patient.id}
                clinicalContext={{
                  patientName: `${patient.first_name} ${patient.last_name}`,
                  patientAge,
                  currentRx: {
                    odSphere: currentOdSph, odCylinder: currentOdCyl, odAxis: currentOdAxis, odAdd: currentOdAdd,
                    oiSphere: currentOiSph, oiCylinder: currentOiCyl, oiAxis: currentOiAxis, oiAdd: currentOiAdd,
                  },
                  diagnosis: examData.diagnosis,
                  riskScore: predictiveResult.riskScore.score,
                  riskLevel: predictiveResult.riskScore.level,
                  alerts: advancedResult.alerts.map(a => a.title),
                  projections: predictiveResult.projections.map(p => `${p.eye}: ${p.currentSph.toFixed(2)}D → ${p.projected3yr.toFixed(2)}D`),
                  commercialLevel: 'N/A',
                  occupation: null,
                }}
              />
            </TabsContent>

            {/* Mobile: show screening, observations, comparison inline when on refraction tab */}
            {isMobile && activeTab === 'refraction' && (
              <div className="space-y-4 pt-4 border-t border-border">
                <VisualScreening data={screeningData} onChange={handleScreeningChange} />
                
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <SectionTitle icon={FileText} accent>Observaciones</SectionTitle>
                  <Textarea
                    value={examData.clinicalObservations}
                    onChange={(e) => handleExamChange('clinicalObservations', e.target.value)}
                    placeholder="Hallazgos..."
                    rows={2}
                    className="bg-background"
                  />
                </div>

                <DiagnosisPanel
                  odData={odData} oiData={oiData} patientAge={patientAge}
                  diagnosisText={examData.diagnosis}
                  onDiagnosisTextChange={(text) => handleExamChange('diagnosis', text)}
                  diagnosisNotes={examData.notes}
                  onDiagnosisNotesChange={(notes) => handleExamChange('notes', notes)}
                />

                {previousPrescription && hasPrescriptionData && (
                  <GraduationChangeIndicator
                    currentOdSph={currentOdSph} currentOdCyl={currentOdCyl}
                    currentOdAxis={currentOdAxis} currentOdAdd={currentOdAdd}
                    currentOiSph={currentOiSph} currentOiCyl={currentOiCyl}
                    currentOiAxis={currentOiAxis} currentOiAdd={currentOiAdd}
                    previousOdSph={previousPrescription.odSphere} previousOdCyl={previousPrescription.odCylinder}
                    previousOdAxis={previousPrescription.odAxis} previousOdAdd={previousPrescription.odAdd}
                    previousOiSph={previousPrescription.oiSphere} previousOiCyl={previousPrescription.oiCylinder}
                    previousOiAxis={previousPrescription.oiAxis} previousOiAdd={previousPrescription.oiAdd}
                    previousExamDate={previousPrescription.examDate}
                  />
                )}
              </div>
            )}
          </div>
        </Tabs>
      </div>

      {/* ===== STICKY FOOTER ===== */}
      <div className="shrink-0 border-t border-border bg-card shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* PDF & Share */}
            <div className="hidden md:block">
              <PrescriptionPDFButton data={prescriptionPDFData} whatsappPhone={patient.whatsapp} />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onCancel} size={isMobile ? 'sm' : 'default'} tabIndex={50}>
                Regresar
              </Button>
              
              <Button 
                type="submit" 
                variant="secondary"
                size={isMobile ? 'sm' : 'default'}
                disabled={loading || (hasPrescriptionData && hasErrors)}
                tabIndex={51}
              >
                {loading && saveMode === 'default' ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : (
                  'Guardar'
                )}
              </Button>

              {showGoToPOS && onSuccessWithExamData && (
                <Button 
                  type="button"
                  size={isMobile ? 'sm' : 'default'}
                  disabled={loading || (hasPrescriptionData && hasErrors)}
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent, 'goToPOS')}
                  className="gap-2"
                  tabIndex={52}
                >
                  {loading && saveMode === 'goToPOS' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Guardando...
                    </span>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" />
                      {isMobile ? 'Venta' : 'Guardar y pasar a venta'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
