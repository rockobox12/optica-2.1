import { useMemo, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  Crown,
  FileText,
  Gem,
  Info,
  MessageCircle,
  Printer,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  computeCommercialEngine,
  buildClinicalSummaryData,
  type CommercialEngineResult,
  type EarlyReviewAlert,
  type CommercialRecommendation,
  type HistoryAnomaly,
  type HistoricalDataPoint,
  type ReviewUrgency,
  type LensLevel,
} from '@/lib/clinical-commercial-engine';
import type { PredictiveAnalysisResult } from '@/lib/clinical-predictive';
import type { AdvancedDiagnosisResult } from '@/lib/clinical-advanced-diagnosis';

interface ClinicalCommercialPanelProps {
  odSphere: number | null;
  odCylinder: number | null;
  odAdd: number | null;
  oiSphere: number | null;
  oiCylinder: number | null;
  oiAdd: number | null;
  patientAge: number | null;
  patientName: string;
  diagnosis: string;
  predictive: PredictiveAnalysisResult;
  advanced: AdvancedDiagnosisResult;
  history: HistoricalDataPoint[];
  specialistName: string;
}

const urgencyConfig: Record<ReviewUrgency, { bg: string; badge: string; icon: typeof AlertTriangle }> = {
  urgent: { bg: 'bg-destructive/10 border-destructive/30', badge: 'destructive', icon: Shield },
  recommended: { bg: 'bg-warning/10 border-warning/30', badge: 'outline', icon: Bell },
  routine: { bg: 'bg-muted/50 border-border/50', badge: 'secondary', icon: Calendar },
};

const lensLevelConfig: Record<LensLevel, { color: string; icon: typeof Star; gradient: string }> = {
  basico: { color: 'text-muted-foreground', icon: Star, gradient: 'from-muted to-muted/50' },
  intermedio: { color: 'text-primary', icon: Gem, gradient: 'from-primary/10 to-primary/5' },
  premium: { color: 'text-amber-500', icon: Crown, gradient: 'from-amber-500/10 to-amber-500/5' },
};

function ReviewAlertCard({ alert }: { alert: EarlyReviewAlert }) {
  const config = urgencyConfig[alert.urgency];
  const Icon = config.icon;

  const openWhatsApp = () => {
    const encoded = encodeURIComponent(alert.whatsappMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={cn('flex items-start gap-2 px-3 py-2 rounded-lg border', config.bg)}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold">{alert.title}</p>
          <Badge variant={config.badge as 'destructive' | 'outline' | 'secondary'} className="text-[9px] px-1.5 py-0">
            {alert.suggestedMonths}m
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">{alert.description}</p>
      </div>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={openWhatsApp}
            className="p-1.5 rounded-md hover:bg-background/80 text-success transition-colors shrink-0"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Enviar recordatorio por WhatsApp
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function LensLevelCard({ rec }: { rec: CommercialRecommendation }) {
  const config = lensLevelConfig[rec.lensLevel];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg border p-3 bg-gradient-to-br', config.gradient)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-5 w-5', config.color)} />
        <div>
          <p className="text-sm font-bold">{rec.lensLevelLabel}</p>
          <p className="text-[10px] text-muted-foreground">{rec.lensLevelDescription}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{rec.clinicalJustification}</p>
      <div className="flex flex-wrap gap-1">
        {rec.features.map((f, i) => (
          <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
            {f}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: HistoryAnomaly }) {
  return (
    <div className={cn(
      'flex items-start gap-2 px-3 py-2 rounded-lg border',
      anomaly.severity === 'warning' ? 'bg-warning/10 border-warning/30' : 'bg-muted/50 border-border/50',
    )}>
      <Zap className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', anomaly.severity === 'warning' ? 'text-warning' : 'text-muted-foreground')} />
      <div className="min-w-0">
        <p className="text-xs font-semibold">{anomaly.title}</p>
        <p className="text-[11px] text-muted-foreground">{anomaly.description}</p>
      </div>
    </div>
  );
}

export function ClinicalCommercialPanel({
  odSphere, odCylinder, odAdd,
  oiSphere, oiCylinder, oiAdd,
  patientAge, patientName, diagnosis,
  predictive, advanced, history,
  specialistName,
}: ClinicalCommercialPanelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const result = useMemo<CommercialEngineResult>(
    () => computeCommercialEngine(
      odSphere, odCylinder, odAdd,
      oiSphere, oiCylinder, oiAdd,
      patientAge, patientName, diagnosis,
      predictive, advanced, history,
    ),
    [odSphere, odCylinder, odAdd, oiSphere, oiCylinder, oiAdd, patientAge, patientName, diagnosis, predictive, advanced, history],
  );

  const hasReviews = result.reviewAlerts.length > 0;
  const hasAnomalies = result.anomalies.length > 0;

  const handlePrintSummary = () => {
    const summaryData = buildClinicalSummaryData(
      patientName, patientAge, diagnosis,
      advanced.progressionNotes.length > 0 ? advanced.progressionNotes.join('; ') : null,
      predictive, advanced, result.commercial, result.reviewAlerts,
      specialistName,
    );

    const printContent = `
      <html>
      <head>
        <title>Resumen Clínico - ${summaryData.patientName}</title>
        <style>
          @page { size: letter; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.5; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 15px; }
          .header h1 { font-size: 16pt; color: #2563eb; margin: 0; }
          .header p { margin: 2px 0; color: #666; font-size: 9pt; }
          .section { margin-bottom: 12px; }
          .section-title { font-size: 12pt; font-weight: bold; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 8px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .field { margin-bottom: 4px; }
          .field-label { font-size: 9pt; color: #666; text-transform: uppercase; }
          .field-value { font-weight: 600; }
          .alert { padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; font-size: 10pt; }
          .alert-urgent { background: #fef2f2; border-left: 3px solid #ef4444; }
          .alert-warning { background: #fffbeb; border-left: 3px solid #f59e0b; }
          .alert-info { background: #eff6ff; border-left: 3px solid #3b82f6; }
          .risk-bar { height: 12px; background: #e5e7eb; border-radius: 6px; overflow: hidden; margin: 4px 0; }
          .risk-fill { height: 100%; border-radius: 6px; }
          .risk-low { background: #22c55e; }
          .risk-moderate { background: #eab308; }
          .risk-high { background: #f97316; }
          .risk-very_high { background: #ef4444; }
          .recommendation-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-top: 8px; }
          .tag { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 10px; font-size: 9pt; margin: 2px; }
          .disclaimer { font-size: 8pt; color: #999; text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
          .signature { margin-top: 40px; text-align: center; }
          .signature-line { border-top: 1px solid #333; width: 200px; margin: 0 auto 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Óptica Istmeña</h1>
          <p>Resumen Clínico Inteligente</p>
          <p>${summaryData.examDate}</p>
        </div>

        <div class="section">
          <div class="section-title">Datos del Paciente</div>
          <div class="grid">
            <div class="field"><span class="field-label">Nombre: </span><span class="field-value">${summaryData.patientName}</span></div>
            <div class="field"><span class="field-label">Edad: </span><span class="field-value">${summaryData.patientAge ?? 'N/A'} años</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Diagnóstico</div>
          <p class="field-value">${summaryData.diagnosis || 'Sin diagnóstico registrado'}</p>
          ${summaryData.previousComparison ? `<p style="font-size:10pt;color:#666;">Comparación: ${summaryData.previousComparison}</p>` : ''}
        </div>

        ${summaryData.alerts.length > 0 ? `
        <div class="section">
          <div class="section-title">Alertas Clínicas</div>
          ${summaryData.alerts.map(a => `<div class="alert alert-${a.level === 'danger' ? 'urgent' : a.level}"><strong>${a.title}</strong> — ${a.description}</div>`).join('')}
        </div>` : ''}

        <div class="section">
          <div class="section-title">Score de Riesgo Visual</div>
          <p>${summaryData.riskScore.score}/100 — ${summaryData.riskScore.level === 'low' ? 'Bajo' : summaryData.riskScore.level === 'moderate' ? 'Moderado' : summaryData.riskScore.level === 'high' ? 'Alto' : 'Muy Alto'}</p>
          <div class="risk-bar"><div class="risk-fill risk-${summaryData.riskScore.level}" style="width:${summaryData.riskScore.score}%"></div></div>
        </div>

        ${summaryData.projections.length > 0 ? `
        <div class="section">
          <div class="section-title">Proyección a 3 Años</div>
          ${summaryData.projections.map(p => `<p>${p.eye}: Actual ${p.currentSph >= 0 ? '+' : ''}${p.currentSph.toFixed(2)}D → Proyectado ${p.projected3yr >= 0 ? '+' : ''}${p.projected3yr.toFixed(2)}D (${p.annualRate >= 0 ? '+' : ''}${p.annualRate.toFixed(2)}D/año)</p>`).join('')}
        </div>` : ''}

        <div class="section">
          <div class="section-title">Recomendación Óptica</div>
          <div class="recommendation-box">
            <p class="field-value">Nivel: ${summaryData.commercialRec.lensLevelLabel}</p>
            <p>${summaryData.commercialRec.clinicalJustification}</p>
            <div>${summaryData.commercialRec.features.map(f => `<span class="tag">${f}</span>`).join('')}</div>
          </div>
        </div>

        ${summaryData.reviewAlerts.length > 0 ? `
        <div class="section">
          <div class="section-title">Seguimiento Recomendado</div>
          ${summaryData.reviewAlerts.map(r => `<div class="alert alert-${r.urgency === 'urgent' ? 'urgent' : 'warning'}">${r.title} — ${r.description}</div>`).join('')}
        </div>` : ''}

        <div class="signature">
          <div class="signature-line"></div>
          <p class="field-value">${summaryData.specialistName}</p>
          <p style="font-size:9pt;color:#666;">Especialista</p>
        </div>

        <p class="disclaimer">${summaryData.disclaimer}</p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Don't show if no data
  if (!hasReviews && !hasAnomalies && !result.commercial) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Motor Clínico-Comercial</h4>
        </div>
        {/* Botón Resumen Clínico removido - no necesario */}
      </div>

      <div className="p-4 space-y-4" ref={printRef}>
        {/* Review Alerts */}
        {hasReviews && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Alertas de Revisión Temprana
              </span>
            </div>
            <div className="space-y-1.5">
              {result.reviewAlerts.map(alert => (
                <ReviewAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </div>
        )}

        {/* Commercial Recommendation */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recomendación Comercial
            </span>
          </div>
          <LensLevelCard rec={result.commercial} />
        </div>

        {/* History Anomalies */}
        {hasAnomalies && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Detección de Cambios Atípicos
              </span>
            </div>
            <div className="space-y-1.5">
              {result.anomalies.map(anomaly => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-1.5 pt-1">
          <Info className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-tight">
            Las sugerencias automáticas no sustituyen el criterio clínico del especialista. Las recomendaciones comerciales son orientativas.
          </p>
        </div>
      </div>
    </div>
  );
}
