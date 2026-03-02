import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, MessageCircle, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { usePrinterSettings, getPrinterCSS, getPageSize } from '@/hooks/usePrinterSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { isTouchDevice } from '@/lib/device-detection';
import type { CartItem, PaymentInfo, CustomerInfo } from '@/hooks/useOfflineSync';
import type { CreatedPlan } from './CreditPaymentPlanModal';

interface ThermalTicketProps {
  sale: {
    sale_number?: string;
    id?: string;
    created_at?: string;
    total?: number;
    subtotal?: number;
    discount_amount?: number;
    amount_paid?: number;
    balance?: number;
    is_credit?: boolean;
    offline?: boolean;
    patient_id?: string | null;
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
  items: CartItem[];
  payments: PaymentInfo[];
  customer: CustomerInfo | null;
  paymentPlan?: CreatedPlan | null;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  check: 'Cheque',
  credit: 'Crédito',
};

const SEPARATOR = '--------------------------------';

export function ThermalTicket({ sale, items, payments, customer, paymentPlan }: ThermalTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const { settings } = useCompanySettings();
  const printerSettings = usePrinterSettings();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const isMobileDevice = isTouchDevice();

  // Fetch installments for the payment plan
  const [installments, setInstallments] = useState<Array<{ installment_number: number; due_date: string; amount: number; status: string }>>([]);
  useEffect(() => {
    if (!paymentPlan?.id) { setInstallments([]); return; }
    supabase
      .from('payment_plan_installments')
      .select('installment_number, due_date, amount, status')
      .eq('payment_plan_id', paymentPlan.id)
      .order('installment_number')
      .then(({ data }) => setInstallments(data || []));
  }, [paymentPlan?.id]);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const total = sale.total || subtotal - (sale.discount_amount || 0);
  const balance = sale.balance ?? (total - totalPaid);
  const companyName = settings?.company_name || 'ÓPTICA ISTMEÑA';
  const branch = sale.branches;

  const is58 = printerSettings.paperSize === '58mm';
  const ticketWidth = is58 ? '48mm' : '80mm';
  const pageSize = getPageSize(printerSettings);
  const printerCSS = getPrinterCSS(printerSettings);

  // Normalizar y detectar celular MX válido para WhatsApp
  const normalizePhone = (phone: string | null | undefined): string | null => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return cleaned;
    if (cleaned.length === 12 && cleaned.startsWith('52')) return cleaned.slice(2);
    if (cleaned.length === 13 && cleaned.startsWith('521')) return cleaned.slice(3);
    return null;
  };

  const getCustomerPhone = (): string | null => {
    if (!customer) return null;
    return (customer as any).whatsapp || customer.phone || (customer as any).celular || null;
  };

  const rawPhone = getCustomerPhone();
  const normalizedPhone = normalizePhone(rawPhone);
  const hasWhatsApp = !!normalizedPhone;
  const isFixedLine = !!rawPhone && !normalizedPhone;

  const buildBranchAddress = () => {
    if (!branch) return null;
    const parts = [branch.address, branch.colony, branch.city, branch.state].filter(Boolean);
    if (branch.zip_code) parts.push(`C.P. ${branch.zip_code}`);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Convert an image URL to base64 for reliable print embedding
  const toBase64 = async (url: string): Promise<string | null> => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const buildPrintHtml = async () => {
    let logoDataUrl: string | null = null;
    if (settings?.logo_url) {
      logoDataUrl = await toBase64(settings.logo_url);
    }

    const branchAddr = buildBranchAddress();
    const dateStr = format(new Date(sale.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: es });
    const sep = '<div class="sep"></div>';
    const logoHtml = logoDataUrl ? `<img src="${logoDataUrl}" class="logo" />` : '';
    const itemsHtml = items.map(i =>
      `<div class="item">• ${i.productName}${i.quantity > 1 ? ` (x${i.quantity})` : ''}</div>`
    ).join('');
    const paymentsHtml = payments.map(p =>
      `<div class="row"><span>${paymentMethodLabels[p.method] || p.method}:</span><span>$${p.amount.toFixed(2)}</span></div>`
    ).join('');

    let creditHtml = '';
    if (sale.is_credit) {
      creditHtml += `${sep}<div class="section-title">*** VENTA A CRÉDITO ***</div>`;
      if (paymentPlan) {
        creditHtml += `${sep}<div class="section-title">PLAN DE PAGO</div>`;
        creditHtml += `
          <div class="row"><span>Enganche:</span><span class="bold">$${paymentPlan.downPayment.toFixed(2)}</span></div>
          <div class="row"><span>Saldo financiado:</span><span class="bold">$${paymentPlan.totalFinanced.toFixed(2)}</span></div>
          <div class="row"><span>Próximo pago:</span><span>${format(new Date(paymentPlan.firstPaymentDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}</span></div>
          <div class="row"><span>Monto cuota:</span><span class="bold">$${paymentPlan.installmentAmount.toFixed(2)}</span></div>
          <div class="row"><span>Total pagos:</span><span>${paymentPlan.installments}</span></div>
          <div class="row"><span>Frecuencia:</span><span>${paymentPlan.frequency}</span></div>
        `;
        if (installments.length > 0) {
          creditHtml += `
            <table>
              <thead><tr><th>No.</th><th>Fecha</th><th class="th-right">Monto</th><th class="th-center hide-58">Estado</th></tr></thead>
              <tbody>
                ${installments.map(inst => `
                  <tr><td>${inst.installment_number}</td><td>${format(new Date(inst.due_date + 'T12:00:00'), 'dd/MM/yy')}</td><td class="td-right">$${inst.amount.toFixed(2)}</td><td class="td-center hide-58">${inst.status === 'paid' ? '✓' : '—'}</td></tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
      }
    }

    const offlineHtml = sale.offline ? `${sep}<div class="section-title">** OFFLINE - PENDIENTE **</div>` : '';

    const bodyW = is58 ? '48mm' : '72mm';
    const bodyPad = is58 ? '1mm' : '2mm 3mm';
    const logoMax = is58 ? '30mm' : '200px';
    const logoH = is58 ? '12mm' : '70px';
    const baseFontSize = is58 ? '8pt' : '10pt';
    const companyFontSize = is58 ? '10pt' : '14pt';
    const totalFontSize = is58 ? '9pt' : '11pt';

    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: Arial, sans-serif;
        font-size: ${baseFontSize};
        line-height: 1.2;
        color: #000;
        width: ${bodyW};
        max-width: ${bodyW};
        margin: 0;
        padding: ${bodyPad};
        background: #fff;
        overflow-x: hidden;
        word-break: break-word;
        overflow-wrap: anywhere;
        white-space: normal;
      }
      .logo { display: block; margin: 0 auto 3px; max-width: ${logoMax}; max-height: ${logoH}; width: auto; height: auto; object-fit: contain; }
      .fallback-name { font-size: ${companyFontSize}; font-weight: 800; text-align: center; }
      .center { text-align: center; }
      .bold { font-weight: 700; }
      .company { font-size: ${companyFontSize}; font-weight: 800; }
      .slogan { font-size: ${is58 ? '8pt' : '9pt'}; font-weight: 700; color: #000; margin-bottom: 2px; }
      .sep { border-top: 1px dashed #000; margin: ${is58 ? '2px 0' : '5px 0'}; }
      .section-title { text-align: center; font-weight: 700; font-size: ${is58 ? '8pt' : '9pt'}; margin: 2px 0; text-transform: uppercase; }
      .row { display: flex; padding: 1px 0; font-size: ${baseFontSize}; gap: 2px; }
      .row span:first-child { flex-shrink: 0; white-space: nowrap; }
      .row-total { text-align: center; font-weight: 700; font-size: ${totalFontSize}; padding: 2px 0; }
      .item { padding: 1px 0; font-size: ${is58 ? '8pt' : '9pt'}; word-break: break-word; }
      .sig-block { text-align: center; margin-top: ${is58 ? '12px' : '22px'}; }
      .sig-line { border-top: 1px solid #000; width: 70%; margin: 0 auto 2px; }
      .sig-label { font-size: ${is58 ? '8pt' : '9pt'}; color: #000; }
      .footer { text-align: center; font-size: ${is58 ? '8pt' : '9pt'}; margin-top: 4px; padding-top: 3px; border-top: 1px dashed #000; color: #000; }
      .footer .company-name { font-size: ${is58 ? '10pt' : '11pt'}; font-weight: 800; color: #000; }
      .footer .complaint-title { font-size: 8pt; font-weight: 800; color: #000; margin-top: 3px; text-transform: uppercase; text-align: center; }
      .footer .complaint-phone { font-size: 9pt; font-weight: 700; color: #000; }
      table { width: 100%; border-collapse: collapse; margin-top: 3px; font-size: ${is58 ? '7pt' : '9pt'}; }
      th { text-align: left; padding: 1px; border-bottom: 1px solid #000; font-weight: 700; }
      td { padding: 1px; border-bottom: 1px dashed #ccc; }
      .td-right, .th-right { text-align: right; }
      .td-center, .th-center { text-align: center; }
      ${is58 ? '.hide-58 { display: none; }' : ''}
    `;

    const bodyHtml = `
      <div class="center">
        ${logoHtml || `<div class="fallback-name">${companyName}</div>`}
        ${logoHtml ? `<div class="company">${companyName}</div>` : ''}
        ${settings?.slogan ? `<div class="slogan">${settings.slogan}</div>` : ''}
      </div>
      ${sep}
      <div class="section-title">${sale.is_credit ? 'TICKET DE COMPRA (CRÉDITO)' : 'TICKET DE COMPRA'}</div>
      ${sep}
      ${customer ? `<div class="row"><span>Paciente:</span><span class="bold">${customer.name}</span></div>` : ''}
      <div class="row"><span>Folio:</span><span class="bold">${sale.sale_number || sale.id?.slice(0, 8)}</span></div>
      <div class="row"><span>Atendió:</span><span>${profile?.fullName || 'N/A'}</span></div>
      <div class="row"><span>Fecha:</span><span>${dateStr}</span></div>
      ${branch ? `<div class="row"><span>Sucursal:</span><span>${branch.name}</span></div>` : ''}
      ${sep}
      <div class="section-title">PRODUCTOS ADQUIRIDOS</div>
      ${itemsHtml}
      ${sep}
      <div class="row-total">TOTAL: $${total.toFixed(2)}</div>
      ${sep}
      ${paymentsHtml}
      <div class="row bold"><span>Pagado:</span><span>$${totalPaid.toFixed(2)}</span></div>
      ${totalPaid > total ? `<div class="row"><span>Cambio:</span><span>$${(totalPaid - total).toFixed(2)}</span></div>` : ''}
      ${sale.is_credit && balance > 0 ? `<div class="row bold"><span>Restante:</span><span>$${balance.toFixed(2)}</span></div>` : ''}
      ${creditHtml}
      ${offlineHtml}
      ${sep}
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Firma del Cliente</div></div>
      <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Firma del Responsable</div></div>
      <div class="footer">
        <div class="company-name">${companyName}</div>
        ${branch?.name ? `<div>${branch.name}</div>` : ''}
        ${branchAddr ? `<div>${branchAddr}</div>` : ''}
        ${(branch?.email || settings?.email) ? `<div>${branch?.email || settings?.email}</div>` : ''}
        ${settings?.rfc ? `<div>RFC: ${settings.rfc}</div>` : ''}
        <div style="margin-top:3px;font-weight:700;">¡Gracias por su preferencia!</div>
        <div class="complaint-title">QUEJAS Y ACLARACIONES</div>
        ${(branch?.phone || settings?.phone) ? `<div class="complaint-phone">Tel: ${branch?.phone || settings?.phone}</div>` : ''}
      </div>
    `;

    return { css, bodyHtml };
  };

  const handleGeneratePdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const { css, bodyHtml } = await buildPrintHtml();

      // Create an off-screen container with the exact thermal dimensions
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.zIndex = '-1';

      const widthPx = is58 ? 181 : 272; // 48mm ≈ 181px / 72mm ≈ 272px at 96dpi
      container.style.width = `${widthPx}px`;
      container.style.background = '#fff';

      const shadowRoot = container.attachShadow ? undefined : undefined;
      container.innerHTML = `<style>${css} body { width: ${widthPx}px; max-width: ${widthPx}px; }</style><div style="width:${widthPx}px;max-width:${widthPx}px;padding:${is58 ? '2px' : '4px 6px'};font-family:Arial,sans-serif;font-size:${is58 ? '8pt' : '10pt'};line-height:1.2;color:#000;background:#fff;">${bodyHtml}</div>`;

      document.body.appendChild(container);

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 300));

      const targetEl = container.querySelector('div') as HTMLElement;
      const canvas = await html2canvas(targetEl || container, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: widthPx,
      });

      document.body.removeChild(container);

      // Create PDF matching thermal paper dimensions
      const paperWidthMm = is58 ? 58 : 80;
      const printableWidthMm = is58 ? 48 : 72;
      const marginMm = (paperWidthMm - printableWidthMm) / 2;
      const contentHeightMm = (canvas.height * printableWidthMm) / canvas.width;
      const pageHeightMm = contentHeightMm + marginMm * 2 + 4;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [paperWidthMm, pageHeightMm],
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', marginMm, marginMm, printableWidthMm, contentHeightMm);

      const blobUrl = pdf.output('bloburl');
      const opened = window.open(blobUrl as unknown as string, '_blank', 'noopener,noreferrer');
      if (!opened) {
        pdf.save(`ticket-${sale.sale_number || sale.id?.slice(0, 8) || Date.now()}.pdf`);
      }

      toast({
        title: 'PDF generado',
        description: 'Abre el PDF e imprímelo desde tu celular.',
      });
    } catch (error) {
      console.error('Error generating ticket PDF:', error);
      toast({
        title: 'Error al generar PDF',
        description: 'No se pudo generar el PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = async () => {
    const { css, bodyHtml } = await buildPrintHtml();
    const paperW = is58 ? '58mm' : '80mm';
    const bodyW = is58 ? '48mm' : '72mm';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Ticket ${sale.sale_number || sale.id}</title>
<style>
  @page { size: ${paperW} auto; margin: 0; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; transform: none !important; zoom: 1 !important; }
    body { width: ${bodyW} !important; max-width: ${bodyW} !important; }
  }
  ${css}
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; transform: none; zoom: 1; }
</style></head>
<body>${bodyHtml}</body></html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      if (!isMobileDevice) {
        printWindow.onafterprint = () => printWindow.close();
      }
    }, 350);
  };

  const handleWhatsApp = async () => {
    if (!normalizedPhone) return;

    const formattedPhone = `52${normalizedPhone}`;

    try {
      if (sale.patient_id || (customer as any)?.id) {
        await supabase.from('contact_events').insert({
          patient_id: sale.patient_id || (customer as any)?.id || '',
          user_id: profile?.userId || '',
          event_type: 'WHATSAPP_OPENED',
          channel: 'whatsapp',
          phone_used: formattedPhone,
          related_entity_type: 'sale',
          related_entity_id: sale.id || null,
        });
      }
    } catch (error) {
      console.error('Error logging WhatsApp event:', error);
    }

    const sloganLine = settings?.slogan ? ` ${settings.slogan}` : '';
    const creditLine = sale.is_credit && balance > 0
      ? `\n📌 Restante: $${balance.toFixed(2)}\n💳 VENTA A CRÉDITO`
      : '';

    const productList = items.map(i => `• ${i.productName}`).join('\n');

    const message = encodeURIComponent(
      `Hola ${customer?.name || 'estimado cliente'}, te compartimos tu ticket de compra:\n\n` +
      `📋 Folio: ${sale.sale_number || sale.id?.slice(0, 8)}\n\n` +
      `Productos adquiridos:\n${productList}\n\n` +
      `💰 Total: $${total.toFixed(2)}\n` +
      `✅ Pagado: $${totalPaid.toFixed(2)}` +
      creditLine + `\n` +
      `🏪 Sucursal: ${branch?.name || companyName}\n\n` +
      `Gracias por su preferencia.${sloganLine}\n${companyName}`
    );

    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank', 'noopener,noreferrer');

    toast({
      title: 'WhatsApp listo para enviar',
      description: 'Se abrió WhatsApp con el resumen del ticket.',
    });
  };

  return (
    <div className="space-y-4">
      {/* Ticket Preview */}
      <div
        ref={ticketRef}
        className="bg-white p-4 font-mono text-xs border rounded-lg mx-auto text-black"
        style={{ width: ticketWidth, maxWidth: '300px' }}
      >
        {/* === ENCABEZADO === */}
        <div className="text-center mb-2">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="mx-auto mb-1 ticket-logo" style={{ maxWidth: is58 ? '140px' : '120px', maxHeight: is58 ? '40px' : '60px' }} />
          )}
          <div className={`font-extrabold ${is58 ? 'text-base' : 'text-lg'}`}>{companyName}</div>
          {settings?.slogan && <div className="text-[9px] font-bold">{settings.slogan}</div>}
        </div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        <div className={`text-center font-bold my-1 ${is58 ? 'text-xs' : 'text-sm'}`}>
          {sale.is_credit ? 'TICKET DE COMPRA (CRÉDITO)' : 'TICKET DE COMPRA'}
        </div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        {/* === DATOS PRINCIPALES === */}
        <div className="space-y-0.5 my-1">
          {customer && (
            <div className="flex gap-1">
              <span className="shrink-0">Paciente:</span>
              <span className="font-bold truncate">{customer.name}</span>
            </div>
          )}
          <div className="flex gap-1">
            <span className="shrink-0">Folio:</span>
            <span className="font-bold">{sale.sale_number || sale.id?.slice(0, 8)}</span>
          </div>
          <div className="flex gap-1">
            <span className="shrink-0">Atendió:</span>
            <span>{profile?.fullName || 'N/A'}</span>
          </div>
          <div className="flex gap-1">
            <span className="shrink-0">Fecha:</span>
            <span>{format(new Date(sale.created_at || new Date()), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
          </div>
          {branch && (
            <div className="flex gap-1">
              <span className="shrink-0">Sucursal:</span>
              <span>{branch.name}</span>
            </div>
          )}
        </div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        {/* === ARTÍCULOS === */}
        <div className="font-bold text-center my-1">PRODUCTOS ADQUIRIDOS</div>
        <div className="space-y-0.5">
          {items.map((item, index) => (
            <div key={index} className="truncate">
              • {item.productName}{item.quantity > 1 ? ` (x${item.quantity})` : ''}
            </div>
          ))}
        </div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        {/* === TOTALES === */}
        <div className="space-y-0.5 my-1">
          <div className="text-center font-bold text-sm">
            TOTAL: ${total.toFixed(2)}
          </div>
        </div>

        <div className="text-center text-[9px]">{SEPARATOR}</div>

        {/* === PAGOS === */}
        <div className="space-y-0.5 my-1">
          {payments.map((payment, index) => (
            <div key={index} className="flex justify-between">
              <span>{paymentMethodLabels[payment.method] || payment.method}:</span>
              <span>${payment.amount.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold">
            <span>Pagado:</span>
            <span>${totalPaid.toFixed(2)}</span>
          </div>
          {totalPaid > total && (
            <div className="flex justify-between">
              <span>Cambio:</span>
              <span>${(totalPaid - total).toFixed(2)}</span>
            </div>
          )}
          {sale.is_credit && balance > 0 && (
            <div className="flex justify-between font-bold">
              <span>Restante:</span>
              <span>${balance.toFixed(2)}</span>
            </div>
          )}
        </div>

        {sale.is_credit && (
          <>
            <div className="text-center text-[9px]">{SEPARATOR}</div>
            <div className="text-center font-bold my-1">*** VENTA A CRÉDITO ***</div>
            {paymentPlan && (
              <>
                <div className="text-center text-[9px]">{SEPARATOR}</div>
                <div className="text-center font-bold my-1">PLAN DE PAGO</div>
                <div className="space-y-0.5">
                  <div className="flex justify-between">
                    <span>Enganche:</span>
                    <span className="font-bold">${paymentPlan.downPayment.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saldo financiado:</span>
                    <span className="font-bold">${paymentPlan.totalFinanced.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Próximo pago:</span>
                    <span>{format(new Date(paymentPlan.firstPaymentDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: es })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monto cuota:</span>
                    <span className="font-bold">${paymentPlan.installmentAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total pagos:</span>
                    <span>{paymentPlan.installments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Frecuencia:</span>
                    <span>{paymentPlan.frequency}</span>
                  </div>
                </div>
                {/* Installment schedule */}
                {installments.length > 0 && (
                  <table className="w-full text-[8px] mt-1 border-collapse">
                    <thead>
                      <tr className="border-b border-foreground">
                        <th className="text-left py-0.5 px-0.5">No.</th>
                        <th className="text-left py-0.5 px-0.5">Fecha</th>
                        <th className="text-right py-0.5 px-0.5">Monto</th>
                        <th className="text-center py-0.5 px-0.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst) => (
                        <tr key={inst.installment_number} className="border-b border-dashed border-muted">
                          <td className="py-0.5 px-0.5">{inst.installment_number}</td>
                          <td className="py-0.5 px-0.5">{format(new Date(inst.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</td>
                          <td className="text-right py-0.5 px-0.5">${inst.amount.toFixed(2)}</td>
                          <td className="text-center py-0.5 px-0.5">{inst.status === 'paid' ? 'Pagado' : 'Pendiente'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </>
        )}

        {sale.offline && (
          <>
            <div className="text-center text-[9px]">{SEPARATOR}</div>
            <div className="text-center font-bold my-1">** OFFLINE - PENDIENTE **</div>
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
            <span className="text-[9px]">Firma del Responsable</span>
          </div>
        </div>

        <div className="text-center text-[9px] mt-2">{SEPARATOR}</div>

        {/* === PIE === */}
        <div className="text-center mt-1 space-y-0.5">
          <div className="font-extrabold text-[11px]">{companyName}</div>
          {branch?.name && <div className="text-[9px]">{branch.name}</div>}
          {buildBranchAddress() && <div className="text-[9px]">{buildBranchAddress()}</div>}
          {(branch?.email || settings?.email) && <div className="text-[9px]">{branch?.email || settings?.email}</div>}
          {settings?.rfc && <div className="text-[9px]">RFC: {settings.rfc}</div>}
          <div className="mt-1 font-semibold text-[9px]">¡Gracias por su preferencia!</div>
          <div className="font-extrabold text-[8px] mt-1 text-center">QUEJAS Y ACLARACIONES</div>
          {(branch?.phone || settings?.phone) && <div className="font-bold text-[9px]">Tel: {branch?.phone || settings?.phone}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={isMobileDevice ? handleGeneratePdf : handlePrint}
            disabled={isGeneratingPdf}
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isMobileDevice ? (
              <FileText className="h-4 w-4 mr-2" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {isMobileDevice ? 'Abrir PDF' : 'Imprimir Ticket'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleWhatsApp}
            disabled={!hasWhatsApp}
            title={!hasWhatsApp ? 'Paciente sin WhatsApp registrado' : 'Enviar ticket por WhatsApp'}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Enviar WhatsApp
          </Button>
        </div>
        {isMobileDevice && (
          <p className="text-xs text-muted-foreground text-center">
            En dispositivos táctiles usamos PDF para mejor compatibilidad.
          </p>
        )}
        {!hasWhatsApp && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <AlertCircle className="h-4 w-4" />
            <span>{isFixedLine ? 'El número registrado es fijo, no WhatsApp' : 'Paciente sin WhatsApp registrado'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
