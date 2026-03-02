import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageCircle, ExternalLink, AlertTriangle, Calendar, Clock, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AppointmentWhatsAppProps {
  appointmentId: string;
  patientName: string | null;
  patientPhone: string | null;
  patientId: string | null;
  appointmentDate: string;
  startTime: string;
  doctorId: string;
  branchId: string | null;
}

type MessageType = 'confirmation' | 'reminder' | 'reschedule';

interface MessageTemplate {
  id: MessageType;
  label: string;
  icon: React.ReactNode;
  template: string;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'confirmation',
    label: 'Confirmación',
    icon: <Calendar className="h-4 w-4" />,
    template: 'Hola {NombrePaciente}, te confirmamos tu cita en Óptica Istmeña el {FechaCita} a las {HoraCita} en {Sucursal}. ¿Nos confirmas tu asistencia?',
  },
  {
    id: 'reminder',
    label: 'Recordatorio',
    icon: <Bell className="h-4 w-4" />,
    template: 'Hola {NombrePaciente}, te recordamos tu cita el {FechaCita} a las {HoraCita} en {Sucursal}. ¡Te esperamos!',
  },
  {
    id: 'reschedule',
    label: 'Reprogramación',
    icon: <Clock className="h-4 w-4" />,
    template: 'Hola {NombrePaciente}, por favor indícanos si deseas reprogramar tu cita del {FechaCita} a las {HoraCita}. Estamos para ayudarte.',
  },
];

// Normalize phone number to Mexican format
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('52')) {
    cleaned = cleaned.substring(2);
  }
  
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  if (cleaned.length === 10) {
    return `52${cleaned}`;
  }
  
  return cleaned;
}

export function AppointmentWhatsApp({
  appointmentId,
  patientName,
  patientPhone,
  patientId,
  appointmentDate,
  startTime,
  doctorId,
  branchId,
}: AppointmentWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageType | ''>('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data, error } = await supabase
        .from('branches')
        .select('name, address, phone')
        .eq('id', branchId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  // Fetch doctor info
  const { data: doctor } = useQuery({
    queryKey: ['doctor-profile', doctorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', doctorId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!doctorId,
  });

  const hasWhatsApp = !!patientPhone;

  const replaceVariables = (template: string): string => {
    const firstName = patientName?.split(' ')[0] || 'Paciente';
    const formattedDate = format(new Date(appointmentDate), "EEEE d 'de' MMMM", { locale: es });
    const formattedTime = startTime.slice(0, 5);

    return template
      .replace(/{NombrePaciente}/g, firstName)
      .replace(/{FechaCita}/g, formattedDate)
      .replace(/{HoraCita}/g, formattedTime)
      .replace(/{Sucursal}/g, branch?.name || 'nuestra sucursal')
      .replace(/{DireccionSucursal}/g, branch?.address || '')
      .replace(/{TelefonoSucursal}/g, branch?.phone || '')
      .replace(/{NombreDoctor}/g, doctor?.full_name || 'nuestro especialista');
  };

  const handleTemplateChange = (templateId: MessageType) => {
    setSelectedTemplate(templateId);
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const personalizedMessage = replaceVariables(template.template);
      setMessage(personalizedMessage);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!patientPhone) return;

    const normalizedPhone = normalizePhoneNumber(patientPhone);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;

    // Soft audit log
    console.log('[WhatsApp Appointment Audit]', {
      appointment_id: appointmentId,
      patient_id: patientId,
      user_id: user?.id,
      message_type: selectedTemplate || 'custom',
      timestamp: new Date().toISOString(),
    });

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: 'WhatsApp abierto',
      description: 'Se ha abierto WhatsApp en una nueva ventana',
    });

    setIsOpen(false);
    setSelectedTemplate('');
    setMessage('');
  };

  const handleQuickSend = (type: MessageType) => {
    if (!hasWhatsApp) {
      toast({
        title: 'Sin WhatsApp',
        description: 'El paciente no tiene número de WhatsApp registrado',
        variant: 'destructive',
      });
      return;
    }
    handleTemplateChange(type);
    setIsOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSend('confirmation')}
          className="gap-2"
          disabled={!hasWhatsApp}
        >
          <MessageCircle className="h-4 w-4" />
          Confirmar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSend('reminder')}
          className="gap-2"
          disabled={!hasWhatsApp}
        >
          <Bell className="h-4 w-4" />
          Recordatorio
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleQuickSend('reschedule')}
          className="gap-2"
          disabled={!hasWhatsApp}
        >
          <Clock className="h-4 w-4" />
          Reprogramar
        </Button>
      </div>

      {!hasWhatsApp && (
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Paciente sin WhatsApp registrado
        </p>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Enviar WhatsApp - {patientName || 'Paciente'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!hasWhatsApp && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Este paciente no tiene número de WhatsApp registrado. 
                  Por favor, actualiza sus datos de contacto primero.
                </AlertDescription>
              </Alert>
            )}

            {hasWhatsApp && (
              <>
                <div className="space-y-2">
                  <Label>Número de WhatsApp</Label>
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                    {patientPhone}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de mensaje</Label>
                  <Select value={selectedTemplate} onValueChange={(v) => handleTemplateChange(v as MessageType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un tipo de mensaje" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_TEMPLATES.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <span className="flex items-center gap-2">
                            {template.icon}
                            {template.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mensaje</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escribe tu mensaje aquí..."
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Puedes editar el mensaje antes de enviarlo
                  </p>
                </div>

                <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
                  <p className="font-medium">Variables disponibles:</p>
                  <p className="text-muted-foreground">
                    {'{NombrePaciente}'}, {'{FechaCita}'}, {'{HoraCita}'}, {'{Sucursal}'}, {'{DireccionSucursal}'}, {'{TelefonoSucursal}'}, {'{NombreDoctor}'}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={!message.trim()}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir WhatsApp
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Se abrirá WhatsApp Web o la app. El envío final lo realizas tú.
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
