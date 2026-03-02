import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  ExternalLink, 
  AlertTriangle, 
  Clock,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInHours } from 'date-fns';
import { es } from 'date-fns/locale';

interface LabOrderWhatsAppProps {
  orderId: string;
  orderNumber: string;
  patientName: string;
  patientPhone: string | null;
  patientId: string;
  branchId: string | null;
  estimatedDeliveryDate: string | null;
  notificationSentAt: string | null;
  notifyCount: number;
  onNotificationSent: () => void;
}

const DEFAULT_TEMPLATE = `Hola {NombrePaciente}, tus lentes ya están LISTOS ✅

Puedes pasar a recogerlos en {Sucursal}.
Horario: {HorarioSucursal}
Dirección: {DireccionSucursal}

¡Gracias por tu preferencia! 👓`;

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

export function LabOrderWhatsApp({
  orderId,
  orderNumber,
  patientName,
  patientPhone,
  patientId,
  branchId,
  estimatedDeliveryDate,
  notificationSentAt,
  notifyCount,
  onNotificationSent,
}: LabOrderWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [showSpamWarning, setShowSpamWarning] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if recently notified (within 12 hours)
  const wasRecentlyNotified = notificationSentAt 
    ? differenceInHours(new Date(), new Date(notificationSentAt)) < 12
    : false;

  // Fetch branch info
  const { data: branch } = useQuery({
    queryKey: ['branch-details', branchId],
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

  // Fetch patient WhatsApp if not provided
  const { data: patient } = useQuery({
    queryKey: ['patient-whatsapp', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('whatsapp, mobile, phone')
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !patientPhone && !!patientId,
  });

  const effectivePhone = patientPhone || patient?.whatsapp || patient?.mobile || patient?.phone;
  const hasWhatsApp = !!effectivePhone;

  const replaceVariables = (template: string): string => {
    const firstName = patientName.split(' ')[0] || 'Paciente';
    const formattedDate = estimatedDeliveryDate 
      ? format(new Date(estimatedDeliveryDate), "EEEE d 'de' MMMM", { locale: es })
      : '';

    return template
      .replace(/{NombrePaciente}/g, firstName)
      .replace(/{Sucursal}/g, branch?.name || 'nuestra sucursal')
      .replace(/{DireccionSucursal}/g, branch?.address || '')
      .replace(/{TelefonoSucursal}/g, branch?.phone || '')
      .replace(/{HorarioSucursal}/g, 'Lunes a Sábado de 9:00 a 19:00')
      .replace(/{FolioOrden}/g, orderNumber)
      .replace(/{FechaEstimada}/g, formattedDate);
  };

  const handleOpenDialog = () => {
    if (wasRecentlyNotified) {
      setShowSpamWarning(true);
    } else {
      openNotificationDialog();
    }
  };

  const openNotificationDialog = () => {
    setShowSpamWarning(false);
    const personalizedMessage = replaceVariables(DEFAULT_TEMPLATE);
    setMessage(personalizedMessage);
    setIsOpen(true);
  };

  const handleSendWhatsApp = async () => {
    if (!effectivePhone) return;

    const normalizedPhone = normalizePhoneNumber(effectivePhone);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;

    // Update notification tracking
    try {
      await supabase
        .from('lab_orders')
        .update({
          notification_sent_at: new Date().toISOString(),
          whatsapp_notification_sent: true,
          last_notified_by: user?.id,
          notify_count: (notifyCount || 0) + 1,
          notify_channel: 'whatsapp',
        })
        .eq('id', orderId);

      // Register audit event in contact_events
      if (user?.id) {
        await supabase
          .from('contact_events')
          .insert({
            patient_id: patientId,
            user_id: user.id,
            event_type: 'order_ready',
            channel: 'whatsapp',
            phone_used: effectivePhone,
            related_entity_type: 'lab_order',
            related_entity_id: orderId,
          });
      }
    } catch (error) {
      console.error('Error updating notification status:', error);
    }

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: 'WhatsApp abierto',
      description: 'Se ha abierto WhatsApp en una nueva ventana',
    });

    setIsOpen(false);
    setMessage('');
    onNotificationSent();
  };

  if (!hasWhatsApp) {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <span className="font-medium">Paciente sin WhatsApp registrado.</span>
          <br />
          <span className="text-sm">Edita los datos del paciente para agregar su número de WhatsApp.</span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenDialog} className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Notificar lentes listos por WhatsApp
          </Button>
        </div>

        {notificationSentAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              Notificado el {format(new Date(notificationSentAt), "dd MMM yyyy HH:mm", { locale: es })}
              {notifyCount > 1 && ` (${notifyCount} veces)`}
            </span>
          </div>
        )}
      </div>

      {/* Spam Warning Dialog */}
      <Dialog open={showSpamWarning} onOpenChange={setShowSpamWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <Clock className="h-5 w-5" />
              Notificación reciente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Ya se notificó al paciente hace menos de 12 horas.
                <br />
                <span className="text-sm">
                  Última notificación: {notificationSentAt && format(new Date(notificationSentAt), "dd MMM yyyy HH:mm", { locale: es })}
                </span>
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground">
              ¿Deseas enviar otra notificación de todos modos?
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSpamWarning(false)}>
                Cancelar
              </Button>
              <Button onClick={openNotificationDialog} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Sí, notificar de nuevo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Notification Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Notificar a {patientName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Orden</Label>
                <p className="font-medium">{orderNumber}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">WhatsApp</Label>
                <p className="font-medium">{effectivePhone}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mensaje</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Puedes editar el mensaje antes de enviarlo
              </p>
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-xs space-y-1">
              <p className="font-medium">Variables disponibles:</p>
              <p className="text-muted-foreground">
                {'{NombrePaciente}'}, {'{Sucursal}'}, {'{DireccionSucursal}'}, {'{TelefonoSucursal}'}, {'{HorarioSucursal}'}, {'{FolioOrden}'}, {'{FechaEstimada}'}
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
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
