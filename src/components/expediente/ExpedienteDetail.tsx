import { useState, useEffect, useRef } from 'react';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { useNavigate } from 'react-router-dom';
import { SaleDetailModal } from './SaleDetailModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Heart,
  FileText,
  Eye,
  Edit,
  Plus,
  Glasses,
  Stethoscope,
  Clock,
  X,
  ArrowLeft,
  ShoppingCart,
  MessageCircle,
  ExternalLink,
  Trash2,
  Play,
  DollarSign,
  Loader2,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { PatientForm } from '@/components/patients/PatientForm';
import { PrescriptionForm } from '@/components/patients/PrescriptionForm';
import { PrescriptionHistory, type Prescription, type PrescriptionHistoryRef } from '@/components/patients/PrescriptionHistory';
import { ContactActions } from '@/components/patients/ContactActions';
import { ContactHistory } from '@/components/patients/ContactHistory';
import { UnifiedExamForm } from '@/components/clinical/UnifiedExamForm';
import { usePatientCreditStatus } from '@/hooks/usePatientCreditStatus';
import { CreditAlertBanner } from '@/components/patients/CreditAlertBanner';
import { PaymentReminderButton } from '@/components/cobro-rapido/PaymentReminderButton';
import { ClinicalDetailModal } from './ClinicalDetailModal';
import { PortalAccessButton } from './PortalAccessButton';
import { PatientTransferModal } from './PatientTransferModal';
import { PatientTransferHistory } from './PatientTransferHistory';
import { TransferRequestModal } from './TransferRequestModal';
import { PendingTransferBanner } from './PendingTransferBanner';
import { CorporatePatientBadge } from './CorporatePatientBadge';
import { ArrowRightLeft, Send, Building2 } from 'lucide-react';
import { useBranch } from '@/hooks/useBranchContext';
import './expediente-stable.css';

interface ExpedienteDetailProps {
  patientId: string;
  onBack: () => void;
  onPatientUpdated: () => void;
  onDeleteRequest: (patient: Patient) => void;
  triggerNewExam?: boolean;
  onNewExamTriggered?: () => void;
  onGoToPOS?: () => void;
}

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
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
  occupation: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  status?: string;
  archive_reason?: string | null;
}

export function ExpedienteDetail({ patientId, onBack, onPatientUpdated, onDeleteRequest, triggerNewExam, onNewExamTriggered, onGoToPOS }: ExpedienteDetailProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, hasAnyRole, user } = useAuth();
  const { branchFilter, activeBranchId } = useBranch();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('datos');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [showExamForm, setShowExamForm] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [contactHistoryRefresh, setContactHistoryRefresh] = useState(0);
  const [attendLoading, setAttendLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTransferRequestModal, setShowTransferRequestModal] = useState(false);
  const [transferRefresh, setTransferRefresh] = useState(0);
  const prescriptionHistoryRef = useRef<PrescriptionHistoryRef>(null);

  // Historial clínico state
  const [clinicalHistory, setClinicalHistory] = useState<any[]>([]);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialTab, setHistorialTab] = useState('clinico');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedClinicalItem, setSelectedClinicalItem] = useState<{ id: string; type: 'Examen' | 'Graduación' } | null>(null);
  
  // Credit status
  const creditStatus = usePatientCreditStatus(patientId);

  // Protect exam form from accidental browser close
  useUnsavedChanges({
    isDirty: showExamForm,
    enabled: showExamForm,
  });

  // Permissions
  const canEdit = hasAnyRole(['admin', 'asistente']);
  const canEditPrescription = hasAnyRole(['admin', 'doctor']);
  const canAccessPOS = hasAnyRole(['admin', 'doctor', 'asistente']);
  const canCreateExam = hasAnyRole(['admin', 'doctor', 'asistente']);
  const isGerente = hasAnyRole(['gerente']);
  const canRequestTransfer = isGerente && !isAdmin();

  const refreshContactHistory = () => {
    setContactHistoryRefresh(prev => prev + 1);
  };

  // Handle "Atender ahora" from detail view
  const handleAttendNow = async () => {
    if (!patient || !user?.id) return;
    setAttendLoading(true);

    try {
      // Log audit event
      await supabase.from('contact_events').insert({
        patient_id: patient.id,
        user_id: user.id,
        event_type: 'ATENDER_AHORA',
        channel: 'in_person',
      });

      // Update current_branch_id to active branch
      if (branchFilter) {
        await supabase
          .from('patients')
          .update({ current_branch_id: branchFilter })
          .eq('id', patient.id);
      }

      // Switch to graduaciones tab and open exam form
      setActiveTab('graduaciones');
      setShowExamForm(true);
    } catch (error) {
      console.warn('Could not log ATENDER_AHORA event:', error);
      // Still proceed even if logging fails
      setActiveTab('graduaciones');
      setShowExamForm(true);
    } finally {
      setAttendLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  // Fetch historial when tab changes to historial
  useEffect(() => {
    if (activeTab === 'historial' && patientId) {
      fetchHistorial();
    }
    // Auto-open exam form when Nueva Consulta tab is selected
    if (activeTab === 'graduaciones' && !isArchived) {
      setShowExamForm(true);
    }
  }, [activeTab, patientId]);

  // Handle external trigger for new exam
  useEffect(() => {
    if (triggerNewExam && patient) {
      setActiveTab('graduaciones');
      setShowExamForm(true);
      onNewExamTriggered?.();
    }
  }, [triggerNewExam, patient, onNewExamTriggered]);

  const fetchPatient = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del paciente',
        variant: 'destructive',
      });
    } else {
      setPatient(data);
    }
    
    setLoading(false);
  };

  const fetchHistorial = async () => {
    setHistorialLoading(true);
    try {
      const [examsRes, prescriptionsRes, salesRes] = await Promise.all([
        supabase
          .from('visual_exams')
          .select('id, exam_date, examined_by, diagnosis, branch_id, branches(name)')
          .eq('patient_id', patientId)
          .order('exam_date', { ascending: false })
          .limit(50),
        supabase
          .from('patient_prescriptions')
          .select('id, exam_date, examined_by, od_sphere, od_cylinder, od_axis, od_add, od_pupil_distance, oi_sphere, oi_cylinder, oi_axis, oi_add, oi_pupil_distance, branch_id, branches(name), visual_exam_id, diagnosis')
          .eq('patient_id', patientId)
          .order('exam_date', { ascending: false })
          .limit(50),
        supabase
          .from('sales')
          .select('id, sale_number, created_at, total, status, branch_id, branches(name)')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      // Collect unique examined_by UUIDs to resolve names
      const allExams = examsRes.data || [];
      const allRx = prescriptionsRes.data || [];
      const userIds = new Set<string>();
      allExams.forEach((e: any) => { if (e.examined_by) userIds.add(e.examined_by); });
      allRx.forEach((r: any) => { if (r.examined_by) userIds.add(r.examined_by); });

      let nameMap: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', Array.from(userIds));
        (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });
      }

      // Build unified clinical timeline
      const clinicalItems: any[] = [];

      allExams.forEach((exam: any) => {
        clinicalItems.push({
          id: exam.id,
          date: exam.exam_date,
          type: 'Examen',
          professional: nameMap[exam.examined_by] || '—',
          branch: exam.branches?.name || '—',
          summary: exam.diagnosis || 'Examen visual',
        });
      });

      allRx.forEach((rx: any) => {
        // Skip if linked to an exam already shown
        if (rx.visual_exam_id) return;
        const formatVal = (v: number | null) => v != null ? (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '';
        const odStr = [formatVal(rx.od_sphere), formatVal(rx.od_cylinder), rx.od_axis != null ? `x${rx.od_axis}°` : ''].filter(Boolean).join(' ');
        const oiStr = [formatVal(rx.oi_sphere), formatVal(rx.oi_cylinder), rx.oi_axis != null ? `x${rx.oi_axis}°` : ''].filter(Boolean).join(' ');
        const summary = [odStr && `OD: ${odStr}`, oiStr && `OI: ${oiStr}`].filter(Boolean).join(' | ') || rx.diagnosis || 'Graduación';
        clinicalItems.push({
          id: rx.id,
          date: rx.exam_date,
          type: 'Graduación',
          professional: nameMap[rx.examined_by] || '—',
          branch: rx.branches?.name || '—',
          summary,
        });
      });

      clinicalItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setClinicalHistory(clinicalItems);
      setSalesHistory(salesRes.data || []);
    } catch (err) {
      console.error('Error fetching historial:', err);
    } finally {
      setHistorialLoading(false);
    }
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

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const handleGoToSale = (prescriptionId?: string, examId?: string) => {
    // Close the sheet first if callback provided
    onGoToPOS?.();
    
    // Navigate to POS with patient and optionally prescription pre-selected
    const params = new URLSearchParams();
    params.set('fromExam', 'true');
    params.set('patientId', patientId);
    if (prescriptionId) {
      params.set('prescriptionId', prescriptionId);
    }
    if (examId) {
      params.set('examId', examId);
    }
    navigate(`/ventas?${params.toString()}`);
  };

  const handlePatientUpdated = () => {
    setShowEditDialog(false);
    fetchPatient();
    onPatientUpdated();
    toast({
      title: 'Paciente actualizado',
      description: 'Los datos han sido actualizados correctamente',
    });
  };

  const handlePrescriptionSaved = () => {
    setShowPrescriptionForm(false);
    setEditingPrescription(null);
    prescriptionHistoryRef.current?.refresh();
    toast({
      title: editingPrescription ? 'Graduación actualizada' : 'Graduación guardada',
      description: 'La graduación ha sido guardada correctamente',
    });
  };

  const handleExamSaved = () => {
    setShowExamForm(false);
    setActiveTab('historial');
    prescriptionHistoryRef.current?.refresh();
  };

  const handleEditPrescription = (prescription: Prescription) => {
    if (!canEditPrescription) {
      toast({
        title: 'Sin permisos',
        description: 'Solo doctores y administradores pueden editar graduaciones',
        variant: 'destructive',
      });
      return;
    }
    setEditingPrescription(prescription);
    setShowPrescriptionForm(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">Paciente no encontrado</p>
        <Button variant="outline" onClick={onBack} className="mt-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a la lista
        </Button>
      </div>
    );
  }

  const age = getAge(patient.birth_date);
  const isArchived = patient.status === 'archived';

  const handleReactivate = async () => {
    try {
      const { error } = await supabase.rpc('reactivate_patient', {
        p_patient_id: patient.id,
      });
      if (error) {
        toast({
          title: 'Error al reactivar',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Paciente reactivado',
        description: `${patient.first_name} ${patient.last_name} ha sido reactivado exitosamente`,
      });
      fetchPatient();
      onPatientUpdated();
    } catch (err) {
      console.error('Error reactivating:', err);
    }
  };

  return (
    <div className="expediente-root flex-1 flex flex-col overflow-hidden">
      <div className="expediente-scroll-content flex-1 overflow-y-auto min-h-0" style={{ scrollbarGutter: 'stable' }}>
      {/* Archived Banner */}
      {isArchived && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-destructive" />
              <div>
                <span className="font-semibold text-destructive text-sm">PACIENTE ARCHIVADO</span>
                {patient.archive_reason && (
                  <p className="text-xs text-muted-foreground mt-0.5">Motivo: {patient.archive_reason}</p>
                )}
              </div>
            </div>
            {isAdmin() && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleReactivate}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reactivar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="expediente-patient-header flex-shrink-0 px-4 py-4 md:px-4 md:py-4 border-b border-border bg-card">
        <div className="expediente-header-top flex items-start justify-between gap-3 md:gap-3">
          <div className="expediente-patient-info-row flex items-center gap-3 md:gap-3">
            {/* Mobile-only close button */}
            <button
              onClick={onBack}
              className="expediente-mobile-close-btn hidden"
              aria-label="Cerrar expediente"
            >
              <X className="h-5 w-5" />
            </button>
            <Avatar className="expediente-avatar h-14 w-14 border-2 border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-medium">
                {getInitials(patient.first_name, patient.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="expediente-patient-name text-xl font-bold text-foreground">
                {patient.first_name} {patient.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                {age !== null && <span>{age} años</span>}
                {patient.gender && <span className="capitalize">• {patient.gender}</span>}
                {isArchived ? (
                  <Badge variant="destructive" className="ml-1 gap-1">
                    <Archive className="h-3 w-3" />
                    Archivado
                  </Badge>
                ) : (
                  <Badge variant={patient.is_active ? 'default' : 'destructive'} className="ml-1">
                    {patient.is_active ? 'Activo' : 'Inactivo'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Desktop actions - shown inline on desktop */}
          <div className="expediente-header-actions flex items-center gap-2 flex-shrink-0">
            {/* Atender ahora - disabled if archived */}
            {canCreateExam && !isArchived && (
              <Button 
                onClick={handleAttendNow} 
                variant="default"
                className="gap-2 bg-primary hover:bg-primary/90"
                disabled={attendLoading}
              >
                {attendLoading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Atender ahora</span>
              </Button>
            )}
            {canAccessPOS && !isArchived && (
              <Button onClick={() => handleGoToSale()} variant="outline" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Venta</span>
              </Button>
            )}
            {!isArchived && (
              <PortalAccessButton 
                patientId={patient.id} 
                patientPhone={patient.whatsapp || patient.mobile || patient.phone} 
                patientName={`${patient.first_name} ${patient.last_name}`} 
              />
            )}
            {canEdit && !isArchived && (
              <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
            {isAdmin() && !isArchived && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowTransferModal(true)}
                className="gap-2 text-primary"
              >
                <ArrowRightLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Transferir</span>
              </Button>
            )}
            {canRequestTransfer && !isArchived && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowTransferRequestModal(true)}
                className="gap-2 text-primary"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Solicitar transferencia</span>
              </Button>
            )}
            {isAdmin() && !isArchived && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => onDeleteRequest(patient)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            
            {/* Close button - always visible */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="ml-2 hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile-only primary actions row */}
        <div className="expediente-mobile-actions hidden mt-3 md:mt-3 pt-3 md:pt-3 border-t border-border">
          <div className="flex items-center gap-2 md:gap-2">
            {canCreateExam && !isArchived && (
              <Button 
                onClick={handleAttendNow} 
                variant="default"
                size="sm"
                className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                disabled={attendLoading}
              >
                {attendLoading ? (
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Atender
              </Button>
            )}
            {canAccessPOS && !isArchived && (
              <Button onClick={() => handleGoToSale()} variant="outline" size="sm" className="flex-1 gap-2">
                <ShoppingCart className="h-4 w-4" />
                Venta
              </Button>
            )}
            {!isArchived && (
              <PortalAccessButton 
                patientId={patient.id} 
                patientPhone={patient.whatsapp || patient.mobile || patient.phone} 
                patientName={`${patient.first_name} ${patient.last_name}`} 
              />
            )}
          </div>
        </div>

        {/* Quick Contact Actions */}
        <div className="expediente-contact-actions mt-4 md:mt-4 pt-3 md:pt-3 border-t border-border">
          <ContactActions
            patientId={patient.id}
            patientName={`${patient.first_name} ${patient.last_name}`}
            whatsapp={patient.whatsapp}
            celular={patient.mobile}
            telefonoFijo={patient.phone}
            showLabels={true}
            onEventLogged={refreshContactHistory}
          />
        </div>

        {/* Credit Alert Banner */}
        {!creditStatus.loading && creditStatus.saldoPendienteTotal > 0 && (
          <div className="expediente-credit-section px-4 md:px-4 py-2 md:py-2 bg-card border-b border-border space-y-2">
            <CreditAlertBanner
              status={creditStatus}
              patientId={patientId}
              patientName={`${patient.first_name} ${patient.last_name}`}
            />
            <PaymentReminderButton
              patientId={patientId}
              patientName={`${patient.first_name} ${patient.last_name}`}
              patientWhatsapp={patient.whatsapp}
              patientMobile={patient.mobile}
              creditStatus={creditStatus}
            />
          </div>
        )}

        {/* Corporate Patient Badge */}
        {(patient as any).is_corporate_patient && (
          <div className="px-4 py-2 bg-card border-b border-border">
            <CorporatePatientBadge
              homeBranchId={(patient as any).home_branch_id || null}
              currentBranchId={(patient as any).current_branch_id || null}
              activeBranchId={branchFilter}
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="expediente-tabs-bar px-4 border-b border-border bg-card sticky top-0 z-10">
          <TabsList className="h-12 bg-transparent justify-start gap-2 -mb-px">
            <TabsTrigger 
              value="datos" 
              className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Datos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="historial" 
              className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Historial Clínico</span>
            </TabsTrigger>
            <TabsTrigger 
              value="graduaciones" 
              className="gap-2 rounded-lg px-5 py-2 bg-primary/10 text-primary font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 hover:bg-primary/20"
            >
              <Stethoscope className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Consulta</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1">
          {/* Datos Tab */}
          <TabsContent value="datos" className="mt-0 p-4">
            <div className="expediente-cards-grid grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patient.whatsapp && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-24">WhatsApp:</span>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span>{patient.whatsapp}</span>
                      </div>
                    </div>
                  )}
                  {patient.mobile && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-24">Celular:</span>
                      <span>{patient.mobile}</span>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-24">Teléfono:</span>
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-24">Email:</span>
                      <a href={`mailto:${patient.email}`} className="text-primary hover:underline">
                        {patient.email}
                      </a>
                    </div>
                  )}
                  {!patient.mobile && !patient.phone && !patient.email && !patient.whatsapp && (
                    <p className="text-sm text-muted-foreground italic">Sin información de contacto</p>
                  )}
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Dirección
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patient.address ? (
                    <div className="text-sm space-y-1">
                      <p>{patient.address}</p>
                      {(patient.city || patient.state) && (
                        <p className="text-muted-foreground">
                          {[patient.city, patient.state].filter(Boolean).join(', ')}
                          {patient.zip_code && ` C.P. ${patient.zip_code}`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sin dirección registrada</p>
                  )}
                  
                  {patient.latitude && patient.longitude && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">GPS:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {patient.latitude},{patient.longitude}
                        </code>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${patient.latitude},${patient.longitude}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver en Mapa
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Personal Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Datos Personales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patient.birth_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-28">Nacimiento:</span>
                      <span>{format(new Date(patient.birth_date), "d 'de' MMMM yyyy", { locale: es })}</span>
                    </div>
                  )}
                  {patient.rfc && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-28">RFC:</span>
                      <span className="font-mono">{patient.rfc}</span>
                    </div>
                  )}
                  {patient.occupation && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-28">Ocupación:</span>
                      <span>{patient.occupation}</span>
                    </div>
                  )}
                  {patient.referred_by && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-28">Referido por:</span>
                      <span>{patient.referred_by}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Medical Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" />
                    Información Médica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patient.blood_type && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-28">Tipo de sangre:</span>
                      <Badge variant="outline">{patient.blood_type}</Badge>
                    </div>
                  )}
                  {patient.allergies && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Alergias:</span>
                      <p className="mt-1 text-destructive">{patient.allergies}</p>
                    </div>
                  )}
                  {patient.medical_conditions && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Padecimientos:</span>
                      <p className="mt-1">{patient.medical_conditions}</p>
                    </div>
                  )}
                  {patient.current_medications && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Medicamentos:</span>
                      <p className="mt-1">{patient.current_medications}</p>
                    </div>
                  )}
                  {!patient.blood_type && !patient.allergies && !patient.medical_conditions && (
                    <p className="text-sm text-muted-foreground italic">Sin información médica registrada</p>
                  )}
                </CardContent>
              </Card>

              {/* Contact History */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Historial de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ContactHistory 
                    patientId={patient.id} 
                    maxItems={10}
                    refreshTrigger={contactHistoryRefresh}
                  />
                </CardContent>
              </Card>

              {/* Pending Transfer Requests */}
              <div className="md:col-span-2">
                <PendingTransferBanner
                  patientId={patient.id}
                  refreshTrigger={transferRefresh}
                  onTransferred={() => {
                    fetchPatient();
                    onPatientUpdated();
                    setTransferRefresh((p) => p + 1);
                  }}
                />
              </div>

              {/* Transfer History */}
              <div className="md:col-span-2">
                <PatientTransferHistory patientId={patient.id} refreshTrigger={transferRefresh} />
              </div>

              {/* Notes */}
              {patient.notes && (
                <Card className="md:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Notas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{patient.notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Graduaciones Tab - opens exam form directly */}
          <TabsContent value="graduaciones" className="mt-0 p-0">
            {/* Auto-open exam form when this tab is selected */}
          </TabsContent>

          {/* Historial Tab */}
          <TabsContent value="historial" className="mt-0 p-4">
            <div className="space-y-4">
              {/* Sub-tabs */}
              <div className="flex gap-2 border-b border-border pb-2">
                <Button
                  variant={historialTab === 'clinico' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setHistorialTab('clinico')}
                  className="gap-2"
                >
                  <Stethoscope className="h-4 w-4" />
                  Clínico
                </Button>
                <Button
                  variant={historialTab === 'ventas' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setHistorialTab('ventas')}
                  className="gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Ventas
                </Button>
              </div>




              {historialLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando historial...</span>
                </div>
              ) : historialTab === 'clinico' ? (
                /* Clinical History Table */
                clinicalHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-secondary/30 rounded-lg">
                    <Stethoscope className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Sin registros clínicos</p>
                    <p className="text-xs text-muted-foreground mt-1">Crea un examen o graduación para comenzar</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/5 border-b border-border">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Atendió</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Sucursal</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Resumen</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Opciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clinicalHistory.map((item, idx) => (
                          <tr key={item.id + '-' + idx} className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap">
                              {format(new Date(item.date), "dd/MM/yyyy", { locale: es })}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={item.type === 'Examen' ? 'default' : 'secondary'} className="text-xs">
                                {item.type === 'Examen' ? <Eye className="h-3 w-3 mr-1" /> : <Glasses className="h-3 w-3 mr-1" />}
                                {item.type}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{item.professional}</td>
                            <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{item.branch}</td>
                            <td className="px-4 py-3 font-mono text-xs max-w-[250px] truncate">{item.summary}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 h-7 text-xs"
                                onClick={() => setSelectedClinicalItem({ id: item.id, type: item.type })}
                              >
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Sales History Table */
                salesHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-secondary/30 rounded-lg">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Sin ventas registradas</p>
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-primary/5 border-b border-border">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Folio</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Sucursal</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estatus</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Opciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {salesHistory.map((sale: any) => (
                          <tr key={sale.id} className="border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedSaleId(sale.id)}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {format(new Date(sale.created_at), "dd/MM/yyyy", { locale: es })}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{sale.sale_number}</td>
                            <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{(sale as any).branches?.name || '—'}</td>
                            <td className="px-4 py-3">
                              <Badge variant={
                                sale.status === 'completed' ? 'default' :
                                sale.status === 'partial' ? 'secondary' :
                                sale.status === 'cancelled' ? 'destructive' : 'outline'
                              } className="text-xs">
                                {sale.status === 'completed' ? 'Pagado' :
                                 sale.status === 'partial' ? 'Parcial' :
                                 sale.status === 'pending' ? 'Pendiente' :
                                 sale.status === 'cancelled' ? 'Cancelado' : sale.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">${sale.total?.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 h-7 text-xs"
                                onClick={(e) => { e.stopPropagation(); setSelectedSaleId(sale.id); }}
                              >
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Clinical Detail Modal */}
      <ClinicalDetailModal
        open={!!selectedClinicalItem}
        onOpenChange={(open) => !open && setSelectedClinicalItem(null)}
        itemId={selectedClinicalItem?.id || null}
        itemType={selectedClinicalItem?.type || 'Examen'}
        patientName={patient ? `${patient.first_name} ${patient.last_name}` : undefined}
        patientAge={age}
        patientPhone={patient?.whatsapp || patient?.mobile || patient?.phone}
      />

      {/* Sale Detail Modal */}
      <SaleDetailModal saleId={selectedSaleId} onClose={() => setSelectedSaleId(null)} />

      {/* Edit Patient Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
          </DialogHeader>
          <PatientForm
            patient={{ ...patient, branch_id: null }}
            onSuccess={handlePatientUpdated}
            onCancel={() => setShowEditDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Prescription Form Dialog */}
      <Dialog open={showPrescriptionForm} onOpenChange={(open) => {
        setShowPrescriptionForm(open);
        if (!open) setEditingPrescription(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrescription ? 'Editar Graduación' : 'Nueva Graduación'}
            </DialogTitle>
          </DialogHeader>
          <PrescriptionForm
            patientId={patientId}
            patientBirthDate={patient?.birth_date ?? null}
            editingPrescription={editingPrescription}
            onSuccess={handlePrescriptionSaved}
            onCancel={() => {
              setShowPrescriptionForm(false);
              setEditingPrescription(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Unified Exam Form Dialog */}
      <Dialog open={showExamForm} onOpenChange={setShowExamForm}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" preventClose>
          <DialogHeader>
            <DialogTitle>Nuevo Examen + Graduación</DialogTitle>
          </DialogHeader>
          <UnifiedExamForm
            patient={{
              id: patient.id,
              first_name: patient.first_name,
              last_name: patient.last_name,
              birth_date: patient.birth_date,
              gender: patient.gender,
              whatsapp: patient.whatsapp,
              mobile: patient.mobile,
              phone: patient.phone,
            }}
            onSuccess={handleExamSaved}
            onCancel={() => { setShowExamForm(false); setActiveTab('historial'); }}
            showGoToPOS={canAccessPOS}
            onSuccessWithExamData={({ patientId, examId, prescriptionId }) => {
              setShowExamForm(false);
              handleGoToSale(prescriptionId, examId);
            }}
          />
        </DialogContent>
      </Dialog>

      </div>{/* end expediente-scroll-content */}

      {/* Mobile Bottom Navigation */}
      <div className="expediente-bottom-nav">
        <button
          className={`expediente-bottom-nav-item ${activeTab === 'datos' ? 'active' : ''}`}
          onClick={() => setActiveTab('datos')}
          type="button"
        >
          <User className="h-5 w-5" />
          <span>Datos</span>
        </button>
        <button
          className={`expediente-bottom-nav-item ${activeTab === 'historial' ? 'active' : ''}`}
          onClick={() => setActiveTab('historial')}
          type="button"
        >
          <Clock className="h-5 w-5" />
          <span>Historial</span>
        </button>
        <button
          className={`expediente-bottom-nav-item nav-primary ${activeTab === 'graduaciones' ? 'active' : ''}`}
          onClick={() => { setActiveTab('graduaciones'); }}
          type="button"
        >
          <Stethoscope className="h-5 w-5" />
          <span>Consulta</span>
        </button>
        <button
          className="expediente-bottom-nav-item"
          onClick={() => handleGoToSale()}
          type="button"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Ventas</span>
        </button>
      </div>

      {/* Patient Transfer Modal (Super Admin direct) */}
      <PatientTransferModal
        open={showTransferModal}
        onOpenChange={setShowTransferModal}
        patientId={patient.id}
        patientName={`${patient.first_name} ${patient.last_name}`}
        currentBranchId={(patient as any).branch_id || null}
        pendingBalance={creditStatus.saldoPendienteTotal}
        onTransferred={() => {
          fetchPatient();
          onPatientUpdated();
          setTransferRefresh((p) => p + 1);
        }}
      />

      {/* Transfer Request Modal (Gerente solicitation) */}
      <TransferRequestModal
        open={showTransferRequestModal}
        onOpenChange={setShowTransferRequestModal}
        patientId={patient.id}
        patientName={`${patient.first_name} ${patient.last_name}`}
        currentBranchId={(patient as any).branch_id || null}
        pendingBalance={creditStatus.saldoPendienteTotal}
        onRequested={() => {
          setTransferRefresh((p) => p + 1);
        }}
      />
    </div>
  );
}
