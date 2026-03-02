import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Eye,
  FileText,
  MessageCircle,
  Printer,
  Shield,
  Sparkles,
  TrendingDown,
  User,
} from 'lucide-react';
import { riskLevelConfig, type PredictiveAnalysisResult } from '@/lib/clinical-predictive';
import type { AdvancedDiagnosisResult } from '@/lib/clinical-advanced-diagnosis';
import type { CommercialEngineResult } from '@/lib/clinical-commercial-engine';
import { buildClinicalSummaryData } from '@/lib/clinical-commercial-engine';

interface MobileClinicalSummaryProps {
  patientName: string;
  patientAge: number | null;
  diagnosis: string;
  currentRx: {
    odSphere: number | null; odCylinder: number | null; odAxis: number | null; odAdd: number | null;
    oiSphere: number | null; oiCylinder: number | null; oiAxis: number | null; oiAdd: number | null;
  };
  predictive: PredictiveAnalysisResult;
  advanced: AdvancedDiagnosisResult;
  commercial: CommercialEngineResult;
  specialistName: string;
  whatsappNumber: string | null;
}

const formatD = (v: number | null) => v !== null ? (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) : '—';

export function MobileClinicalSummary({
  patientName, patientAge, diagnosis, currentRx,
  predictive, advanced, commercial, specialistName, whatsappNumber,
}: MobileClinicalSummaryProps) {
  const risk = predictive.riskScore;
  const riskCfg = riskLevelConfig[risk.level];

  const handlePrint = () => {
    const summaryData = buildClinicalSummaryData(
      patientName, patientAge, diagnosis,
      advanced.progressionNotes.length > 0 ? advanced.progressionNotes.join('; ') : null,
      predictive, advanced, commercial.commercial, commercial.reviewAlerts,
      specialistName,
    );

    const printContent = `
      <html><head><title>Resumen - ${patientName}</title>
      <style>
        @page { size: letter; margin: 12mm; }
        body { font-family: system-ui, sans-serif; font-size: 10pt; color: #222; }
        h1 { font-size: 14pt; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
        h2 { font-size: 11pt; color: #333; margin: 10px 0 4px; }
        .rx { font-family: monospace; font-size: 10pt; }
        .bar { height: 8px; background: #e5e7eb; border-radius: 4px; margin: 4px 0; }
        .fill { height: 100%; border-radius: 4px; }
        .low { background: #22c55e; } .moderate { background: #eab308; }
        .high { background: #f97316; } .very_high { background: #ef4444; }
        .tag { display:inline-block; background:#e0f2fe; color:#0369a1; padding:1px 6px; border-radius:10px; font-size:8pt; margin:2px; }
        .disc { font-size: 7pt; color: #999; text-align: center; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; }
      </style></head><body>
      <h1>Óptica Istmeña — Resumen Clínico</h1>
      <p><strong>${patientName}</strong> | ${patientAge ?? '—'} años | ${new Date().toLocaleDateString('es-MX')}</p>
      <h2>Graduación Actual</h2>
      <p class="rx">OD: ${formatD(currentRx.odSphere)} / ${formatD(currentRx.odCylinder)} x ${currentRx.odAxis ?? '—'}° ADD ${formatD(currentRx.odAdd)}</p>
      <p class="rx">OI: ${formatD(currentRx.oiSphere)} / ${formatD(currentRx.oiCylinder)} x ${currentRx.oiAxis ?? '—'}° ADD ${formatD(currentRx.oiAdd)}</p>
      <h2>Diagnóstico</h2><p>${diagnosis || 'Pendiente'}</p>
      <h2>Riesgo Visual: ${risk.score}/100</h2>
      <div class="bar"><div class="fill ${risk.level}" style="width:${risk.score}%"></div></div>
      ${predictive.projections.length > 0 ? `<h2>Proyección 3 Años</h2>${predictive.projections.map(p => `<p>${p.eye}: ${formatD(p.currentSph)} → ${formatD(p.projected3yr)} (${formatD(p.annualRate)}/año)</p>`).join('')}` : ''}
      <h2>Recomendación: ${commercial.commercial.lensLevelLabel}</h2>
      <p>${commercial.commercial.features.map(f => `<span class="tag">${f}</span>`).join('')}</p>
      <div class="disc">Las sugerencias automáticas no sustituyen el criterio clínico del especialista.</div>
      <p style="text-align:center;margin-top:30px;"><strong>${specialistName}</strong><br/>Especialista</p>
      </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
  };

  const handleShareWhatsApp = () => {
    const text = `*Resumen Clínico — ${patientName}*\n\n` +
      `OD: ${formatD(currentRx.odSphere)}/${formatD(currentRx.odCylinder)} x${currentRx.odAxis ?? '—'}°\n` +
      `OI: ${formatD(currentRx.oiSphere)}/${formatD(currentRx.oiCylinder)} x${currentRx.oiAxis ?? '—'}°\n\n` +
      `Diagnóstico: ${diagnosis || 'Pendiente'}\n` +
      `Riesgo: ${risk.score}/100 (${riskCfg.label})\n\n` +
      `Recomendación: ${commercial.commercial.lensLevelLabel}\n` +
      `— Óptica Istmeña`;
    const phone = whatsappNumber ? whatsappNumber.replace(/\D/g, '') : '';
    const url = phone ? `https://wa.me/${phone.startsWith('52') ? phone : `52${phone}`}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3">
      {/* Patient + RX Card */}
      <Card>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{patientName}</p>
              <p className="text-xs text-muted-foreground">{patientAge ?? '—'} años</p>
            </div>
          </div>

          {/* RX compact */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-muted/50 rounded-lg p-2.5">
            <div>
              <span className="font-sans font-semibold text-primary text-[10px]">OD</span>
              <p>{formatD(currentRx.odSphere)} / {formatD(currentRx.odCylinder)} x{currentRx.odAxis ?? '—'}°</p>
              {currentRx.odAdd && <p className="text-muted-foreground">ADD {formatD(currentRx.odAdd)}</p>}
            </div>
            <div>
              <span className="font-sans font-semibold text-emerald-600 text-[10px]">OI</span>
              <p>{formatD(currentRx.oiSphere)} / {formatD(currentRx.oiCylinder)} x{currentRx.oiAxis ?? '—'}°</p>
              {currentRx.oiAdd && <p className="text-muted-foreground">ADD {formatD(currentRx.oiAdd)}</p>}
            </div>
          </div>

          {/* Diagnosis */}
          {diagnosis && (
            <div className="text-xs">
              <span className="font-semibold">Diagnóstico: </span>
              <span className="text-muted-foreground">{diagnosis}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risk Score */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Riesgo Visual</span>
            </div>
            <span className={cn('text-sm font-bold', riskCfg.color)}>{risk.score}/100</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', riskCfg.barColor)} style={{ width: `${risk.score}%` }} />
          </div>
          <p className={cn('text-[10px] mt-1', riskCfg.color)}>{riskCfg.label}</p>
        </CardContent>
      </Card>

      {/* Alerts */}
      {advanced.alerts.length > 0 && (
        <Card>
          <CardContent className="py-3 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-semibold">Alertas Clínicas</span>
            </div>
            {advanced.alerts.slice(0, 4).map((a, i) => (
              <div key={i} className={cn(
                'flex items-start gap-2 px-2 py-1.5 rounded text-[11px]',
                a.level === 'danger' ? 'bg-destructive/10' : a.level === 'warning' ? 'bg-warning/10' : 'bg-primary/5'
              )}>
                <Badge variant={a.level === 'danger' ? 'destructive' : 'outline'} className="text-[8px] px-1 py-0 shrink-0 mt-0.5">
                  {a.level === 'danger' ? 'Alto' : a.level === 'warning' ? 'Medio' : 'Info'}
                </Badge>
                <span>{a.title}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Projections */}
      {predictive.projections.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">Proyección 3 Años</span>
            </div>
            {predictive.projections.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{p.eye}</span>
                <span className="text-muted-foreground">
                  {formatD(p.currentSph)} → <span className="font-semibold text-foreground">{formatD(p.projected3yr)}</span>
                  <span className="text-[10px] ml-1">({formatD(p.annualRate)}/año)</span>
                </span>
              </div>
            ))}
            <p className="text-[9px] text-muted-foreground mt-1">Proyección basada en tendencia histórica.</p>
          </CardContent>
        </Card>
      )}

      {/* Commercial Recommendation */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">Recomendación: {commercial.commercial.lensLevelLabel}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {commercial.commercial.features.map((f, i) => (
              <Badge key={i} variant="outline" className="text-[9px] gap-0.5">
                <CheckCircle2 className="h-2 w-2" />
                {f}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5" />
          Imprimir PDF
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={handleShareWhatsApp}>
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </Button>
      </div>
    </div>
  );
}
