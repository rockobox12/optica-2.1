import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, X, User, Calendar, FileText, RotateCcw, AlertCircle, Glasses } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  referred_by: string | null;
  referido_promotor_id: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface VisualExam {
  id: string;
  exam_date: string;
  diagnosis: string | null;
}

interface PrescriptionBannerProps {
  patientId: string;
  examId?: string | null;
  onClose: () => void;
  onPatientLoaded: (patient: Patient) => void;
  onPromotorSuggested?: (promotorId: string | null, promotorName: string) => void;
}

export function PrescriptionBanner({
  patientId,
  examId,
  onClose,
  onPatientLoaded,
  onPromotorSuggested,
}: PrescriptionBannerProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [exam, setExam] = useState<VisualExam | null>(null);
  const [lensType, setLensType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);

  // Use refs to avoid stale closure / infinite loop from callback deps
  const onPatientLoadedRef = useRef(onPatientLoaded);
  const onPromotorSuggestedRef = useRef(onPromotorSuggested);
  onPatientLoadedRef.current = onPatientLoaded;
  onPromotorSuggestedRef.current = onPromotorSuggested;

  const didFetchRef = useRef(false);

  const fetchExam = useCallback(async (eid: string) => {
    setExamLoading(true);
    setExamError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const { data: examData, error } = await supabase
        .from('visual_exams')
        .select('id, exam_date, diagnosis')
        .eq('id', eid)
        .abortSignal(controller.signal)
        .single();

      clearTimeout(timeout);

      if (error) {
        console.error('[PrescriptionBanner] Error cargando examen:', error);
        setExamError(`Error cargando receta (${error.code || 'desconocido'})`);
      } else if (examData) {
        setExam(examData);
        // Fetch lens_type from linked prescription
        const { data: rxData } = await supabase
          .from('patient_prescriptions')
          .select('lens_type')
          .eq('visual_exam_id', eid)
          .maybeSingle();
        if (rxData?.lens_type) setLensType(rxData.lens_type);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setExamError('Tiempo de espera agotado al cargar receta');
      } else {
        console.error('[PrescriptionBanner] Error inesperado:', err);
        setExamError('Error inesperado al cargar receta');
      }
    } finally {
      setExamLoading(false);
    }
  }, []);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    const fetchPatient = async () => {
      setLoading(true);
      try {
        const { data: patientData, error } = await supabase
          .from('patients')
          .select('id, first_name, last_name, birth_date, referred_by, referido_promotor_id, phone, mobile, whatsapp, email')
          .eq('id', patientId)
          .single();

        if (error) {
          console.error('[PrescriptionBanner] Error cargando paciente:', error);
        }

        if (patientData) {
          setPatient(patientData);
          onPatientLoadedRef.current(patientData);

          if (onPromotorSuggestedRef.current) {
            onPromotorSuggestedRef.current(
              patientData.referido_promotor_id,
              patientData.referred_by || 'Óptica Istmeña (Paciente llegó solo)'
            );
          }
        }
      } catch (err) {
        console.error('[PrescriptionBanner] Error inesperado paciente:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();

    // Load exam in background (non-blocking)
    if (examId) {
      fetchExam(examId);
    }
  }, [patientId, examId, fetchExam]);

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

  if (loading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Cargando datos del examen...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Venta basada en examen</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{patient.first_name} {patient.last_name}</span>
                {patient.birth_date && (
                  <span className="text-muted-foreground">({getAge(patient.birth_date)} años)</span>
                )}
              </div>
              
              {examLoading && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <div className="h-3 w-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span className="text-xs">Cargando receta…</span>
                </div>
              )}

              {examError && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-warning" />
                  <span className="text-xs text-muted-foreground">{examError}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => examId && fetchExam(examId)}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reintentar
                  </Button>
                </div>
              )}
              
              {exam && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Examen del {format(new Date(exam.exam_date), "d 'de' MMM yyyy", { locale: es })}
                  </span>
                </div>
              )}
              
              {exam?.diagnosis && (
                <Badge variant="secondary" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {exam.diagnosis}
                </Badge>
              )}

              {lensType && (
                <Badge variant="outline" className="text-xs border-primary/40 bg-primary/5 text-primary">
                  <Glasses className="h-3 w-3 mr-1" />
                  Rec: {lensType}
                </Badge>
              )}
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 flex-shrink-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
