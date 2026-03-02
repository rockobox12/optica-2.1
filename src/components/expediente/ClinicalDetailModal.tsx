import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Stethoscope,
  Eye,
  FileText,
  Glasses,
  ClipboardList,
  Lightbulb,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { PrescriptionPDFButton } from '@/components/clinical/PrescriptionPDF';

interface ClinicalDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemId: string | null;
  itemType: 'Examen' | 'Graduación';
  patientName?: string;
  patientAge?: number | null;
  patientPhone?: string | null;
}

export function ClinicalDetailModal({ open, onOpenChange, itemId, itemType, patientName, patientAge, patientPhone }: ClinicalDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [prescription, setPrescription] = useState<any>(null);
  const [professionalName, setProfessionalName] = useState('');

  useEffect(() => {
    if (open && itemId) {
      fetchDetails();
    } else {
      setExam(null);
      setPrescription(null);
      setProfessionalName('');
    }
  }, [open, itemId]);

  const fetchDetails = async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      if (itemType === 'Examen') {
        // Fetch exam + linked prescription
        const { data: examData } = await supabase
          .from('visual_exams')
          .select('*')
          .eq('id', itemId)
          .maybeSingle();

        setExam(examData);

        if (examData?.prescription_id) {
          const { data: rxData } = await supabase
            .from('patient_prescriptions')
            .select('*')
            .eq('id', examData.prescription_id)
            .maybeSingle();
          setPrescription(rxData);
        } else {
          // Try finding prescription linked to this exam
          const { data: rxData } = await supabase
            .from('patient_prescriptions')
            .select('*')
            .eq('visual_exam_id', itemId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          setPrescription(rxData);
        }

        // Resolve professional name
        if (examData?.examined_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', examData.examined_by)
            .maybeSingle();
          setProfessionalName(profile?.full_name || '');
        }
      } else {
        // Graduación standalone
        const { data: rxData } = await supabase
          .from('patient_prescriptions')
          .select('*')
          .eq('id', itemId)
          .maybeSingle();
        setPrescription(rxData);

        if (rxData?.visual_exam_id) {
          const { data: examData } = await supabase
            .from('visual_exams')
            .select('*')
            .eq('id', rxData.visual_exam_id)
            .maybeSingle();
          setExam(examData);
        }

        if (rxData?.examined_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', rxData.examined_by)
            .maybeSingle();
          setProfessionalName(profile?.full_name || '');
        }
      }
    } catch (err) {
      console.error('Error fetching clinical detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatVal = (v: number | null | undefined) => {
    if (v == null) return '—';
    return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
  };

  const examDate = exam?.exam_date || prescription?.exam_date;

  // Extract fields
  const motivo = exam?.notes || prescription?.notes || null;
  const observaciones = [
    exam?.cover_test && `Cover test: ${exam.cover_test}`,
    exam?.pupil_reaction && `Reacción pupilar: ${exam.pupil_reaction}`,
    exam?.convergence_near_point && `PPC: ${exam.convergence_near_point}`,
    exam?.ductions && `Ducciones: ${exam.ductions}`,
    exam?.visual_field_notes && `Campo visual: ${exam.visual_field_notes}`,
    exam?.od_anterior_segment && `Seg. anterior OD: ${exam.od_anterior_segment}`,
    exam?.oi_anterior_segment && `Seg. anterior OI: ${exam.oi_anterior_segment}`,
    exam?.od_fundus && `Fondo ojo OD: ${exam.od_fundus}`,
    exam?.oi_fundus && `Fondo ojo OI: ${exam.oi_fundus}`,
  ].filter(Boolean);

  const diagnostico = exam?.diagnosis || prescription?.diagnosis || null;
  const recomendaciones = prescription?.recommendations || null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Detalle de Consulta
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
          </div>
        ) : !exam && !prescription ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No se encontraron datos de la consulta</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <Eye className="h-3 w-3" />
                  {itemType}
                </Badge>
                {examDate && (
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(examDate), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                )}
              </div>
              {professionalName && (
                <span className="text-sm text-muted-foreground">
                  Atendió: <span className="font-medium text-foreground">{professionalName}</span>
                </span>
              )}
            </div>

            <Separator />

            {/* Motivo de la consulta */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" />
                  Motivo de la Consulta / Observaciones del Examen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {motivo || <span className="italic text-muted-foreground">Sin observaciones registradas</span>}
                </p>
              </CardContent>
            </Card>

            {/* Observaciones clínicas */}
            {observaciones.length > 0 && (
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <ClipboardList className="h-4 w-4" />
                    Observaciones Clínicas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {observaciones.map((obs, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        {obs}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Graduación */}
            {prescription && (
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Glasses className="h-4 w-4" />
                    Graduación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Ojo</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">ESF</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">CIL</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">EJE</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">ADD</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">DIP</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">AV s/c</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">AV c/c</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="py-2 pr-3 font-semibold text-foreground">OD</td>
                          <td className="text-center py-2 px-2 font-mono">{formatVal(prescription.od_sphere)}</td>
                          <td className="text-center py-2 px-2 font-mono">{formatVal(prescription.od_cylinder)}</td>
                          <td className="text-center py-2 px-2 font-mono">{prescription.od_axis != null ? `${prescription.od_axis}°` : '—'}</td>
                          <td className="text-center py-2 px-2 font-mono">{formatVal(prescription.od_add)}</td>
                          <td className="text-center py-2 px-2 font-mono">{prescription.od_pupil_distance != null ? prescription.od_pupil_distance : '—'}</td>
                          <td className="text-center py-2 px-2">{prescription.od_va_sc || '—'}</td>
                          <td className="text-center py-2 px-2">{prescription.od_va_cc || '—'}</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-semibold text-foreground">OI</td>
                          <td className="text-center py-2 px-2 font-mono">{formatVal(prescription.oi_sphere)}</td>
                          <td className="text-center py-2 px-2 font-mono">{formatVal(prescription.oi_cylinder)}</td>
                          <td className="text-center py-2 px-2 font-mono">{prescription.oi_axis != null ? `${prescription.oi_axis}°` : '—'}</td>
                          <td className="text-center py-2 px-2 font-mono">{formatVal(prescription.oi_add)}</td>
                          <td className="text-center py-2 px-2 font-mono">{prescription.oi_pupil_distance != null ? prescription.oi_pupil_distance : '—'}</td>
                          <td className="text-center py-2 px-2">{prescription.oi_va_sc || '—'}</td>
                          <td className="text-center py-2 px-2">{prescription.oi_va_cc || '—'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Extra lens info */}
                  {(prescription.lens_type || prescription.lens_material || prescription.lens_treatment) && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {prescription.lens_type && <span>Tipo: <strong className="text-foreground">{prescription.lens_type}</strong></span>}
                      {prescription.lens_material && <span>Material: <strong className="text-foreground">{prescription.lens_material}</strong></span>}
                      {prescription.lens_treatment && <span>Tratamiento: <strong className="text-foreground">{prescription.lens_treatment}</strong></span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Diagnóstico */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <AlertCircle className="h-4 w-4" />
                  Diagnóstico
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {diagnostico || <span className="italic text-muted-foreground">Sin diagnóstico registrado</span>}
                </p>
              </CardContent>
            </Card>

            {/* Recomendaciones */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Recomendaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {recomendaciones || <span className="italic text-muted-foreground">Sin recomendaciones registradas</span>}
                </p>
              </CardContent>
            </Card>

            {/* IOP data if available */}
            {exam && (exam.od_iop != null || exam.oi_iop != null) && (
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-primary">
                    <Eye className="h-4 w-4" />
                    Presión Intraocular (PIO)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6 text-sm">
                    <span>OD: <strong>{exam.od_iop != null ? `${exam.od_iop} mmHg` : '—'}</strong></span>
                    <span>OI: <strong>{exam.oi_iop != null ? `${exam.oi_iop} mmHg` : '—'}</strong></span>
                    {exam.iop_method && <span className="text-muted-foreground">Método: {exam.iop_method}</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Print buttons */}
            <Separator className="my-2" />
            <div className="flex justify-center">
              <PrescriptionPDFButton
                data={{
                  patientName: patientName || '—',
                  patientAge: patientAge ?? null,
                  examDate: examDate ? format(new Date(examDate), "d 'de' MMMM yyyy", { locale: es }) : '—',
                  specialistName: professionalName || '—',
                  odSphere: prescription?.od_sphere ?? null,
                  odCylinder: prescription?.od_cylinder ?? null,
                  odAxis: prescription?.od_axis ?? null,
                  odAdd: prescription?.od_add ?? null,
                  odPd: prescription?.od_pupil_distance ?? null,
                  oiSphere: prescription?.oi_sphere ?? null,
                  oiCylinder: prescription?.oi_cylinder ?? null,
                  oiAxis: prescription?.oi_axis ?? null,
                  oiAdd: prescription?.oi_add ?? null,
                  oiPd: prescription?.oi_pupil_distance ?? null,
                  totalPd: null,
                  lensType: prescription?.lens_type || '',
                  recommendations: prescription?.recommendations || '',
                  diagnosis: exam?.diagnosis || prescription?.diagnosis || '',
                  consultReason: exam?.notes || '',
                  aiDiagnosis: exam?.ai_diagnosis || '',
                }}
                whatsappPhone={patientPhone}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
