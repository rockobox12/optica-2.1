import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MessageCircle, 
  Phone, 
  PhoneCall, 
  Copy, 
  Check,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ContactActionsProps {
  patientId: string;
  patientName: string;
  whatsapp: string | null;
  celular: string | null;
  telefonoFijo: string | null;
  relatedEntityType?: 'APPOINTMENT' | 'LAB_ORDER' | 'SALE' | null;
  relatedEntityId?: string | null;
  size?: 'sm' | 'default';
  showLabels?: boolean;
  onEventLogged?: () => void;
}

// Normalizar número a formato +52XXXXXXXXXX
function normalizeToMX(phone: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  
  // 10 dígitos nacionales
  if (cleaned.length === 10) {
    return `+52${cleaned}`;
  }
  // 12 dígitos con prefijo 52
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    return `+${cleaned}`;
  }
  // 13 dígitos con prefijo 521 (formato viejo)
  if (cleaned.length === 13 && cleaned.startsWith('521')) {
    return `+52${cleaned.slice(3)}`;
  }
  
  return null;
}

// Validar celular México (10 dígitos)
function isValidCelular(phone: string | null): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || 
    (cleaned.length === 12 && cleaned.startsWith('52')) ||
    (cleaned.length === 13 && cleaned.startsWith('521'));
}

// Validar teléfono fijo (7 o 10 dígitos)
function isValidFijo(phone: string | null): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 7 || cleaned.length === 10;
}

// Formatear para tel: link
function formatTelLink(phone: string | null, isCelular: boolean): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  
  if (isCelular) {
    // Celular: usar formato +52
    if (cleaned.length === 10) {
      return `tel:+52${cleaned}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('52')) {
      return `tel:+${cleaned}`;
    }
  } else {
    // Fijo: usar como está
    return `tel:${cleaned}`;
  }
  
  return null;
}

type EventType = 'WHATSAPP_OPENED' | 'WHATSAPP_COPIED' | 'CALL_STARTED' | 'PHONE_COPIED';
type Channel = 'WHATSAPP' | 'CALL' | 'COPY';

export function ContactActions({
  patientId,
  patientName,
  whatsapp,
  celular,
  telefonoFijo,
  relatedEntityType,
  relatedEntityId,
  size = 'sm',
  showLabels = false,
  onEventLogged,
}: ContactActionsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Determinar números válidos
  const normalizedWhatsapp = normalizeToMX(whatsapp || celular);
  const hasValidWhatsapp = !!normalizedWhatsapp;
  const hasValidCelular = isValidCelular(celular);
  const hasValidFijo = isValidFijo(telefonoFijo);

  // Registrar evento de contacto
  const logContactEvent = async (
    eventType: EventType,
    channel: Channel,
    phoneUsed: string | null
  ) => {
    if (!user?.id) return;

    try {
      await supabase.from('contact_events').insert({
        patient_id: patientId,
        user_id: user.id,
        event_type: eventType,
        channel,
        phone_used: phoneUsed,
        related_entity_type: relatedEntityType || null,
        related_entity_id: relatedEntityId || null,
      });
      
      onEventLogged?.();
    } catch (error) {
      console.error('Error logging contact event:', error);
    }
  };

  // Copiar al portapapeles
  const copyToClipboard = async (text: string, field: string, eventType: EventType, channel: Channel) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      
      toast({
        title: 'Copiado',
        description: `${field} copiado al portapapeles`,
      });
      
      await logContactEvent(eventType, channel, text);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar al portapapeles',
        variant: 'destructive',
      });
    }
  };

  // Abrir WhatsApp
  const openWhatsApp = async () => {
    if (!normalizedWhatsapp) return;
    
    const cleanNumber = normalizedWhatsapp.replace(/\D/g, '');
    const firstName = patientName.split(' ')[0];
    const message = encodeURIComponent(`Hola ${firstName}, `);
    const url = `https://wa.me/${cleanNumber}?text=${message}`;
    
    window.open(url, '_blank', 'noopener,noreferrer');
    
    await logContactEvent('WHATSAPP_OPENED', 'WHATSAPP', normalizedWhatsapp);
    
    toast({
      title: 'WhatsApp abierto',
      description: 'Se abrió WhatsApp en una nueva ventana',
    });
  };

  // Iniciar llamada
  const startCall = async (phone: string, isCelular: boolean) => {
    const telLink = formatTelLink(phone, isCelular);
    if (!telLink) return;
    
    // Abrir enlace tel:
    window.open(telLink, '_self');
    
    await logContactEvent('CALL_STARTED', 'CALL', phone);
    
    toast({
      title: 'Iniciando llamada',
      description: isCelular ? 'Llamando a celular...' : 'Llamando a teléfono fijo...',
    });
  };

  const buttonSize = size === 'sm' ? 'h-8 w-8' : 'h-9';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className="flex justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={!hasValidWhatsapp}
            onClick={openWhatsApp}
            className={`gap-2 ${hasValidWhatsapp ? 'border-green-500/40 text-green-600 hover:text-green-700 hover:bg-green-50' : ''}`}
          >
            <MessageCircle className={iconSize} />
            {showLabels && 'Enviar WhatsApp'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hasValidWhatsapp 
            ? `Enviar WhatsApp a ${normalizedWhatsapp}` 
            : 'Paciente sin WhatsApp registrado'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
