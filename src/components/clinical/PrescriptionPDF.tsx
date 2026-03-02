import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Share2, Printer, Download, Eye, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface PrescriptionData {
  patientName: string;
  patientAge: number | null;
  examDate: string;
  specialistName: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
  odSphere: number | null;
  odCylinder: number | null;
  odAxis: number | null;
  odAdd: number | null;
  odPd: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
  oiAxis: number | null;
  oiAdd: number | null;
  oiPd: number | null;
  totalPd: number | null;
  lensType: string;
  recommendations: string;
  diagnosis: string;
  // New clinical fields
  consultReason?: string;
  clinicalObservations?: string;
  aiDiagnosis?: string;
}

interface PrescriptionPDFProps {
  data: PrescriptionData;
  whatsappPhone?: string | null;
}

const formatD = (v: number | null) => v !== null ? (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '—';
const formatAxis = (v: number | null) => v !== null ? `${v}°` : '—';
const formatPd = (v: number | null) => v !== null ? `${v.toFixed(1)}` : '—';

interface CompanyInfo {
  company_name: string;
  logo_url: string | null;
  phone: string | null;
  slogan: string | null;
}

function useCompanyInfo(): CompanyInfo | null {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  useEffect(() => {
    supabase.from('company_settings').select('company_name, logo_url, phone, slogan').limit(1).single()
      .then(({ data }) => { if (data) setInfo(data as CompanyInfo); });
  }, []);
  return info;
}

function generateFolio(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `OI-${year}-${seq}`;
}

function sectionHTML(icon: string, title: string, content: string): string {
  return `
    <div class="section-header"><span class="section-icon">${icon}</span> ${title}</div>
    <div class="clinical-section">
      <div class="clinical-section-value">${content}</div>
    </div>
  `;
}

function labeledField(label: string, value: string): string {
  return `<div class="field-row"><span class="field-label">${label}:</span><span class="field-value">${value}</span></div>`;
}

function generatePrescriptionHTML(data: PrescriptionData, company: CompanyInfo | null, withGraduation: boolean): string {
  const companyName = company?.company_name || 'Óptica';
  const companyPhone = data.branchPhone || company?.phone || '';
  const companySlogan = company?.slogan || 'Salud Visual Profesional';
  const logoUrl = company?.logo_url || '';
  const branchAddress = data.branchAddress || '';
  const branchName = data.branchName || 'Principal';
  const folio = generateFolio();
  const now = new Date();
  const dateTimeStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) + ' — ' + now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const evalType = withGraduation ? 'Examen de Refracción con Graduación' : 'Evaluación Visual sin Graduación';

  const logoHTML = logoUrl
    ? `<img src="${logoUrl}" alt="Logo" style="max-height:54px;max-width:160px;object-fit:contain;" crossorigin="anonymous" />`
    : `<div style="width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#0f4c81,#1a6fb5);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:700;">Rx</div>`;

  const qrUrl = `https://optiajuchitan.lovable.app/validar?folio=${folio}`;
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrUrl)}&color=0f4c81&bgcolor=ffffff`;

  // --- CONSULTATION SUMMARY ---
  const hasConsultSummary = data.consultReason;
  const consultSummaryHTML = hasConsultSummary ? `
    <div class="section-header"><span class="section-icon">📋</span> RESUMEN DE CONSULTA</div>
    <div class="clinical-section">
      <div class="clinical-section-value">
        ${data.consultReason ? labeledField('Motivo de consulta', data.consultReason) : ''}
      </div>
    </div>
  ` : '';

  // --- RX TABLE (no totalPd) ---
  const lensTypeLabel = data.lensType || '—';
  const rxTableHTML = withGraduation ? `
    <div class="section-header"><span class="section-icon">👁</span> PRESCRIPCIÓN ÓPTICA</div>
    <table class="rx-table">
      <thead>
        <tr>
          <th class="th-param">Parámetro</th>
          <th class="th-od">OD (Ojo Derecho)</th>
          <th class="th-oi">OI (Ojo Izquierdo)</th>
        </tr>
      </thead>
      <tbody>
        <tr><td class="td-label">Esfera (SPH)</td><td class="td-od">${formatD(data.odSphere)}</td><td class="td-oi">${formatD(data.oiSphere)}</td></tr>
        <tr><td class="td-label">Cilindro (CYL)</td><td class="td-od">${formatD(data.odCylinder)}</td><td class="td-oi">${formatD(data.oiCylinder)}</td></tr>
        <tr><td class="td-label">Eje (AXIS)</td><td class="td-od">${formatAxis(data.odAxis)}</td><td class="td-oi">${formatAxis(data.oiAxis)}</td></tr>
        <tr><td class="td-label">Adición (ADD)</td><td class="td-od">${formatD(data.odAdd)}</td><td class="td-oi">${formatD(data.oiAdd)}</td></tr>
        <tr><td class="td-label">Prisma</td><td class="td-od">—</td><td class="td-oi">—</td></tr>
        <tr><td class="td-label">DIP (mm)</td><td class="td-od">${formatPd(data.odPd)}</td><td class="td-oi">${formatPd(data.oiPd)}</td></tr>
      </tbody>
    </table>
    <div class="lens-type-box">
      <span class="lens-type-label">Tipo de lente sugerido por el especialista:</span>
      <span class="lens-type-value">${lensTypeLabel}</span>
    </div>
  ` : `
    <div class="section-header"><span class="section-icon">👁</span> EVALUACIÓN VISUAL</div>
    <div class="no-rx-box">
      <p>Evaluación clínica realizada sin prescripción de graduación óptica.</p>
      <p style="font-size:11px;color:#9ca3af;margin-top:6px;">El paciente fue evaluado y no requiere corrección refractiva en este momento.</p>
    </div>
  `;

  // --- DIAGNOSIS ---
  const hasDiagnosis = data.clinicalObservations || data.diagnosis || data.aiDiagnosis;
  const diagnosisHTML = hasDiagnosis ? `
    <div class="section-header"><span class="section-icon">🩺</span> DIAGNÓSTICO CLÍNICO</div>
    <div class="clinical-section">
      <div class="clinical-section-value">
        ${data.clinicalObservations ? labeledField('Observación clínica', data.clinicalObservations) : ''}
        ${data.diagnosis ? labeledField('Diagnóstico del especialista', data.diagnosis) : ''}
        ${data.aiDiagnosis ? `<div class="ai-diagnosis-box">${labeledField('Diagnóstico asistido por IA', data.aiDiagnosis)}</div>` : ''}
      </div>
    </div>
  ` : '';

  // --- TREATMENT & RECOMMENDATIONS ---
  const treatmentHTML = data.recommendations ? `
    <div class="section-header"><span class="section-icon">💊</span> TRATAMIENTO Y RECOMENDACIONES</div>
    <div class="clinical-section">
      <div class="clinical-section-value">${data.recommendations}</div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Receta ${folio} — ${data.patientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',system-ui,sans-serif; color:#1a1a2e; background:#f8f9fb; -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .page { position:relative; max-width:800px; margin:20px auto; background:#fff; border-radius:12px; box-shadow:0 4px 24px rgba(0,0,0,0.08); overflow:hidden; }

  .watermark { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-35deg); font-size:72px; font-weight:800; color:rgba(15,76,129,0.03); white-space:nowrap; pointer-events:none; z-index:0; letter-spacing:8px; text-transform:uppercase; }

  .content { position:relative; z-index:1; padding:0; }

  .accent-bar { height:5px; background:linear-gradient(90deg,#0f4c81 0%,#1a6fb5 40%,#2e97d4 70%,#60bfff 100%); }

  /* Header */
  .header { display:flex; justify-content:space-between; align-items:flex-start; padding:24px 32px 18px; border-bottom:1px solid #e8ecf1; }
  .brand { display:flex; align-items:center; gap:14px; }
  .brand-info h1 { font-size:18px; font-weight:800; color:#0f4c81; letter-spacing:-0.3px; line-height:1.2; }
  .brand-info .slogan { font-size:10px; color:#6b7280; font-weight:500; margin-top:2px; letter-spacing:0.5px; text-transform:uppercase; }
  .brand-info .branch { font-size:10px; color:#9ca3af; margin-top:1px; }
  .header-right { text-align:right; }
  .folio-badge { display:inline-block; background:#0f4c81; color:#fff; font-size:10px; font-weight:700; padding:3px 10px; border-radius:4px; letter-spacing:1px; margin-bottom:6px; }
  .header-contact { font-size:10px; color:#6b7280; line-height:1.7; }

  /* Document title bar */
  .doc-title-bar { background:linear-gradient(135deg,#f0f5ff 0%,#e8f0fe 100%); padding:12px 32px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #dde4f0; }
  .doc-title { font-size:13px; font-weight:700; color:#0f4c81; letter-spacing:1.5px; text-transform:uppercase; }
  .doc-datetime { font-size:11px; color:#4b5563; }

  /* Patient bar */
  .patient-bar { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; padding:14px 32px; background:#fafbfc; border-bottom:1px solid #e8ecf1; }
  .patient-field { font-size:11px; }
  .patient-field .lbl { color:#9ca3af; font-weight:500; text-transform:uppercase; font-size:9px; letter-spacing:0.8px; display:block; margin-bottom:1px; }
  .patient-field .val { color:#111827; font-weight:600; font-size:12px; }

  /* Specialist bar */
  .specialist-bar { display:flex; justify-content:space-between; align-items:center; padding:10px 32px; background:#fff; border-bottom:1px solid #e8ecf1; }
  .specialist-name { font-size:13px; font-weight:700; color:#0f4c81; }
  .specialist-title { font-size:10px; color:#6b7280; }
  .eval-type-badge { font-size:10px; background:#ecfdf5; color:#047857; padding:3px 10px; border-radius:20px; font-weight:600; }

  /* Body */
  .body { padding:20px 32px 16px; }

  /* Section headers */
  .section-header { font-size:12px; font-weight:700; color:#0f4c81; letter-spacing:1.5px; text-transform:uppercase; margin:22px 0 10px; padding-bottom:6px; border-bottom:2px solid #e8ecf1; display:flex; align-items:center; gap:8px; }
  .section-header:first-child { margin-top:0; }
  .section-icon { font-size:14px; }

  /* RX Table */
  .rx-table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid #d1d5db; border-radius:8px; overflow:hidden; margin-bottom:14px; }
  .rx-table th { padding:10px 14px; font-size:10px; text-transform:uppercase; letter-spacing:1.2px; font-weight:700; }
  .th-param { background:#0f4c81; color:#fff; text-align:left; }
  .th-od { background:#eff6ff; color:#1d4ed8; text-align:center; }
  .th-oi { background:#ecfdf5; color:#047857; text-align:center; }
  .rx-table td { padding:10px 14px; font-size:13px; border-bottom:1px solid #f3f4f6; }
  .td-label { text-align:left; font-weight:600; color:#374151; font-size:12px; background:#fafafa; }
  .td-od { text-align:center; font-family:'SF Mono','Consolas','Monaco',monospace; font-weight:600; color:#1e40af; background:#f8fbff; }
  .td-oi { text-align:center; font-family:'SF Mono','Consolas','Monaco',monospace; font-weight:600; color:#047857; background:#f0fdf9; }
  .rx-table tr:last-child td { border-bottom:none; }

  /* Lens type box */
  .lens-type-box { background:#f0f5ff; border:1px solid #dde4f0; border-radius:8px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .lens-type-label { font-size:11px; color:#374151; font-weight:500; }
  .lens-type-value { font-size:13px; font-weight:700; color:#0f4c81; }

  .no-rx-box { background:#f9fafb; border:1px dashed #d1d5db; border-radius:8px; padding:24px; text-align:center; margin-bottom:16px; }
  .no-rx-box p { font-size:13px; color:#6b7280; }

  /* Clinical sections */
  .clinical-section { margin-bottom:16px; }
  .clinical-section-value { font-size:12px; color:#1f2937; line-height:1.7; background:#fafbfc; border:1px solid #e5e7eb; border-radius:6px; padding:14px 18px; }

  /* Field rows */
  .field-row { margin-bottom:8px; }
  .field-row:last-child { margin-bottom:0; }
  .field-label { font-size:10px; text-transform:uppercase; letter-spacing:0.6px; color:#6b7280; font-weight:600; display:block; margin-bottom:2px; }
  .field-value { font-size:12px; color:#111827; font-weight:500; line-height:1.6; display:block; }

  /* AI diagnosis accent */
  .ai-diagnosis-box { margin-top:10px; padding-top:10px; border-top:1px dashed #d1d5db; }
  .ai-diagnosis-box .field-label { color:#6366f1; }

  /* Footer / Signature */
  .footer { padding:0 32px 24px; }
  .signature-block { text-align:center; margin:30px 0 20px; }
  .signature-line { width:260px; margin:0 auto 8px; border-top:2px solid #0f4c81; padding-top:8px; }
  .sig-name { font-size:14px; font-weight:700; color:#0f4c81; }
  .sig-title { font-size:10px; color:#6b7280; margin-top:2px; }

  .footer-bar { display:flex; justify-content:space-between; align-items:flex-end; padding-top:16px; border-top:1px solid #e8ecf1; }
  .footer-left { font-size:9px; color:#9ca3af; line-height:1.6; }
  .footer-left strong { color:#6b7280; }
  .footer-qr { text-align:center; }
  .footer-qr img { border-radius:6px; border:1px solid #e8ecf1; }
  .footer-qr p { font-size:8px; color:#9ca3af; margin-top:3px; }

  .validity { text-align:center; font-size:10px; color:#6b7280; font-style:italic; margin-top:14px; }

  @media print {
    body { background:#fff; }
    .page { margin:0; box-shadow:none; border-radius:0; }
    .no-print { display:none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="watermark">${companyName}</div>
  <div class="content">
    <div class="accent-bar"></div>

    <!-- HEADER -->
    <div class="header">
      <div class="brand">
        ${logoHTML}
        <div class="brand-info">
          <h1>${companyName}</h1>
          <p class="slogan">${companySlogan}</p>
          <p class="branch">Sucursal ${branchName}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="folio-badge">FOLIO ${folio}</div>
        <div class="header-contact">
          ${branchAddress ? `<div>${branchAddress}</div>` : ''}
          ${companyPhone ? `<div>Tel. ${companyPhone}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- DOC TITLE -->
    <div class="doc-title-bar">
      <span class="doc-title">Receta Óptica</span>
      <span class="doc-datetime">${dateTimeStr}</span>
    </div>

    <!-- SPECIALIST -->
    <div class="specialist-bar">
      <div>
        <div class="specialist-name">${data.specialistName}</div>
        <div class="specialist-title">Especialista en Salud Visual</div>
      </div>
      <span class="eval-type-badge">${evalType}</span>
    </div>

    <!-- PATIENT -->
    <div class="patient-bar">
      <div class="patient-field"><span class="lbl">Paciente</span><span class="val">${data.patientName}</span></div>
      <div class="patient-field"><span class="lbl">Edad</span><span class="val">${data.patientAge ?? '—'} años</span></div>
      <div class="patient-field"><span class="lbl">Sucursal</span><span class="val">${branchName}</span></div>
    </div>

    <!-- BODY -->
    <div class="body">
      ${consultSummaryHTML}
      ${rxTableHTML}
      ${diagnosisHTML}
      ${treatmentHTML}
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <div class="signature-block">
        <div class="signature-line"></div>
        <p class="sig-name">${data.specialistName}</p>
        <p class="sig-title">Especialista en Salud Visual</p>
      </div>

      <div class="footer-bar">
        <div class="footer-left">
          <p><strong>${companyName}</strong> — ${companySlogan}</p>
          <p>Folio: ${folio}</p>
        </div>
        <div class="footer-qr">
          <img src="${qrImg}" alt="QR de validación" width="70" height="70" />
          <p>Verificar receta</p>
        </div>
      </div>

      <p class="validity">Esta receta tiene vigencia de 6 meses a partir de la fecha de emisión.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

function openPrescription(data: PrescriptionData, company: CompanyInfo | null, withGraduation: boolean, action: 'preview' | 'print' | 'download') {
  const html = generatePrescriptionHTML(data, company, withGraduation);

  if (action === 'download') {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receta_${data.patientName.replace(/\s+/g, '_')}_${data.examDate}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const w = window.open('', '_blank', 'width=860,height=1100');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  if (action === 'print') {
    setTimeout(() => w.print(), 600);
  }
}

export function PrescriptionPDFButton({ data, whatsappPhone }: PrescriptionPDFProps) {
  const company = useCompanyInfo();
  const hasPrescription = data.odSphere !== null || data.oiSphere !== null;

  const handleAction = (withGraduation: boolean, action: 'preview' | 'print' | 'download') => {
    openPrescription(data, company, withGraduation, action);
  };

  const handleWhatsApp = () => {
    if (!whatsappPhone) return;
    const cleanPhone = whatsappPhone.replace(/\D/g, '');
    const phone = cleanPhone.startsWith('52') ? cleanPhone : `52${cleanPhone}`;
    const companyName = company?.company_name || 'Óptica';
    const text = encodeURIComponent(
      `📋 *Receta Óptica — ${companyName}*\n\n` +
      `👤 *Paciente:* ${data.patientName}\n` +
      `📅 *Fecha:* ${data.examDate}\n\n` +
      (hasPrescription ? (
        `*OD (Derecho)*\n` +
        `SPH: ${formatD(data.odSphere)} | CYL: ${formatD(data.odCylinder)} | EJE: ${formatAxis(data.odAxis)} | ADD: ${formatD(data.odAdd)}\n\n` +
        `*OI (Izquierdo)*\n` +
        `SPH: ${formatD(data.oiSphere)} | CYL: ${formatD(data.oiCylinder)} | EJE: ${formatAxis(data.oiAxis)} | ADD: ${formatD(data.oiAdd)}\n\n`
      ) : `_Evaluación sin graduación_\n\n`) +
      (data.lensType ? `*Tipo:* ${data.lensType}\n` : '') +
      (data.diagnosis ? `*Diagnóstico:* ${data.diagnosis}\n` : '') +
      (data.recommendations ? `*Indicaciones:* ${data.recommendations}\n` : '') +
      `\n_${data.specialistName} — Especialista en Salud Visual_\n` +
      `_${companyName}_`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasPrescription && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Receta con graduación</span>
              <span className="sm:hidden">Con Rx</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => handleAction(true, 'preview')}>
              <Eye className="h-4 w-4 mr-2" /> Vista previa
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction(true, 'print')}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAction(true, 'download')}>
              <Download className="h-4 w-4 mr-2" /> Descargar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="gap-1.5 text-muted-foreground border-border hover:bg-muted/50">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Receta sin graduación</span>
            <span className="sm:hidden">Sin Rx</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => handleAction(false, 'preview')}>
            <Eye className="h-4 w-4 mr-2" /> Vista previa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction(false, 'print')}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction(false, 'download')}>
            <Download className="h-4 w-4 mr-2" /> Descargar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {whatsappPhone && (
        <Button type="button" variant="outline" size="sm" onClick={handleWhatsApp} className="gap-1.5 text-success border-success/30 hover:bg-success/5">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </Button>
      )}
    </div>
  );
}
