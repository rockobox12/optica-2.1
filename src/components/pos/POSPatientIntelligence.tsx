/**
 * POS Patient Intelligence Panel
 * Shows clinical Visual Profile and Technical Lens Suggestion
 * when a patient is selected in the POS terminal.
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Activity, AlertTriangle, ChevronDown, ChevronUp, Eye, Glasses,
  Info, Layers, Plus, Shield, ShieldAlert, Sparkles, Sun,
  TrendingDown, TrendingUp, User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  computePatientIntelligence,
  type PatientIntelligence,
  type POSRecommendation,
  type PatientSignal,
} from '@/lib/patient-intelligence-service';
import type { HistoricalExam } from '@/lib/clinical-predictive';
import { cn } from '@/lib/utils';

interface POSPatientIntelligenceProps {
  patientId: string;
  patientName: string;
  onAddToCart?: (recommendation: POSRecommendation) => void;
}

// ── Visual profile helpers (same logic as VisualProfilePanel) ──

function avg(a: number | null, b: number | null): number | null {
  if (a !== null && b !== null) return (a + b) / 2;
  return a ?? b;
}

interface ProfileItem {
  label: string;
  value: string;
  icon: typeof Eye;
  color: string;
}

function buildVisualProfile(
  odSph: number | null, odCyl: number | null, odAdd: number | null,
  oiSph: number | null, oiCyl: number | null, oiAdd: number | null,
  age: number | null, occupation: string | null,
  riskScore: number, riskLevel: string,
  hasProgression: boolean, progressionRate: number,
): ProfileItem[] {
  const profile: ProfileItem[] = [];
  const avgSph = avg(odSph, oiSph);
  const avgCyl = avg(odCyl, oiCyl);
  const se = avgSph !== null && avgCyl !== null ? avgSph + avgCyl / 2 : null;

  // Ametropia
  if (se !== null) {
    if (se <= -6) profile.push({ label: 'Ametropía', value: 'Miopía alta', icon: TrendingDown, color: 'text-destructive' });
    else if (se <= -3) profile.push({ label: 'Ametropía', value: 'Miopía moderada', icon: TrendingDown, color: 'text-warning' });
    else if (se < -0.25) profile.push({ label: 'Ametropía', value: 'Miopía leve', icon: TrendingDown, color: 'text-primary' });
    else if (se <= 0.25) profile.push({ label: 'Ametropía', value: 'Emetropía', icon: Eye, color: 'text-emerald-500' });
    else if (se <= 3) profile.push({ label: 'Ametropía', value: 'Hipermetropía leve', icon: TrendingUp, color: 'text-primary' });
    else if (se <= 6) profile.push({ label: 'Ametropía', value: 'Hipermetropía moderada', icon: TrendingUp, color: 'text-warning' });
    else profile.push({ label: 'Ametropía', value: 'Hipermetropía alta', icon: TrendingUp, color: 'text-destructive' });
  }

  // Astigmatism
  if (avgCyl !== null && Math.abs(avgCyl) >= 0.25) {
    const absCyl = Math.abs(avgCyl);
    const severity = absCyl >= 3 ? 'Alto' : absCyl >= 1.5 ? 'Moderado' : 'Leve';
    profile.push({ label: 'Astigmatismo', value: severity, icon: Activity, color: absCyl >= 3 ? 'text-destructive' : absCyl >= 1.5 ? 'text-warning' : 'text-muted-foreground' });
  }

  // Presbyopia
  const hasAdd = (odAdd !== null && odAdd > 0) || (oiAdd !== null && oiAdd > 0);
  if (hasAdd) {
    const maxAdd = Math.max(odAdd ?? 0, oiAdd ?? 0);
    const level = maxAdd >= 2.5 ? 'Avanzada' : maxAdd >= 1.5 ? 'Moderada' : 'Inicial';
    profile.push({ label: 'Presbicia', value: level, icon: Glasses, color: 'text-amber-500' });
  }

  // Risk
  profile.push({
    label: 'Riesgo visual',
    value: `${riskScore}/100 — ${riskLevel === 'low' ? 'Bajo' : riskLevel === 'moderate' ? 'Moderado' : riskLevel === 'high' ? 'Alto' : 'Muy alto'}`,
    icon: Shield,
    color: riskLevel === 'low' ? 'text-emerald-500' : riskLevel === 'moderate' ? 'text-warning' : 'text-destructive',
  });

  // Progression
  if (hasProgression) {
    const progLabel = progressionRate >= 0.75 ? 'Rápida' : progressionRate >= 0.25 ? 'Moderada' : 'Estable';
    profile.push({ label: 'Progresión', value: progLabel, icon: TrendingDown, color: progressionRate >= 0.75 ? 'text-destructive' : progressionRate >= 0.25 ? 'text-warning' : 'text-emerald-500' });
  }

  // Age group
  if (age !== null) {
    const grupo = age < 12 ? 'Pediátrico' : age < 18 ? 'Adolescente' : age < 40 ? 'Adulto joven' : age < 60 ? 'Adulto' : 'Adulto mayor';
    profile.push({ label: 'Grupo etario', value: grupo, icon: User, color: 'text-muted-foreground' });
  }

  // Occupation
  if (occupation) {
    profile.push({ label: 'Ocupación', value: occupation, icon: User, color: 'text-muted-foreground' });
  }

  return profile;
}

interface TechnicalSuggestion {
  lensType: string;
  options: { label: string; description: string }[];
  treatments: string[];
  justification: string;
}

function buildTechnicalSuggestion(
  odSph: number | null, odCyl: number | null, odAdd: number | null,
  oiSph: number | null, oiCyl: number | null, oiAdd: number | null,
  age: number | null, hasProgression: boolean,
): TechnicalSuggestion {
  const avgSph = avg(odSph, oiSph);
  const avgCyl = avg(odCyl, oiCyl);
  const se = avgSph !== null && avgCyl !== null ? avgSph + avgCyl / 2 : null;
  const absSe = se !== null ? Math.abs(se) : 0;
  const absCyl = avgCyl !== null ? Math.abs(avgCyl) : 0;
  const maxAdd = Math.max(odAdd ?? 0, oiAdd ?? 0);
  const hasAdd = maxAdd > 0;
  const isHighRx = absSe >= 4 || absCyl >= 2;

  const treatments: string[] = [];
  let lensType = 'Monofocal';
  let justification = '';

  // Lens type
  if (hasAdd) {
    lensType = maxAdd <= 1.25 ? 'Progresivo o Bifocal (ADD baja)' : 'Progresivo';
    justification = `ADD de ${maxAdd.toFixed(2)}D requiere corrección para visión intermedia y cercana.`;
  } else if (age !== null && age >= 40) {
    lensType = 'Monofocal (considerar progresivo preventivo)';
    justification = 'Paciente en rango presbicia sin ADD registrada.';
  } else {
    justification = 'Corrección de visión lejana.';
  }

  // High index
  if (isHighRx) {
    treatments.push('Alto índice (1.67+)');
    justification += ' Graduación elevada, alto índice recomendado.';
  }
  if (absCyl >= 2) treatments.push('Diseño tórico optimizado');
  if (age !== null && age >= 18 && age <= 45 && !hasAdd) treatments.push('Filtro luz azul');
  if (hasProgression && age !== null && age < 25) treatments.push('Control de miopía');
  treatments.push('Protección UV');
  treatments.push('Antirreflejante');

  // Build tiered options (replacing Básico/Premium language)
  const options: { label: string; description: string }[] = [
    {
      label: 'Opción funcional',
      description: `${lensType} con tratamiento estándar. Cumple necesidades visuales básicas.`,
    },
    {
      label: 'Opción intermedia',
      description: `${lensType} con antirreflejante y filtro UV${age !== null && age <= 45 ? ' + filtro luz azul' : ''}. Mejor confort visual.`,
    },
    {
      label: 'Opción avanzada',
      description: `${lensType}${isHighRx ? ' alto índice' : ''} con tratamientos completos${absCyl >= 2 ? ', diseño tórico' : ''}. Máxima calidad óptica.`,
    },
  ];

  return { lensType, options, treatments, justification: justification.trim() };
}

// ── Component ──────────────────────────────────────────────────

export function POSPatientIntelligence({ patientId, patientName, onAddToCart }: POSPatientIntelligenceProps) {
  const [intelligence, setIntelligence] = useState<PatientIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [rxData, setRxData] = useState<{
    odSph: number | null; odCyl: number | null; odAdd: number | null;
    oiSph: number | null; oiCyl: number | null; oiAdd: number | null;
    occupation: string | null;
  } | null>(null);

  useEffect(() => {
    if (!patientId) return;
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [patientRes, prescriptionsRes, salesRes] = await Promise.all([
        supabase.from('patients').select('id, first_name, last_name, birth_date, occupation').eq('id', patientId).maybeSingle(),
        supabase.from('patient_prescriptions').select('*').eq('patient_id', patientId).order('prescription_date', { ascending: false }).limit(10),
        supabase.from('sales').select('id, total, balance, status, created_at, next_payment_date').eq('patient_id', patientId).order('created_at', { ascending: false }),
      ]);

      const patient = patientRes.data;
      const prescriptions = prescriptionsRes.data || [];
      const sales = salesRes.data || [];
      if (!patient) { setLoading(false); return; }

      let age: number | null = null;
      if (patient.birth_date) {
        const bd = new Date(patient.birth_date);
        const today = new Date();
        age = today.getFullYear() - bd.getFullYear();
        if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--;
      }

      const examHistory: HistoricalExam[] = prescriptions.map((p: any) => ({
        examDate: p.prescription_date, odSphere: p.od_sphere, odCylinder: p.od_cylinder, oiSphere: p.oi_sphere, oiCylinder: p.oi_cylinder,
      }));

      const current = prescriptions[0] as any | undefined;
      const previous = prescriptions[1] as any | undefined;

      const totalPurchases = sales.length;
      const totalSpent = sales.reduce((s: number, sale: any) => s + (sale.total || 0), 0);
      const averageTicket = totalPurchases > 0 ? totalSpent / totalPurchases : 0;
      const lastPurchaseDaysAgo = sales.length > 0 ? Math.floor((Date.now() - new Date(sales[0].created_at).getTime()) / 86400000) : null;
      const pendingSales = sales.filter((s: any) => s.status === 'pending' || s.status === 'partial');
      const totalDebt = pendingSales.reduce((s: number, sale: any) => s + (sale.balance || 0), 0);
      const morosoSales = pendingSales.filter((s: any) => s.next_payment_date && new Date(s.next_payment_date) < new Date());
      const overdueDays = morosoSales.length > 0 ? Math.max(...morosoSales.map((s: any) => Math.floor((Date.now() - new Date(s.next_payment_date).getTime()) / 86400000))) : 0;

      setRxData({
        odSph: current?.od_sphere ?? null, odCyl: current?.od_cylinder ?? null, odAdd: current?.od_add ?? null,
        oiSph: current?.oi_sphere ?? null, oiCyl: current?.oi_cylinder ?? null, oiAdd: current?.oi_add ?? null,
        occupation: patient.occupation,
      });

      const result = computePatientIntelligence({
        patientId, patientName: `${patient.first_name} ${patient.last_name}`,
        patientAge: age, occupation: patient.occupation,
        odSph: current?.od_sphere ?? null, odCyl: current?.od_cylinder ?? null, odAxis: current?.od_axis ?? null, odAdd: current?.od_add ?? null,
        oiSph: current?.oi_sphere ?? null, oiCyl: current?.oi_cylinder ?? null, oiAxis: current?.oi_axis ?? null, oiAdd: current?.oi_add ?? null,
        examHistory,
        previousExam: previous ? { odSphere: previous.od_sphere, odCylinder: previous.od_cylinder, odAxis: previous.od_axis, oiSphere: previous.oi_sphere, oiCylinder: previous.oi_cylinder, oiAxis: previous.oi_axis, examDate: previous.prescription_date } : null,
        globalDiagnosis: '',
        financial: {
          status: overdueDays > 0 ? 'moroso' : totalDebt > 0 ? 'saldo_pendiente' : 'al_corriente',
          totalDebt, overdueDays, creditScore: null, hasCreditBlock: overdueDays > 90,
          totalPurchases, totalSpent, averageTicket, lastPurchaseDaysAgo,
        },
        hasPremiumLens: false, campaignResponses: 0, hasPendingDelivery: false,
      });

      setIntelligence(result);
    } catch (err) {
      console.error('Error loading patient intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  // Visual profile memo
  const visualProfile = useMemo(() => {
    if (!intelligence || !rxData) return null;
    const { clinical } = intelligence;
    const risk = clinical.predictive.riskScore;
    const maxRate = clinical.predictive.projections.length > 0
      ? Math.max(...clinical.predictive.projections.map(p => Math.abs(p.annualRate)))
      : 0;
    const hasProg = clinical.predictive.projections.some(p => p.isSignificant);

    const profile = buildVisualProfile(
      rxData.odSph, rxData.odCyl, rxData.odAdd,
      rxData.oiSph, rxData.oiCyl, rxData.oiAdd,
      intelligence.patientAge, rxData.occupation,
      risk.score, risk.level, hasProg, maxRate,
    );

    const suggestion = buildTechnicalSuggestion(
      rxData.odSph, rxData.odCyl, rxData.odAdd,
      rxData.oiSph, rxData.oiCyl, rxData.oiAdd,
      intelligence.patientAge, hasProg,
    );

    return { profile, suggestion };
  }, [intelligence, rxData]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2"><div className="h-5 w-40 bg-muted rounded" /></CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-4 w-1/2 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!intelligence) return null;

  const { clinical, signals, posRecommendations } = intelligence;

  const signalIcon = (level: PatientSignal['level']) => {
    if (level === 'critical') return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    if (level === 'warning') return <ShieldAlert className="h-3.5 w-3.5 text-warning" />;
    return <Info className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Análisis Visual Inteligente
          </CardTitle>
          <div className="flex items-center gap-2">
            {signals.filter(s => s.level === 'critical').length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                {signals.filter(s => s.level === 'critical').length} alerta(s)
              </Badge>
            )}
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-3">
          {/* ── Alertas Activas ── */}
          {signals.length > 0 && (
            <div className="space-y-1.5">
              {signals.slice(0, 3).map(sig => (
                <div key={sig.id} className="flex items-start gap-2 text-xs">
                  {signalIcon(sig.level)}
                  <div>
                    <span className="font-medium">{sig.title}</span>
                    <p className="text-muted-foreground leading-tight">{sig.description}</p>
                  </div>
                </div>
              ))}
              {signals.length > 3 && (
                <p className="text-[10px] text-muted-foreground text-right">+{signals.length - 3} más</p>
              )}
            </div>
          )}

          {signals.length > 0 && <Separator />}

          {/* ── Perfil Visual del Paciente ── */}
          {visualProfile && clinical.hasClinicalData ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Perfil Visual del Paciente
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {visualProfile.profile.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-start gap-2 px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/50">
                        <Icon className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', item.color)} />
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                          <p className="text-xs font-semibold truncate">{item.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* ── Sugerencia Técnica para Venta ── */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sugerencia Técnica para Venta
                  </span>
                </div>

                <div className="rounded-lg border border-border p-3 bg-gradient-to-br from-primary/5 to-primary/0">
                  <div className="flex items-center gap-2 mb-2">
                    <Glasses className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold">{visualProfile.suggestion.lensType}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">{visualProfile.suggestion.justification}</p>

                  {/* Tiered options */}
                  <div className="space-y-1.5 mb-2">
                    {visualProfile.suggestion.options.map((opt, i) => (
                      <div key={i} className="px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/50">
                        <p className="text-[11px] font-semibold">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{opt.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 mb-1">
                    <Sun className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tratamientos sugeridos</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {visualProfile.suggestion.treatments.map((t, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{t}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground italic">Sin datos clínicos registrados</p>
              <Separator />
            </>
          )}

          {/* ── Recomendaciones ── */}
          {posRecommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Recomendaciones
              </h4>
              <ScrollArea className="max-h-[160px]">
                <div className="space-y-1.5">
                  {posRecommendations.map(rec => (
                    <div
                      key={rec.id}
                      className={`p-2 rounded-md bg-muted/50 border-l-2 ${
                        rec.priority === 'high' ? 'border-l-destructive' :
                        rec.priority === 'medium' ? 'border-l-warning' :
                        'border-l-muted-foreground'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-tight">{rec.label}</p>
                          <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{rec.reason}</p>
                        </div>
                        {onAddToCart && !rec.id.startsWith('pos_credit') && !rec.id.startsWith('pos_followup') && !rec.id.startsWith('pos_saldo') && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onAddToCart(rec)}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">Agregar recomendación</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Add recommendation button */}
          {onAddToCart && posRecommendations.length > 0 && (
            <>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs gap-1.5"
                onClick={() => onAddToCart(posRecommendations[0])}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar recomendación
              </Button>
            </>
          )}

          {/* Disclaimer */}
          <Alert className="py-1.5 px-2.5 border-muted bg-muted/30">
            <AlertDescription className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1">
              <Info className="h-3 w-3 shrink-0" />
              Sugerencias basadas en datos clínicos. El especialista determina la indicación final.
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
