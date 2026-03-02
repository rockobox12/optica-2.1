import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { usePrinterSettings, getPrinterCSS } from '@/hooks/usePrinterSettings';
import { THERMAL_PRINT_STYLES, LAB_ORDER_LANDSCAPE_STYLES } from '@/lib/thermal-print-styles';

interface LabOrderPrintViewProps {
  order: {
    order_number: string;
    created_at: string;
    od_sphere: number | null;
    od_cylinder: number | null;
    od_axis: number | null;
    od_add: number | null;
    oi_sphere: number | null;
    oi_cylinder: number | null;
    oi_axis: number | null;
    oi_add: number | null;
    pd_right: number | null;
    pd_left: number | null;
    pd_total: number | null;
    fitting_height: number | null;
    lens_type: string | null;
    lens_material: string | null;
    lens_treatment: string | null;
    lens_color: string | null;
    frame_brand: string | null;
    frame_model: string | null;
    frame_color: string | null;
    frame_size: string | null;
    special_instructions: string | null;
    internal_notes: string | null;
    estimated_delivery_date: string | null;
    priority: string;
    patients?: {
      first_name: string;
      last_name: string;
    };
    branches?: {
      name: string;
      phone?: string | null;
      address?: string | null;
    } | null;
  };
  promotorName?: string | null;
}

function formatRxValue(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const num = Number(val);
  if (num === 0) return '0.00';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}`;
}

function formatAxis(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return `${Math.round(val)}°`;
}

function formatPD(val: number | null | undefined): string {
  if (val === null || val === undefined) return '';
  return val.toFixed(1);
}

export function LabOrderPrintView({ order, promotorName }: LabOrderPrintViewProps) {
  const thermalPrintRef = useRef<HTMLDivElement>(null);
  const letterPrintRef = useRef<HTMLDivElement>(null);
  const { settings } = useCompanySettings();
  const printerSettings = usePrinterSettings();
  const [printMode, setPrintMode] = useState<'thermal' | 'letter'>('letter');

  const companyName = settings?.company_name || 'ÓPTICA ISTMEÑA';
  const companySlogan = settings?.slogan || 'Precio, Calidad y Garantía';
  const companyPhone = settings?.phone || '';
  const patientName = order.patients
    ? `${order.patients.first_name} ${order.patients.last_name}`
    : 'N/A';
  const promotor = promotorName || 'Óptica Istmeña';
  const branchName = order.branches?.name || '';

  const frameDisplay = [order.frame_brand, order.frame_model, order.frame_color, order.frame_size]
    .filter(Boolean)
    .join(' / ') || '';

  const handlePrint = () => {
    if (printMode === 'letter') {
      handleLetterPrint();
    } else {
      handleThermalPrint();
    }
  };

  const handleLetterPrint = () => {
    const content = letterPrintRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden ${order.order_number}</title>
          <style>${LAB_ORDER_LANDSCAPE_STYLES}</style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleThermalPrint = () => {
    const content = thermalPrintRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printerCSS = getPrinterCSS(printerSettings);

    // Extra CSS forced for 58mm: max darkness & bigger fonts
    const thermal58Override = `
      @page { size: 58mm auto; margin: 1mm; }
      body {
        width: 48mm;
        max-width: 48mm;
        font-family: 'Courier New', 'Lucida Console', monospace;
        font-size: 12px;
        font-weight: 700;
        color: #000 !important;
        line-height: 1.3;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0 auto;
        padding: 1mm;
      }
      * { color: #000 !important; -webkit-text-stroke: 0.3px #000; }
      table { border-color: #000 !important; }
      td, th { border-color: #000 !important; }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Orden ${order.order_number}</title>
          <style>${THERMAL_PRINT_STYLES}${printerCSS}${thermal58Override}</style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="space-y-3">
      {/* Print Mode Selector */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Modo impresión:</span>
        <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
          <button
            type="button"
            onClick={() => setPrintMode('thermal')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              printMode === 'thermal' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Térmica {printerSettings.paperSize}
          </button>
          <button
            type="button"
            onClick={() => setPrintMode('letter')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              printMode === 'letter' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Carta / A4 (Horizontal)
          </button>
        </div>
      </div>

      {/* ==============================
          LETTER / LANDSCAPE PREVIEW
      ============================== */}
      <div
        ref={letterPrintRef}
        className="bg-white p-6 border rounded-lg mx-auto text-black"
        style={{
          maxWidth: '700px',
          fontFamily: "'Segoe UI', Arial, sans-serif",
          display: printMode === 'letter' ? 'block' : 'none',
        }}
      >
        {/* Header */}
        <div className="lab-header" style={{ textAlign: 'center', marginBottom: '10px' }}>
          {settings?.logo_url && (
            <img
              src={settings.logo_url}
              alt="Logo"
              style={{ maxWidth: '180px', maxHeight: '50px', margin: '0 auto 6px', display: 'block', objectFit: 'contain', filter: 'grayscale(1) contrast(1.5)' }}
            />
          )}
          <div className="company-name" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            {companyName}
          </div>
          <div className="slogan" style={{ fontSize: '11px', color: '#333' }}>
            {companySlogan}
          </div>
          <div className="order-title" style={{ fontSize: '16px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 0', marginTop: '8px' }}>
            ORDEN DE LABORATORIO
          </div>
        </div>

        {/* Meta: Folio, Promotor, Fecha */}
        <div className="lab-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: '10px 0', fontSize: '12px' }}>
          <div className="meta-item">
            <div className="meta-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Folio</div>
            <div className="meta-value" style={{ fontSize: '13px', fontWeight: 700 }}>{order.order_number}</div>
          </div>
          <div className="meta-item" style={{ textAlign: 'center' }}>
            <div className="meta-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Promotor</div>
            <div className="meta-value" style={{ fontSize: '13px', fontWeight: 700 }}>{promotor}</div>
          </div>
          <div className="meta-item" style={{ textAlign: 'right' }}>
            <div className="meta-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Fecha</div>
            <div className="meta-value" style={{ fontSize: '13px', fontWeight: 700 }}>
              {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          </div>
        </div>

        {/* Patient */}
        <div className="lab-patient" style={{ margin: '8px 0', padding: '6px 10px', border: '1px solid #000' }}>
          <div className="patient-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>
            Nombre del Paciente
          </div>
          <div className="patient-name" style={{ fontSize: '16px', fontWeight: 700 }}>
            {patientName}
          </div>
        </div>

        {order.priority === 'urgent' && (
          <div style={{ textAlign: 'center', margin: '6px 0' }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 800, padding: '2px 12px', border: '2px solid #000', textTransform: 'uppercase', letterSpacing: '1px' }}>
              ⚠ URGENTE
            </span>
          </div>
        )}

        {/* RX Table */}
        <table className="lab-rx-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>
          <thead>
            <tr>
              <th style={{ background: '#e8e8e8', border: '1.5px solid #000', padding: '6px 8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>RX</th>
              <th style={{ background: '#e8e8e8', border: '1.5px solid #000', padding: '6px 8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>SPH</th>
              <th style={{ background: '#e8e8e8', border: '1.5px solid #000', padding: '6px 8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>CYL</th>
              <th style={{ background: '#e8e8e8', border: '1.5px solid #000', padding: '6px 8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>EJE</th>
              <th style={{ background: '#e8e8e8', border: '1.5px solid #000', padding: '6px 8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>ADD</th>
              <th style={{ background: '#e8e8e8', border: '1.5px solid #000', padding: '6px 8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>DIP</th>
              <th style={{ background: '#e8e8e8', border: '1.5px solid #000', padding: '6px 8px', fontSize: '11px', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' }}>ALT</th>
            </tr>
          </thead>
          <tbody>
            <tr className="od-row" style={{ background: '#e8f0fe' }}>
              <td className="eye-label od-label" style={{ border: '1.5px solid #000', padding: '6px 10px', fontWeight: 800, textAlign: 'left', fontSize: '13px', color: '#1a56db' }}>OD</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatRxValue(order.od_sphere)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatRxValue(order.od_cylinder)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatAxis(order.od_axis)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatRxValue(order.od_add)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatPD(order.pd_right)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatPD(order.fitting_height)}</td>
            </tr>
            <tr className="oi-row" style={{ background: '#e8f5e9' }}>
              <td className="eye-label oi-label" style={{ border: '1.5px solid #000', padding: '6px 10px', fontWeight: 800, textAlign: 'left', fontSize: '13px', color: '#16a34a' }}>OI</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatRxValue(order.oi_sphere)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatRxValue(order.oi_cylinder)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatAxis(order.oi_axis)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatRxValue(order.oi_add)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>{formatPD(order.pd_left)}</td>
              <td style={{ border: '1.5px solid #000', padding: '6px 8px', textAlign: 'center', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 600 }}>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        {/* Details - two columns */}
        <div className="lab-details" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 30px', margin: '10px 0' }}>
          {/* Left column */}
          <div className="lab-detail-item" style={{ borderBottom: '1px solid #ccc', padding: '4px 0' }}>
            <div className="detail-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Material</div>
            <div className="detail-value" style={{ fontSize: '12px', fontWeight: 600 }}>{order.lens_material || '—'}</div>
          </div>
          <div className="lab-detail-item" style={{ borderBottom: '1px solid #ccc', padding: '4px 0' }}>
            <div className="detail-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Color de Lente</div>
            <div className="detail-value" style={{ fontSize: '12px', fontWeight: 600 }}>{order.lens_color || '—'}</div>
          </div>

          <div className="lab-detail-item" style={{ borderBottom: '1px solid #ccc', padding: '4px 0' }}>
            <div className="detail-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Tratamiento</div>
            <div className="detail-value" style={{ fontSize: '12px', fontWeight: 600 }}>{order.lens_treatment || '—'}</div>
          </div>
          <div className="lab-detail-item" style={{ borderBottom: '1px solid #ccc', padding: '4px 0' }}>
            <div className="detail-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Fecha Estimada Entrega</div>
            <div className="detail-value" style={{ fontSize: '12px', fontWeight: 600 }}>
              {order.estimated_delivery_date
                ? format(new Date(order.estimated_delivery_date), "dd/MM/yyyy", { locale: es })
                : '—'}
            </div>
          </div>

          <div className="lab-detail-item" style={{ borderBottom: '1px solid #ccc', padding: '4px 0' }}>
            <div className="detail-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Tipo de Lente</div>
            <div className="detail-value" style={{ fontSize: '12px', fontWeight: 600 }}>{order.lens_type || '—'}</div>
          </div>
          <div className="lab-detail-item" style={{ borderBottom: '1px solid #ccc', padding: '4px 0' }}>
            <div className="detail-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Teléfono Notificaciones</div>
            <div className="detail-value" style={{ fontSize: '12px', fontWeight: 600 }}>{companyPhone || '—'}</div>
          </div>

          <div className="lab-detail-item" style={{ borderBottom: '1px solid #ccc', padding: '4px 0', gridColumn: '1 / -1' }}>
            <div className="detail-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Armazón</div>
            <div className="detail-value" style={{ fontSize: '12px', fontWeight: 600 }}>{frameDisplay || '—'}</div>
          </div>
        </div>

        {/* Notes */}
        <div className="lab-notes" style={{ margin: '10px 0' }}>
          <div className="notes-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
            Notas / Instrucciones Especiales
          </div>
          <div className="notes-box" style={{ border: '1.5px solid #000', padding: '8px 10px', minHeight: '50px', fontSize: '11px', lineHeight: '1.4' }}>
            {order.special_instructions || order.internal_notes || '\u00A0'}
          </div>
        </div>

        {/* Signatures */}
        <div className="lab-signatures" style={{ display: 'flex', justifyContent: 'space-around', marginTop: '40px' }}>
          <div className="lab-sig-block" style={{ textAlign: 'center', width: '35%' }}>
            <div className="lab-sig-line" style={{ borderTop: '1.5px solid #000', marginBottom: '4px' }} />
            <div className="lab-sig-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Elaboró</div>
          </div>
          <div className="lab-sig-block" style={{ textAlign: 'center', width: '35%' }}>
            <div className="lab-sig-line" style={{ borderTop: '1.5px solid #000', marginBottom: '4px' }} />
            <div className="lab-sig-label" style={{ fontSize: '10px', color: '#333', textTransform: 'uppercase' }}>Recibió</div>
          </div>
        </div>

        {/* Footer */}
        <div className="lab-footer" style={{ textAlign: 'center', marginTop: '12px', paddingTop: '6px', borderTop: '1.5px solid #000' }}>
          <div className="company" style={{ fontWeight: 700, fontSize: '11px' }}>{companyName}</div>
          {branchName && <div className="branch" style={{ fontSize: '10px', color: '#333' }}>{branchName}</div>}
        </div>
      </div>

      {/* ==============================
          THERMAL PREVIEW (hidden when letter mode)
          Optimized for 58mm (48mm printable width)
          ALL inline styles for print window compatibility
      ============================== */}
      <div
        ref={thermalPrintRef}
        className="bg-white border rounded-lg mx-auto"
        style={{
          maxWidth: '320px',
          padding: '8px',
          display: printMode === 'thermal' ? 'block' : 'none',
          fontFamily: "'Courier New', 'Lucida Console', monospace",
          fontSize: '12px',
          color: '#000',
          lineHeight: '1.3',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '6px' }}>
          {settings?.logo_url && (
            <img
              src={settings.logo_url}
              alt="Logo"
              style={{ maxWidth: '160px', maxHeight: '18mm', objectFit: 'contain', margin: '0 auto 4px', display: 'block', filter: 'grayscale(1) contrast(2)' }}
            />
          )}
          <div style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#000' }}>
            ORDEN DE LABORATORIO
          </div>
          {settings?.slogan && (
            <div style={{ fontSize: '10px', color: '#000', fontWeight: 600 }}>{settings.slogan}</div>
          )}
        </div>

        {/* Separator */}
        <div style={{ borderBottom: '2px solid #000', marginBottom: '4px' }} />

        {/* Meta: Orden + Fecha | Promotor */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Orden</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#000' }}>{order.order_number}</div>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#000' }}>
              {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Promotor</div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#000' }}>{promotor}</div>
            {order.priority === 'urgent' && (
              <div style={{ fontSize: '10px', fontWeight: 800, border: '2px solid #000', padding: '1px 4px', display: 'inline-block', marginTop: '2px', textTransform: 'uppercase', color: '#000' }}>
                ⚠ URGENTE
              </div>
            )}
          </div>
        </div>

        <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }} />

        {/* Patient */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Paciente</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#000', letterSpacing: '0.5px' }}>{patientName}</div>
        </div>

        <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }} />

        {/* RX Table - optimized for 48mm width */}
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#000', marginBottom: '3px', letterSpacing: '1px' }}>
          Graduación
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
          <thead>
            <tr>
              <th style={{ border: '1.5px solid #000', padding: '3px 2px', fontSize: '10px', fontWeight: 800, textAlign: 'center', background: '#ddd', color: '#000' }}>RX</th>
              <th style={{ border: '1.5px solid #000', padding: '3px 2px', fontSize: '10px', fontWeight: 800, textAlign: 'center', background: '#ddd', color: '#000' }}>SPH</th>
              <th style={{ border: '1.5px solid #000', padding: '3px 2px', fontSize: '10px', fontWeight: 800, textAlign: 'center', background: '#ddd', color: '#000' }}>CYL</th>
              <th style={{ border: '1.5px solid #000', padding: '3px 2px', fontSize: '10px', fontWeight: 800, textAlign: 'center', background: '#ddd', color: '#000' }}>EJE</th>
              <th style={{ border: '1.5px solid #000', padding: '3px 2px', fontSize: '10px', fontWeight: 800, textAlign: 'center', background: '#ddd', color: '#000' }}>ADD</th>
              <th style={{ border: '1.5px solid #000', padding: '3px 2px', fontSize: '10px', fontWeight: 800, textAlign: 'center', background: '#ddd', color: '#000' }}>DIP</th>
              <th style={{ border: '1.5px solid #000', padding: '3px 2px', fontSize: '10px', fontWeight: 800, textAlign: 'center', background: '#ddd', color: '#000' }}>ALT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: '1.5px solid #000', padding: '3px 2px', fontWeight: 800, textAlign: 'center', fontSize: '12px', color: '#000' }}>OD</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatRxValue(order.od_sphere)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatRxValue(order.od_cylinder)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatAxis(order.od_axis)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatRxValue(order.od_add)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatPD(order.pd_right)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatPD(order.fitting_height)}</td>
            </tr>
            <tr>
              <td style={{ border: '1.5px solid #000', padding: '3px 2px', fontWeight: 800, textAlign: 'center', fontSize: '12px', color: '#000' }}>OI</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatRxValue(order.oi_sphere)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatRxValue(order.oi_cylinder)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatAxis(order.oi_axis)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatRxValue(order.oi_add)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>{formatPD(order.pd_left)}</td>
              <td style={{ border: '1.5px solid #000', padding: '3px 1px', textAlign: 'center', fontSize: '12px', fontWeight: 700, fontFamily: "'Courier New', monospace", color: '#000' }}>&nbsp;</td>
            </tr>
          </tbody>
        </table>

        <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }} />

        {/* Details - single column for max readability on 48mm */}
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#000', marginBottom: '3px', letterSpacing: '1px' }}>
          Detalles
        </div>
        <div style={{ marginBottom: '6px' }}>
          <div style={{ borderBottom: '1px dotted #000', padding: '2px 0', marginBottom: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Material: </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#000' }}>{order.lens_material || '—'}</span>
          </div>
          <div style={{ borderBottom: '1px dotted #000', padding: '2px 0', marginBottom: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Tratamiento: </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#000' }}>{order.lens_treatment || '—'}</span>
          </div>
          <div style={{ borderBottom: '1px dotted #000', padding: '2px 0', marginBottom: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Tipo Lente: </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#000' }}>{order.lens_type || '—'}</span>
          </div>
          {order.lens_color && (
            <div style={{ borderBottom: '1px dotted #000', padding: '2px 0', marginBottom: '2px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Color: </span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#000' }}>{order.lens_color}</span>
            </div>
          )}
          <div style={{ borderBottom: '1px dotted #000', padding: '2px 0', marginBottom: '2px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Armazón: </span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#000' }}>{frameDisplay || '—'}</span>
          </div>
        </div>

        {/* Notes */}
        {(order.special_instructions || order.internal_notes) && (
          <>
            <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px' }} />
            <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#000', marginBottom: '2px' }}>Notas</div>
            <div style={{ border: '1px solid #000', padding: '3px 4px', fontSize: '11px', fontWeight: 600, color: '#000', minHeight: '20px', marginBottom: '4px' }}>
              {order.special_instructions || order.internal_notes}
            </div>
          </>
        )}

        {/* Estimated delivery */}
        {order.estimated_delivery_date && (
          <div style={{ textAlign: 'center', margin: '6px 0', border: '1.5px solid #000', padding: '3px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Entrega Estimada</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#000' }}>
              {format(new Date(order.estimated_delivery_date), "dd/MM/yyyy", { locale: es })}
            </div>
          </div>
        )}

        {/* Company phone */}
        <div style={{ border: '1px dashed #000', padding: '3px', textAlign: 'center', margin: '4px 0' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#000' }}>Tel. Notificaciones</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#000' }}>{companyPhone || '—'}</div>
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}>
          <div style={{ textAlign: 'center', width: '42%' }}>
            <div style={{ borderTop: '1.5px solid #000', marginBottom: '2px' }} />
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#000' }}>Elaboró</div>
          </div>
          <div style={{ textAlign: 'center', width: '42%' }}>
            <div style={{ borderTop: '1.5px solid #000', marginBottom: '2px' }} />
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#000' }}>Recibió</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #000' }}>
          <div style={{ fontWeight: 800, fontSize: '10px', color: '#000' }}>{companyName}</div>
          {branchName && <div style={{ fontSize: '10px', fontWeight: 600, color: '#000' }}>{branchName}</div>}
        </div>
      </div>

      {/* Print Button */}
      <Button onClick={handlePrint} className="w-full gap-2">
        <Printer className="h-4 w-4" />
        Imprimir Orden de Laboratorio
      </Button>
    </div>
  );
}
