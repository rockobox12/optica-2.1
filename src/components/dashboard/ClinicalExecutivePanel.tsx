import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Crown,
  Eye,
  Target,
  TrendingDown,
  Users,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface ClinicalStats {
  totalPatients: number;
  myopiaCount: number;
  highAstigmatismCount: number;
  presbyopiaCount: number;
  highMyopiaCount: number;
  averageSph: number;
  highRiskCount: number;
  premiumPotentialCount: number;
  progressionActiveCount: number;
  followupNeededCount: number;
  ageDistribution: { range: string; count: number }[];
  diagnosisDistribution: { name: string; value: number; color: string }[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(var(--success))',
  'hsl(var(--secondary))',
];

export function ClinicalExecutivePanel() {
  const [stats, setStats] = useState<ClinicalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClinicalStats() {
      try {
        const { data: prescriptions } = await supabase
          .from('patient_prescriptions')
          .select('od_sphere, oi_sphere, od_cylinder, oi_cylinder, od_add, oi_add, patient_id, exam_date')
          .eq('status', 'VIGENTE')
          .order('exam_date', { ascending: false })
          .limit(500);

        if (!prescriptions || prescriptions.length === 0) {
          setStats(null);
          setLoading(false);
          return;
        }

        // Deduplicate by patient (keep latest)
        const latestByPatient = new Map<string, typeof prescriptions[0]>();
        prescriptions.forEach(p => {
          if (!latestByPatient.has(p.patient_id)) {
            latestByPatient.set(p.patient_id, p);
          }
        });
        const unique = Array.from(latestByPatient.values());

        let myopiaCount = 0;
        let highMyopiaCount = 0;
        let highAstigmatismCount = 0;
        let presbyopiaCount = 0;
        let sphSum = 0;
        let sphCount = 0;
        let highRiskCount = 0;
        let premiumPotentialCount = 0;
        let progressionActiveCount = 0;

        unique.forEach(p => {
          const minSph = Math.min(p.od_sphere ?? 0, p.oi_sphere ?? 0);
          const maxAbsCyl = Math.max(Math.abs(p.od_cylinder ?? 0), Math.abs(p.oi_cylinder ?? 0));
          const hasAdd = (p.od_add && p.od_add >= 0.75) || (p.oi_add && p.oi_add >= 0.75);
          const maxAbsSph = Math.max(Math.abs(p.od_sphere ?? 0), Math.abs(p.oi_sphere ?? 0));

          if (minSph <= -0.50) myopiaCount++;
          if (minSph <= -6.00) highMyopiaCount++;
          if (maxAbsCyl >= 2.00) highAstigmatismCount++;
          if (hasAdd) presbyopiaCount++;

          // Risk approximation
          let riskPts = 0;
          if (minSph <= -6.00) riskPts += 30;
          else if (minSph <= -3.00) riskPts += 20;
          if (maxAbsCyl >= 2.00) riskPts += 15;
          if (riskPts >= 30) highRiskCount++;

          // Premium potential: high Rx or presbyopia
          if (maxAbsSph >= 3.00 || hasAdd || maxAbsCyl >= 2.00) premiumPotentialCount++;

          if (p.od_sphere !== null) { sphSum += p.od_sphere; sphCount++; }
          if (p.oi_sphere !== null) { sphSum += p.oi_sphere; sphCount++; }
        });

        // Get age distribution from patients
        const patientIds = unique.map(p => p.patient_id);
        const { data: patients } = await supabase
          .from('patients')
          .select('id, birth_date')
          .in('id', patientIds.slice(0, 100));

        const ageRanges = { '0-17': 0, '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
        if (patients) {
          const now = new Date();
          patients.forEach(pt => {
            if (!pt.birth_date) return;
            const age = Math.floor((now.getTime() - new Date(pt.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (age < 18) ageRanges['0-17']++;
            else if (age <= 35) ageRanges['18-35']++;
            else if (age <= 50) ageRanges['36-50']++;
            else if (age <= 65) ageRanges['51-65']++;
            else ageRanges['65+']++;
          });
        }

        const total = unique.length;
        const emmetropeCount = total - myopiaCount - (total - myopiaCount > 0 ? 0 : 0);
        const hyperopiaCount = Math.max(0, total - myopiaCount - highAstigmatismCount);

        setStats({
          totalPatients: total,
          myopiaCount,
          highMyopiaCount,
          highAstigmatismCount,
          presbyopiaCount,
          averageSph: sphCount > 0 ? sphSum / sphCount : 0,
          highRiskCount,
          premiumPotentialCount,
          progressionActiveCount: 0, // Would need multi-exam comparison
          followupNeededCount: highRiskCount,
          ageDistribution: Object.entries(ageRanges).map(([range, count]) => ({ range, count })),
          diagnosisDistribution: [
            { name: 'Miopía', value: myopiaCount, color: CHART_COLORS[0] },
            { name: 'Astigmatismo alto', value: highAstigmatismCount, color: CHART_COLORS[2] },
            { name: 'Presbicia', value: presbyopiaCount, color: CHART_COLORS[3] },
            { name: 'Miopía alta', value: highMyopiaCount, color: CHART_COLORS[4] },
          ].filter(d => d.value > 0),
        });
      } catch (err) {
        console.error('[ClinicalExecutivePanel] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClinicalStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Cargando métricas clínicas...
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const pct = (v: number) => stats.totalPatients > 0 ? ((v / stats.totalPatients) * 100).toFixed(0) : '0';

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3 bg-primary/5">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Panel Ejecutivo Clínico
          <Badge variant="outline" className="text-[10px] ml-auto">
            {stats.totalPatients} pacientes
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MiniKPI
            icon={Eye}
            label="Miopía"
            value={`${pct(stats.myopiaCount)}%`}
            detail={`${stats.myopiaCount} pacientes`}
            color="text-primary"
          />
          <MiniKPI
            icon={TrendingDown}
            label="Miopía alta"
            value={`${pct(stats.highMyopiaCount)}%`}
            detail={`${stats.highMyopiaCount} pacientes`}
            color="text-destructive"
          />
          <MiniKPI
            icon={AlertTriangle}
            label="Astig. severo"
            value={`${pct(stats.highAstigmatismCount)}%`}
            detail={`${stats.highAstigmatismCount} pacientes`}
            color="text-warning"
          />
          <MiniKPI
            icon={Users}
            label="Presbicia"
            value={`${pct(stats.presbyopiaCount)}%`}
            detail={`${stats.presbyopiaCount} pacientes`}
            color="text-accent"
          />
          <MiniKPI
            icon={Target}
            label="Alto riesgo"
            value={`${stats.highRiskCount}`}
            detail="Necesitan seguimiento"
            color="text-destructive"
          />
          <MiniKPI
            icon={Crown}
            label="Premium potencial"
            value={`${stats.premiumPotentialCount}`}
            detail="Candidatos premium"
            color="text-amber-500"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Diagnosis Distribution */}
          {stats.diagnosisDistribution.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Distribución por Diagnóstico
              </p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.diagnosisDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.diagnosisDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [`${value} pacientes`, name]}
                      contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {stats.diagnosisDistribution.map((d, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Age Distribution */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Distribución por Edad
            </p>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip
                    formatter={(value: number) => [`${value} pacientes`]}
                    contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniKPI({ icon: Icon, label, value, detail, color }: {
  icon: typeof Eye;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 bg-card">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
