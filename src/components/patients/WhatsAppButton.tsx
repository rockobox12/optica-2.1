import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { MessageCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WhatsAppButtonProps {
  patientName: string;
  patientId: string;
  whatsapp: string | null;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

// Message templates
const MESSAGE_TEMPLATES = [
  {
    id: 'confirm_appointment',
    label: 'Confirmar cita',
    template: 'Hola {nombre}, somos Óptica Istmeña. Queremos confirmar tu cita.',
  },
  {
    id: 'glasses_ready',
    label: 'Lentes listos',
    template: 'Hola {nombre}, tus lentes ya están listos para entrega. Te esperamos en Óptica Istmeña.',
  },
  {
    id: 'visual_reminder',
    label: 'Recordatorio de revisión',
    template: 'Hola {nombre}, te recordamos tu próxima revisión visual. Agenda tu cita en Óptica Istmeña.',
  },
  {
    id: 'custom',
    label: 'Mensaje personalizado',
    template: 'Hola {nombre}, ',
  },
];

// Normalize phone number to Mexican format
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 52, it's already with country code
  if (cleaned.startsWith('52')) {
    cleaned = cleaned.substring(2);
  }
  
  // If starts with 1, remove (old format)
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }
  
  // Mexican mobile numbers are 10 digits
  if (cleaned.length === 10) {
    return `52${cleaned}`;
  }
  
  // Return as-is if doesn't match expected format
  return cleaned;
}

export function WhatsAppButton({
  patientName,
  patientId,
  whatsapp,
  disabled = false,
  variant = 'outline',
  size = 'sm',
}: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [message, setMessage] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const hasWhatsApp = !!whatsapp;

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      // Replace {nombre} with actual patient name
      const firstName = patientName.split(' ')[0];
      const personalizedMessage = template.template.replace('{nombre}', firstName);
      setMessage(personalizedMessage);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!whatsapp) return;

    const normalizedPhone = normalizePhoneNumber(whatsapp);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;

    // Log the action (soft audit)
    try {
      console.log('[WhatsApp Audit]', {
        patient_id: patientId,
        user_id: user?.id,
        template_used: selectedTemplate || 'custom',
        timestamp: new Date().toISOString(),
      });
      
      // Note: We don't log the actual message content for privacy
    } catch (error) {
      console.error('Error logging WhatsApp action:', error);
    }

    // Open WhatsApp
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    toast({
      title: 'WhatsApp abierto',
      description: 'Se ha abierto WhatsApp en una nueva ventana',
    });

    setIsOpen(false);
    setSelectedTemplate('');
    setMessage('');
  };

  if (!hasWhatsApp) {
    return (
      <Button variant="ghost" size={size} disabled className="gap-2 text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        Sin WhatsApp
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled} className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Enviar WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Enviar mensaje a {patientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Número de WhatsApp</Label>
            <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
              {whatsapp}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plantilla de mensaje</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una plantilla" />
              </SelectTrigger>
              <SelectContent>
                {MESSAGE_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.label}
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
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Puedes editar el mensaje antes de enviarlo
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
  );
}

// Validar formato WhatsApp México
function validateWhatsAppMX(phone: string): { valid: boolean; error?: string; normalized?: string } {
  if (!phone || !phone.trim()) return { valid: true }; // Optional
  
  const cleaned = phone.replace(/\D/g, '');
  
  // 10 dígitos (nacional)
  if (cleaned.length === 10) {
    return { valid: true, normalized: `+52${cleaned}` };
  }
  // 12 dígitos con prefijo 52
  if (cleaned.length === 12 && cleaned.startsWith('52')) {
    return { valid: true, normalized: `+${cleaned}` };
  }
  // 13 dígitos con prefijo 521 (formato viejo)
  if (cleaned.length === 13 && cleaned.startsWith('521')) {
    return { valid: true, normalized: `+52${cleaned.slice(3)}` };
  }
  
  return { 
    valid: false, 
    error: 'Ingresa 10 dígitos (ej: 9511234567) o con prefijo +52' 
  };
}

// Input component for WhatsApp field in forms
interface WhatsAppInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean, error?: string) => void;
}

export function WhatsAppInput({ value, onChange, onValidationChange }: WhatsAppInputProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // Allow only numbers, + and spaces for display
    input = input.replace(/[^\d+\s-]/g, '');
    onChange(input);
    
    // Clear error while typing
    if (localError) {
      setLocalError(null);
      onValidationChange?.(true);
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (!value || !value.trim()) {
      setLocalError(null);
      onValidationChange?.(true);
      return;
    }
    
    const validation = validateWhatsAppMX(value);
    
    if (!validation.valid) {
      setLocalError(validation.error || 'Número inválido');
      onValidationChange?.(false, validation.error);
    } else {
      setLocalError(null);
      onValidationChange?.(true);
      
      // Format nicely for display
      const cleaned = value.replace(/\D/g, '');
      let digits = cleaned;
      if (cleaned.startsWith('52')) {
        digits = cleaned.slice(2);
      } else if (cleaned.startsWith('521') && cleaned.length === 13) {
        digits = cleaned.slice(3);
      }
      
      if (digits.length === 10) {
        onChange(`+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`);
      }
    }
  };

  const hasError = touched && localError;

  return (
    <div className="space-y-2">
      <div className="relative">
        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="+52 951 123 4567"
          className={`flex h-10 w-full rounded-md border bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
            hasError ? 'border-destructive' : 'border-input'
          }`}
        />
      </div>
      {hasError && <p className="text-xs text-destructive">{localError}</p>}
      <p className="text-xs text-muted-foreground">
        Formato: 10 dígitos o +52 XXX XXX XXXX
      </p>
    </div>
  );
}
