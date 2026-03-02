import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
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
  Paperclip,
  TrendingUp,
  Clock,
  X,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { PrescriptionForm } from './PrescriptionForm';
import { PrescriptionHistory, type Prescription, type PrescriptionHistoryRef } from './PrescriptionHistory';
import { WhatsAppButton } from './WhatsAppButton';
import { ContactActions } from './ContactActions';
import { ContactHistory } from './ContactHistory';

interface PatientDetailProps {
  patientId: string;
  onClose: () => void;
  onEdit: () => void;
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
}

export function PatientDetail({ patientId, onClose, onEdit }: PatientDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);
  const [contactHistoryRefresh, setContactHistoryRefresh] = useState(0);
  const prescriptionHistoryRef = useRef<PrescriptionHistoryRef>(null);
  const { toast } = useToast();

  const refreshContactHistory = () => {
    setContactHistoryRefresh(prev => prev + 1);
  };

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

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
      onClose();
    } else {
      setPatient(data);
    }
    
    setLoading(false);
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

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                {getInitials(patient.first_name, patient.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {patient.first_name} {patient.last_name}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                {patient.birth_date && (
                  <span>{getAge(patient.birth_date)} años</span>
                )}
                {patient.gender && (
                  <span className="capitalize">• {patient.gender}</span>
                )}
                <Badge variant={patient.is_active ? 'default' : 'destructive'}>
                  {patient.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Clock className="h-3 w-3 inline mr-1" />
                Registrado el {format(new Date(patient.created_at), "d 'de' MMMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Acciones rápidas de contacto */}
        <div className="mt-4 pt-4 border-t border-border">
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
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="flex-1">
        <div className="px-6 border-b border-border">
          <TabsList className="h-12 bg-transparent justify-start gap-4 -mb-px">
            <TabsTrigger value="overview" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <User className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Glasses className="h-4 w-4" />
              Graduaciones
            </TabsTrigger>
            <TabsTrigger value="visits" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Stethoscope className="h-4 w-4" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="attachments" className="gap-2 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
              <Paperclip className="h-4 w-4" />
              Archivos
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-6">
          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span className="text-muted-foreground w-20">WhatsApp:</span>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-primary" />
                        <span>{patient.whatsapp}</span>
                      </div>
                    </div>
                  )}
                  {patient.mobile && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-20">Celular:</span>
                      <span>{patient.mobile}</span>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-20">Teléfono fijo:</span>
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-20">Email:</span>
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

              {/* Contact History */}
              <Card>
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
                      {((patient as any).between_streets_1 || (patient as any).between_streets_2) && (
                        <p className="text-muted-foreground">
                          Entre: {[(patient as any).between_streets_1, (patient as any).between_streets_2].filter(Boolean).join(' y ')}
                        </p>
                      )}
                      {(patient as any).address_reference_notes && (
                        <p className="text-muted-foreground italic">
                          Ref: {(patient as any).address_reference_notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sin dirección registrada</p>
                  )}
                  
                  {/* GPS Location + Actions */}
                  {patient.latitude && patient.longitude && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Geolocalización:</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {patient.latitude},{patient.longitude}
                        </code>
                        <a
                          href={`https://www.google.com/maps?q=${patient.latitude},${patient.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver en Maps
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 px-2"
                          onClick={() => {
                            const parts = [
                              patient.address,
                              patient.city && patient.state 
                                ? `${patient.city}, ${patient.state}` 
                                : patient.city || patient.state,
                              ((patient as any).between_streets_1 || (patient as any).between_streets_2)
                                ? `Entre: ${[(patient as any).between_streets_1, (patient as any).between_streets_2].filter(Boolean).join(' y ')}`
                                : null,
                              (patient as any).address_reference_notes
                                ? `Ref: ${(patient as any).address_reference_notes}`
                                : null,
                            ].filter(Boolean).join('\n');
                            navigator.clipboard.writeText(parts);
                            toast({ title: 'Dirección copiada', description: 'Lista para pegar en WhatsApp' });
                          }}
                        >
                          Copiar dirección
                        </Button>
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
                      <span className="text-muted-foreground w-24">Nacimiento:</span>
                      <span>{format(new Date(patient.birth_date), "d 'de' MMMM yyyy", { locale: es })}</span>
                    </div>
                  )}
                  {patient.curp && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-24">CURP:</span>
                      <span className="font-mono">{patient.curp}</span>
                    </div>
                  )}
                  {patient.occupation && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-24">Ocupación:</span>
                      <span>{patient.occupation}</span>
                    </div>
                  )}
                  {patient.referred_by && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground w-24">Referido por:</span>
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

          {/* Prescriptions Tab */}
          <TabsContent value="prescriptions" className="mt-0">
            {showPrescriptionForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {editingPrescription ? 'Editar Graduación' : 'Nueva Graduación'}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setShowPrescriptionForm(false);
                      setEditingPrescription(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
                <PrescriptionForm
                  patientId={patientId}
                  patientBirthDate={patient?.birth_date ?? null}
                  editingPrescription={editingPrescription}
                  onSuccess={() => {
                    setShowPrescriptionForm(false);
                    setEditingPrescription(null);
                    prescriptionHistoryRef.current?.refresh();
                  }}
                  onCancel={() => {
                    setShowPrescriptionForm(false);
                    setEditingPrescription(null);
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Historial de Graduaciones
                  </h3>
                  <Button onClick={() => setShowPrescriptionForm(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Graduación
                  </Button>
                </div>
                <PrescriptionHistory 
                  ref={prescriptionHistoryRef}
                  patientId={patientId} 
                  onEdit={(prescription) => {
                    setEditingPrescription(prescription);
                    setShowPrescriptionForm(true);
                  }}
                />
              </div>
            )}
          </TabsContent>

          {/* Visits Tab */}
          <TabsContent value="visits" className="mt-0">
            <div className="flex flex-col items-center justify-center p-8 text-center bg-secondary/30 rounded-lg">
              <Stethoscope className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Próximamente: Historial de consultas</p>
            </div>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments" className="mt-0">
            <div className="flex flex-col items-center justify-center p-8 text-center bg-secondary/30 rounded-lg">
              <Paperclip className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Próximamente: Archivos adjuntos</p>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
