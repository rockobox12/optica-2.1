import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing, MessageCircle, ExternalLink, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { PatientCreditStatus } from '@/hooks/usePatientCreditStatus';

interface PaymentReminderButtonProps {
  patientId: string;
  patientName: string;
  patientWhatsapp: string | null;
  patientMobile: string | null;
  patientOptedIn?: boolean;
  creditStatus: PatientCreditStatus;
  branchName?: string;
  compact?: boolean;
}

export function PaymentReminderButton({
  patientId,
  patientName,
  patientWhatsapp,
  patientMobile,
  patientOptedIn = true,
  creditStatus,
  branchName = 'Óptica Istmeña',
  compact = false,
}: PaymentReminderButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const phone = patientWhatsapp || patientMobile;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const normalizePhone = (p: string) => {
    let normalized = p.replace(/\D/g, '');
    if (normalized.length === 10) normalized = '52' + normalized;
    if (!normalized.startsWith('52')) normalized = '52' + normalized;
    return normalized;
  };

  const buildMessage = useCallback(() => {
    const saldo = `$${creditStatus.saldoPendienteTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    return `Hola ${patientName}, te recordamos tu saldo pendiente de ${saldo}. Tu próximo pago estaba programado para ${formatDate(creditStatus.nextPaymentDate)}. ¿Gustas realizar tu abono hoy? Responde para apoyarte. — ${branchName}`;
  }, [creditStatus, patientName, branchName]);

  const handleSendManual = useCallback(async () => {
    if (!phone) return;
    setSending(true);
    try {
      const message = buildMessage();
      const normalizedPhone = normalizePhone(phone);

      // Log the reminder
      await supabase.from('payment_reminder_log').insert({
        patient_id: patientId,
        saldo_pendiente: creditStatus.saldoPendienteTotal,
        dias_sin_pago: creditStatus.diasAtraso,
        channel: 'whatsapp',
        status: 'sent',
        message_content: message,
        sent_by: user?.id,
        sent_at: new Date().toISOString(),
      });

      // Open WhatsApp via wa.me
      const encodedMessage = encodeURIComponent(message);
      const waUrl = `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');

      toast({
        title: 'Recordatorio preparado',
        description: 'Se abrió WhatsApp con el mensaje. Envíalo manualmente.',
      });
    } catch (err) {
      console.error('Error sending reminder:', err);
      toast({
        title: 'Error',
        description: 'No se pudo preparar el recordatorio',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }, [patientId, phone, creditStatus, user?.id, buildMessage, toast]);

  // Don't render if no balance or no phone
  if (creditStatus.saldoPendienteTotal <= 0 || !phone) return null;

  // Opt-out check
  if (!patientOptedIn) {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-muted-foreground">
        <Ban className="h-3 w-3" />
        Opt-out WhatsApp
      </Badge>
    );
  }

  if (compact) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1 text-xs"
        onClick={handleSendManual}
        disabled={sending}
      >
        <BellRing className="h-3 w-3" />
        Recordar pago
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={handleSendManual}
      disabled={sending}
    >
      <MessageCircle className="h-4 w-4" />
      {sending ? 'Preparando...' : 'Enviar recordatorio'}
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </Button>
  );
}
