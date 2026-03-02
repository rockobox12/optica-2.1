import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { PatientFormSheet } from '@/components/patients/PatientFormSheet';
import { ExpedienteDetail } from '@/components/expediente/ExpedienteDetail';
import { PatientTable, type PatientTableItem } from '@/components/patients/PatientTable';
import { usePatientTableData } from '@/hooks/usePatientTableData';
import { PatientDeleteModal } from '@/components/patients/PatientDeleteModal';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  mobile?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export default function Expediente() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { hasAnyRole, isAdmin, user, roles } = useAuth();
  
  const { patients, branches, loading, refetch, deletePatient, exportPatients } = usePatientTableData();
  
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deletingPatient, setDeletingPatient] = useState<PatientTableItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [triggerNewExam, setTriggerNewExam] = useState(false);
  const [draftConflictPatient, setDraftConflictPatient] = useState<PatientTableItem | null>(null);

  // Tecnico detection
  const isTecnico = roles.includes('tecnico') && !hasAnyRole(['super_admin', 'admin', 'gerente']);

  // Permission to create exams
  const canCreateExam = hasAnyRole(['admin', 'doctor', 'asistente', 'tecnico']);

  // Filter patients for tecnico: only patients with exams/sales created today by this user
  const [tecnicoPatientIds, setTecnicoPatientIds] = useState<Set<string> | null>(null);
  const [tecnicoLoading, setTecnicoLoading] = useState(false);

  useEffect(() => {
    if (!isTecnico || !user?.id) {
      setTecnicoPatientIds(null);
      return;
    }

    const fetchTecnicoPatients = async () => {
      setTecnicoLoading(true);
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        // Get patients from visual_exams created today by this user
        const examsRes = await (supabase as any)
          .from('visual_exams')
          .select('patient_id')
          .eq('created_by', user.id)
          .gte('created_at', todayISO);
        const exams = examsRes.data as any[] | null;

        const salesRes = await (supabase as any)
          .from('sales')
          .select('patient_id')
          .eq('created_by', user.id)
          .gte('created_at', todayISO);
        const sales = salesRes.data as any[] | null;

        const ids = new Set<string>();
        exams?.forEach(e => { if (e.patient_id) ids.add(e.patient_id); });
        sales?.forEach(s => { if (s.patient_id) ids.add(s.patient_id); });

        setTecnicoPatientIds(ids);
      } catch (err) {
        console.error('Error fetching tecnico patients:', err);
        setTecnicoPatientIds(new Set());
      } finally {
        setTecnicoLoading(false);
      }
    };

    fetchTecnicoPatients();
  }, [isTecnico, user?.id]);

  // Filtered patients for tecnico
  const filteredPatients = useMemo(() => {
    if (!isTecnico || tecnicoPatientIds === null) return patients;
    return patients.filter(p => tecnicoPatientIds.has(p.id));
  }, [patients, isTecnico, tecnicoPatientIds]);

  // Block access to patient detail if tecnico and patient not in today's list
  const canAccessPatient = (patientId: string): boolean => {
    if (!isTecnico) return true;
    if (tecnicoPatientIds === null) return false;
    return tecnicoPatientIds.has(patientId);
  };

  // Handle URL params
  useEffect(() => {
    const patientIdParam = searchParams.get('patientId');
    const action = searchParams.get('action');
    
    if (patientIdParam) {
      if (isTecnico && !canAccessPatient(patientIdParam)) {
        toast({
          title: 'Sin permisos',
          description: 'No tienes permisos para ver este paciente. Tu acceso al expediente es solo por pacientes atendidos hoy.',
          variant: 'destructive',
        });
        setSearchParams({}, { replace: true });
        return;
      }
      setSelectedPatientId(patientIdParam);
      setSheetOpen(true);
      if (action === 'new-exam') {
        setTriggerNewExam(true);
      }
      setSearchParams({}, { replace: true });
    } else if (action === 'new') {
      setShowCreateDialog(true);
      setSearchParams({}, { replace: true });
    } else if (action === 'new-exam') {
      setTriggerNewExam(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, isTecnico, tecnicoPatientIds]);

  // Persist selected patient in localStorage
  useEffect(() => {
    const savedPatientId = localStorage.getItem('expediente_selected_patient');
    if (savedPatientId && !selectedPatientId) {
      if (!isTecnico || canAccessPatient(savedPatientId)) {
        setSelectedPatientId(savedPatientId);
      }
    }
  }, [tecnicoPatientIds]);

  useEffect(() => {
    if (selectedPatientId) {
      localStorage.setItem('expediente_selected_patient', selectedPatientId);
    }
  }, [selectedPatientId]);

  const handleSelectPatient = (patient: PatientTableItem) => {
    if (isTecnico && !canAccessPatient(patient.id)) {
      toast({
        title: 'Sin permisos',
        description: 'No tienes permisos para ver este paciente.',
        variant: 'destructive',
      });
      return;
    }
    setSelectedPatientId(patient.id);
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
  };

  const handlePatientCreated = () => {
    setShowCreateDialog(false);
    refetch();
  };

  const handlePatientCreatedForExam = (patientId: string) => {
    setShowCreateDialog(false);
    refetch();
    setSelectedPatientId(patientId);
    setSheetOpen(true);
    setTriggerNewExam(true);
  };

  const handlePatientUpdated = () => {
    refetch();
  };

  const handleDeleteRequest = (patient: Patient) => {
    const tableItem: PatientTableItem = {
      id: patient.id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      birth_date: patient.birth_date || null,
      gender: patient.gender || null,
      phone: patient.phone || null,
      mobile: patient.mobile || null,
      whatsapp: patient.whatsapp || null,
      email: patient.email || null,
      is_active: patient.is_active ?? true,
      created_at: patient.created_at || new Date().toISOString(),
    };
    setDeletingPatient(tableItem);
  };

  const handleAttendNow = async (patient: PatientTableItem) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingExams } = await supabase
        .from('visual_exams')
        .select('id, created_at')
        .eq('patient_id', patient.id)
        .gte('created_at', today.toISOString())
        .limit(1);

      if (existingExams && existingExams.length > 0) {
        setDraftConflictPatient(patient);
        return;
      }

      await proceedToAttend(patient);
    } catch (error) {
      console.error('Error checking exam drafts:', error);
      toast({
        title: 'Error',
        description: 'No se pudo verificar exámenes existentes',
        variant: 'destructive',
      });
    }
  };

  const proceedToAttend = async (patient: PatientTableItem) => {
    if (user?.id) {
      await supabase.from('contact_events').insert({
        patient_id: patient.id,
        user_id: user.id,
        event_type: 'ATENDER_AHORA',
        channel: 'in_person',
      }).then(({ error }) => {
        if (error) console.warn('Could not log ATENDER_AHORA event:', error);
      });
    }

    setSelectedPatientId(patient.id);
    setSheetOpen(true);
    setTriggerNewExam(true);
    setDraftConflictPatient(null);
  };

  const handleContinueDraft = async () => {
    if (!draftConflictPatient) return;
    setSelectedPatientId(draftConflictPatient.id);
    setSheetOpen(true);
    setDraftConflictPatient(null);
  };

  const handleCreateNewExamAnyway = async () => {
    if (!draftConflictPatient) return;
    await proceedToAttend(draftConflictPatient);
  };

  const handleBulkMessage = (selectedPatients: PatientTableItem[]) => {
    toast({
      title: 'Próximamente',
      description: `Enviar mensaje a ${selectedPatients.length} clientes`,
    });
  };

  const handleBulkTag = (selectedPatients: PatientTableItem[]) => {
    toast({
      title: 'Próximamente',
      description: `Etiquetar ${selectedPatients.length} clientes`,
    });
  };

  const isLoading = loading || (isTecnico && tecnicoLoading);

  return (
    <MainLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-4 border-b border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Expediente
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {isTecnico 
                  ? 'Pacientes atendidos hoy por ti' 
                  : 'Datos personales, historial clínico y graduaciones'}
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Paciente
            </Button>
          </div>
        </div>

        {/* Tecnico notice */}
        {isTecnico && (
          <div className="px-4 pt-3">
            <Alert className="border-primary/30 bg-primary/5">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Tu acceso al expediente es solo por pacientes atendidos hoy. 
                {filteredPatients.length === 0 && !isLoading && ' No has atendido pacientes hoy.'}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Patient Table */}
        <div className="flex-1 overflow-auto p-4">
          <PatientTable
            patients={filteredPatients}
            loading={isLoading}
            branches={branches}
            onView={handleSelectPatient}
            onDelete={isAdmin() ? (patient) => setDeletingPatient(patient) : undefined}
            onAttend={canCreateExam ? handleAttendNow : undefined}
            showAttendButton={canCreateExam}
            onBulkExport={isTecnico ? undefined : exportPatients}
            onBulkMessage={isTecnico ? undefined : handleBulkMessage}
            onBulkTag={isTecnico ? undefined : handleBulkTag}
          />
        </div>
      </div>

      {/* Patient Expediente Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="center"
          hideCloseButton
          className="p-0 flex flex-col"
        >
          {selectedPatientId && (
            <ExpedienteDetail
              patientId={selectedPatientId}
              onBack={handleCloseSheet}
              onPatientUpdated={handlePatientUpdated}
              onDeleteRequest={handleDeleteRequest}
              triggerNewExam={triggerNewExam}
              onNewExamTriggered={() => setTriggerNewExam(false)}
              onGoToPOS={() => setSheetOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create Patient Sheet */}
      <PatientFormSheet
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handlePatientCreated}
        onSuccessWithExam={handlePatientCreatedForExam}
      />

      {/* Delete Confirmation - Admin Only */}
      <PatientDeleteModal
        patient={deletingPatient}
        open={!!deletingPatient}
        onOpenChange={(open) => { if (!open) setDeletingPatient(null); }}
        onDeleted={() => {
          if (selectedPatientId === deletingPatient?.id) {
            setSelectedPatientId(null);
            localStorage.removeItem('expediente_selected_patient');
          }
          setDeletingPatient(null);
          refetch();
        }}
      />

      {/* Draft Conflict Modal */}
      <AlertDialog open={!!draftConflictPatient} onOpenChange={() => setDraftConflictPatient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Examen existente hoy
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Ya existe un examen registrado hoy para{' '}
                <strong>
                  {draftConflictPatient?.first_name} {draftConflictPatient?.last_name}
                </strong>.
              </p>
              <p>¿Qué deseas hacer?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={handleContinueDraft}>
              Ver expediente
            </Button>
            <AlertDialogAction onClick={handleCreateNewExamAnyway}>
              Crear nuevo examen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
