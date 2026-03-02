import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle, MessageCircle, AlertCircle, RefreshCw, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { usePrinterSettings, getPrinterCSS, getPageSize } from '@/hooks/usePrinterSettings';
import { isTouchDevice } from '@/lib/device-detection';
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

interface PaymentThermalTicketProps {
  sale: {
    id: string;
    sale_number: string;
    customer_name: string | null;
    customer_phone?: string | null;
    total: number;
    amount_paid: number;
    balance: number;
    patient_id: string | null;
    patients?: {
      first_name: string;
      last_name: string;
      phone: string | null;
      whatsapp: string | null;
    } | null;
    branches?: {
      name: string;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      colony?: string | null;
      zip_code?: string | null;
      phone?: string | null;
      email?: string | null;
      whatsapp_number?: string | null;
    } | null;
  };
  payment: {
    amount: number;
    newBalance: number;
    newAmountPaid: number;
    method: string;
    paymentNumber: number;
    paymentId?: string;
    isCrossBranch?: boolean;
    saleBranchName?: string;
    paymentBranchName?: string;
  };
  collector: string;
  nextPaymentDate?: string;
  onClose: () => void;
  onReplace?: () => void;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
};

const SEPARATOR = '--------------------------------';

export function PaymentThermalTicket({ 
  sale, 
  payment, 
  collector, 
  nextPaymentDate,
  onClose,
  onReplace
}: PaymentThermalTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { toast } = useToast();
  const { settings } = useCompanySettings();
  const printerSettings = usePrinterSettings();
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const isTouch = isTouchDevice();

  const companyName = settings?.company_name || 'ÓPTICA ISTMEÑA';
  const branch = sale.branches;

  const handleReplacePayment = async () => {
    if (!payment.paymentId || !onReplace) return;
    
    setIsReplacing(true);
    try {
      const { error: deleteError } = await supabase
        .from('credit_payments')
        .delete()
        .eq('id', payment.paymentId);

      if (deleteError) throw deleteError;

      const originalBalance = payment.newBalance + payment.amount;
      const originalAmountPaid = payment.newAmountPaid - payment.amount;

      const { error: updateError } = await supabase
        .from('sales')
        .update({
          balance: originalBalance,
          amount_paid: originalAmountPaid,
          status: originalBalance > 0 ? 'partial' : 'completed',
        })
        .eq('id', sale.id);

      if (updateError) throw updateError;

      toast({
        title: 'Pago anulado',
        description: 'El pago fue anulado. Registra el pago correcto.',
      });

      setShowReplaceDialog(false);
      onReplace();
    } catch (error: any) {
      console.error('Error replacing payment:', error);
      toast({
        title: 'Error al anular pago',
        description: error.message || 'No se pudo anular el pago',
        variant: 'destructive',
      });
    } finally {
      setIsReplacing(false);
    }
  };

  const getPatientName = () => {
    if (sale.patients) {
      return `${sale.patients.first_name} ${sale.patients.last_name}`;
    }
    return sale.customer_name || 'Cliente';
  };

  // Normalizar y detectar celular MX válido para WhatsApp
  const normalizePhone = (phone: string | null | undefined): string | null => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return cleaned;
    if (cleaned.length === 12 && cleaned.startsWith('52')) return cleaned.slice(2);
    if (cleaned.length === 13 && cleaned.startsWith('521')) return cleaned.slice(3);
    return null;
  };

  const getRawPhone = (): string | null => {
    if (sale.patients?.whatsapp) return sale.patients.whatsapp;
    if (sale.patients?.phone) return sale.patients.phone;
    return sale.customer_phone ?? null;
  };

  const rawPhone = getRawPhone();
  const normalizedPhone = normalizePhone(rawPhone);
  const hasWhatsApp = !!normalizedPhone;
  const isFixedLine = !!rawPhone && !normalizedPhone;

  const buildBranchAddress = () => {
    if (!branch) return null;
    const parts = [branch.address, branch.colony, branch.city, branch.state].filter(Boolean);
    if (branch.zip_code) parts.push(`C.P. ${branch.zip_code}`);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const handlePrint = () => {
    const printContent = ticketRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const is58 = printerSettings.paperSize === '58mm';
    const pageSize = getPageSize(printerSettings);
    const printerCSS = getPrinterCSS(printerSettings);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo de Pago ${sale.sale_number}</title>
          <style>
            @page { size: ${is58 ? '58mm auto' : '80mm auto'}; margin: 0; }
            @media print {
              html, body { margin: 0 !important; padding: 0 !important; transform: none !important; zoom: 1 !important; }
            }
            * { box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: ${is58 ? '8pt' : '10pt'};
              width: ${is58 ? '48mm' : '72mm'};
              max-width: ${is58 ? '48mm' : '72mm'};
              margin: 0;
              padding: ${is58 ? '1mm' : '2mm'};
              color: #000;
              overflow-x: hidden;
              word-break: break-word;
              overflow-wrap: anywhere;
            }
            .ticket-center { text-align: center; }
            .ticket-bold { font-weight: bold; }
            .ticket-title { font-size: ${is58 ? '10pt' : '14pt'}; font-weight: 800; }
            .ticket-subtitle { font-size: ${is58 ? '8pt' : '10pt'}; font-weight: 800; margin: 4px 0; }
            .ticket-sm { font-size: ${is58 ? '7pt' : '9pt'}; }
            .ticket-xs { font-size: ${is58 ? '6pt' : '8pt'}; }
            .ticket-sep { text-align: center; margin: 3px 0; letter-spacing: -1px; }
            .ticket-row { display: flex; gap: 4px; }
            .ticket-row span:last-child { word-break: break-word; overflow-wrap: anywhere; }
            .ticket-logo { max-width: ${is58 ? '30mm' : '50mm'}; max-height: ${is58 ? '12mm' : '18mm'}; margin: 0 auto 3px; display: block; ${is58 ? 'filter: grayscale(1) contrast(1.8);' : ''} }
            .ticket-sig { margin-top: 24px; text-align: center; }
            .ticket-sig-line { border-top: 1px solid #000; width: 70%; margin: 0 auto 2px; }
            .ticket-sig-label { font-size: ${is58 ? '8pt' : '9pt'}; color: #000; }
            .ticket-box { border: 2px solid #000; padding: 8px; margin: 8px 0; text-align: center; }
            .ticket-footer-company { font-size: ${is58 ? '9pt' : '10pt'}; font-weight: 800; }
            .ticket-footer-phone { font-size: ${is58 ? '9pt' : '10pt'}; font-weight: 800; }
            .ticket-complaint { font-size: ${is58 ? '8pt' : '9pt'}; font-weight: 700; margin-top: 3px; }
            ${printerCSS}
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    if (!isTouch) {
      printWindow.onafterprint = () => printWindow.close();
    }
  };

  const handleGeneratePdf = async () => {
    const printContent = ticketRef.current;
    if (!printContent) return;

    setIsGeneratingPdf(true);
    try {
      const is58 = printerSettings.paperSize === '58mm';
      const widthPx = is58 ? 181 : 272;
      const printerCSS = getPrinterCSS(printerSettings);

      const container = document.createElement('div');
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:${widthPx}px;background:#fff;`;
      container.innerHTML = `<style>
        * { box-sizing: border-box; margin: 0; padding: 0; color: #000 !important; }
        body, div { font-family: 'Courier New', monospace; font-size: ${is58 ? '8pt' : '10pt'}; }
        ${printerCSS}
      </style>${printContent.innerHTML}`;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 3,
        width: widthPx,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(container);

      const paperWidthMm = is58 ? 58 : 80;
      const imgRatio = canvas.height / canvas.width;
      const pageHeightMm = paperWidthMm * imgRatio;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [paperWidthMm, pageHeightMm],
      });

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, paperWidthMm, pageHeightMm);
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl.toString(), '_blank');

      toast({ title: 'PDF generado', description: 'El recibo se abrió como PDF.' });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error al generar PDF', description: error.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!normalizedPhone) return;

    const formattedPhone = `52${normalizedPhone}`;

    try {
      if (sale.patient_id) {
        await supabase.from('contact_events').insert({
          patient_id: sale.patient_id,
          user_id: profile?.userId || '',
          event_type: 'WHATSAPP_OPENED',
          channel: 'whatsapp',
          phone_used: formattedPhone,
          related_entity_type: 'sale',
          related_entity_id: sale.id,
        });
      }
    } catch (error) {
      console.error('Error logging WhatsApp event:', error);
    }

    const nextPaymentText = nextPaymentDate 
      ? format(new Date(nextPaymentDate), 'dd/MM/yyyy', { locale: es })
      : 'Por confirmar';

    const message = encodeURIComponent(
      `Hola ${getPatientName()}, te compartimos tu comprobante de pago:\n\n` +
      `📋 Folio: ${sale.sale_number}\n` +
      `💰 Total compra: $${Number(sale.total).toFixed(2)}\n` +
      `✅ Pago de hoy: $${payment.amount.toFixed(2)}\n` +
      `📊 Total abonado: $${payment.newAmountPaid.toFixed(2)}\n` +
      `📌 Saldo restante: $${payment.newBalance.toFixed(2)}\n` +
      (payment.newBalance > 0 ? `📅 Próximo pago: ${nextPaymentText}\n\n` : '\n🎉 ¡Crédito liquidado!\n\n') +
      `Gracias por su preferencia.${settings?.slogan ? ` ${settings.slogan}` : ''}\n${companyName} (${branch?.name || 'Sucursal'})`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
        <p className="font-medium text-green-800 dark:text-green-200">
          Pago registrado correctamente
        </p>
        <p className="text-sm text-green-600 dark:text-green-400">
          Abono #{payment.paymentNumber} por ${payment.amount.toFixed(2)}
        </p>
      </div>

      {/* Ticket Preview */}
      <div
        ref={ticketRef}
        className="bg-white p-3 sm:p-4 font-mono text-[10px] sm:text-xs border rounded-lg w-full max-w-[300px] mx-auto text-black overflow-hidden"
        style={{ width: 'min(80mm, 100%)' }}
      >
        {/* === ENCABEZADO === */}
        <div className="text-center mb-2">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="mx-auto mb-1 max-w-[120px] max-h-[60px] ticket-logo" />
          )}
          <div className="text-lg font-extrabold">{companyName}</div>
          {settings?.slogan && <div className="text-[9px] font-bold">{settings.slogan}</div>}
        </div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        <div className="text-center font-bold text-sm my-1">RECIBO DE PAGO</div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        {/* === DATOS PRINCIPALES === */}
        <div className="space-y-0.5 my-1">
          <div className="flex gap-1">
            <span className="shrink-0">Paciente:</span>
            <span className="font-bold truncate">{getPatientName()}</span>
          </div>
          <div className="flex gap-1">
            <span className="shrink-0">Folio:</span>
            <span className="font-bold">{sale.sale_number}</span>
          </div>
          <div className="flex gap-1">
            <span className="shrink-0">Abono No.:</span>
            <span className="font-bold">{payment.paymentNumber}</span>
          </div>
          <div className="flex gap-1">
            <span className="shrink-0">Atendió:</span>
            <span>{collector}</span>
          </div>
          <div className="flex gap-1">
            <span className="shrink-0">Fecha:</span>
            <span>{format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
          </div>
          {branch && (
            <div className="flex gap-1">
              <span className="shrink-0">Sucursal:</span>
              <span>{branch.name}</span>
            </div>
          )}
          {payment.isCrossBranch && (
            <>
              <div className="flex gap-1 font-bold">
                <span className="shrink-0">Venta origen:</span>
                <span>{payment.saleBranchName}</span>
              </div>
              <div className="flex gap-1 font-bold">
                <span className="shrink-0">Cobrado en:</span>
                <span>{payment.paymentBranchName}</span>
              </div>
            </>
          )}
        </div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        {/* === DETALLE DEL PAGO === */}
        <div className="font-bold text-center my-1">DETALLE DEL PAGO</div>

        {/* Monto pagado destacado */}
        <div className="border-2 border-black p-2 my-2 text-center">
          <div className="text-[9px]">MONTO PAGADO</div>
          <div className="text-lg font-bold">${payment.amount.toFixed(2)}</div>
          <div className="text-[9px] mt-0.5">
            Método: {paymentMethodLabels[payment.method] || payment.method}
          </div>
        </div>

        <div className="space-y-0.5 my-1">
          <div className="flex gap-1">
            <span className="shrink-0">Monto Original:</span>
            <span>${Number(sale.total).toFixed(2)}</span>
          </div>
          <div className="flex gap-1">
            <span className="shrink-0">Total Abonado:</span>
            <span className="font-bold">${payment.newAmountPaid.toFixed(2)}</span>
          </div>
          <div className="flex gap-1 font-bold">
            <span className="shrink-0">Saldo Pendiente:</span>
            <span>${payment.newBalance.toFixed(2)}</span>
          </div>
          {payment.newBalance > 0 && nextPaymentDate && (
            <div className="flex gap-1">
              <span className="shrink-0">Próximo cobro:</span>
              <span className="font-bold">{format(new Date(nextPaymentDate), 'dd/MM/yyyy', { locale: es })}</span>
            </div>
          )}
        </div>

        {payment.newBalance === 0 && (
          <>
            <div className="text-center text-[9px]">{SEPARATOR}</div>
            <div className="text-center font-bold my-1">*** CRÉDITO LIQUIDADO ***</div>
          </>
        )}

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        {/* === FIRMAS === */}
        <div className="mt-6 space-y-5">
          <div className="text-center">
            <div className="border-t border-black w-[70%] mx-auto mb-0.5" />
            <span className="text-[9px]">Firma del Cliente</span>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-[70%] mx-auto mb-0.5" />
            <span className="text-[9px]">Firma del Cobrador</span>
          </div>
        </div>

        <div className="text-center text-[9px] mt-2">{SEPARATOR}</div>

        {/* === PIE: DATOS SUCURSAL === */}
        <div className="text-center mt-1 space-y-0.5">
          <div className="font-extrabold text-[11px]">{companyName}</div>
          {branch?.name && <div className="text-[9px]">{branch.name}</div>}
          {buildBranchAddress() && <div className="text-[9px]">{buildBranchAddress()}</div>}
          {(branch?.email || settings?.email) && <div className="text-[9px]">{branch?.email || settings?.email}</div>}
          {settings?.rfc && <div className="text-[9px]">RFC: {settings.rfc}</div>}
          <div className="mt-1 font-semibold text-[9px]">¡Gracias por su preferencia!</div>
          <div className="font-extrabold text-[9px] mt-1 tracking-tight">QUEJAS Y ACLARACIONES</div>
          {(branch?.phone || settings?.phone) && <div className="font-bold text-[9px]">Tel: {branch?.phone || settings?.phone}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-4" onClick={isTouch ? handleGeneratePdf : handlePrint} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0 animate-spin" />
            ) : isTouch ? (
              <FileText className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
            ) : (
              <Printer className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
            )}
            <span className="truncate">{isTouch ? 'Abrir PDF' : 'Imprimir Ticket'}</span>
          </Button>
          <Button
            type="button"
            variant="outline" 
            className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-4"
            onClick={handleWhatsApp}
            disabled={!hasWhatsApp}
            title={!hasWhatsApp ? 'Paciente sin WhatsApp registrado' : 'Enviar ticket por WhatsApp'}
          >
            <MessageCircle className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="truncate">Enviar WhatsApp</span>
          </Button>
        </div>
        
        {!hasWhatsApp && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <AlertCircle className="h-4 w-4" />
            <span>{isFixedLine ? 'El número registrado es fijo, no WhatsApp' : 'Paciente sin WhatsApp registrado'}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 min-w-0 text-xs sm:text-sm px-2 sm:px-4">
            <CheckCircle className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="truncate">Finalizar</span>
          </Button>
          {onReplace && payment.paymentId && (
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setShowReplaceDialog(true)}
              className="flex-1 min-w-0 text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700 text-xs sm:text-sm px-2 sm:px-4"
            >
              <RefreshCw className="h-4 w-4 mr-1.5 sm:mr-2 shrink-0" />
              <span className="truncate">Reemplazar Pago</span>
            </Button>
          )}
        </div>
      </div>

      {/* Replace Payment Confirmation Dialog */}
      <AlertDialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reemplazar este pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Se anulará el pago de <strong>${payment.amount.toFixed(2)}</strong> y se abrirá 
              el formulario para registrar el pago correcto. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReplacing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReplacePayment}
              disabled={isReplacing}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isReplacing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Anulando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sí, reemplazar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
