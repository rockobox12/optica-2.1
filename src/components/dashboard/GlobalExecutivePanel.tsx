import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Activity,
  AlertTriangle,
  Crown,
  DollarSign,
  Truck,
  CalendarClock,
  TrendingUp,
  Users,
  ShieldAlert,
} from 'lucide-react';
import type { GlobalExecutiveMetrics } from '@/lib/patient-intelligence-service';

function MiniKPI({ icon: Icon, label, value, detail, color }: {
  icon: typeof Activity;
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

export function GlobalExecutivePanel() {
  const { profile } = useAuth();
  const [metrics, setMetrics] = useState<GlobalExecutiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const branchId = profile?.defaultBranchId;

        // Parallel queries for all engines
        const [
          prescriptionsRes,
          delinquentRes,
          deliveriesRes,
          monthlySalesRes,
        ] = await Promise.all([
          // Clinical: high risk patients (SPH ≤ -6 or CYL ≥ 2)
          supabase
            .from('patient_prescriptions')
            .select('patient_id, od_sphere, oi_sphere, od_cylinder, oi_cylinder, od_add, oi_add')
            .eq('status', 'VIGENTE')
            .order('exam_date', { ascending: false })
            .limit(500),

          // Financial: moroso patients
          supabase
            .from('sales')
            .select('patient_id, balance, status')
            .gt('balance', 0)
            .in('status', ['pending', 'partial'])
            .limit(500),

          // Deliveries: pending
          supabase
            .from('appointments')
            .select('id')
            .eq('appointment_type', 'delivery')
            .in('status', ['scheduled', 'confirmed'])
            .limit(200),

          // Monthly sales projection
          supabase
            .from('sales')
            .select('total')
            .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
            .limit(1000),
        ]);

        // Process clinical
        const rxData = prescriptionsRes.data || [];
        const latestByPatient = new Map<string, typeof rxData[0]>();
        rxData.forEach(p => {
          if (!latestByPatient.has(p.patient_id)) latestByPatient.set(p.patient_id, p);
        });
        const uniqueRx = Array.from(latestByPatient.values());

        let highRisk = 0;
        let premiumPotential = 0;
        let followupNeeded = 0;

        uniqueRx.forEach(p => {
          const minSph = Math.min(p.od_sphere ?? 0, p.oi_sphere ?? 0);
          const maxAbsCyl = Math.max(Math.abs(p.od_cylinder ?? 0), Math.abs(p.oi_cylinder ?? 0));
          const maxAbsSph = Math.max(Math.abs(p.od_sphere ?? 0), Math.abs(p.oi_sphere ?? 0));
          const hasAdd = (p.od_add && p.od_add >= 0.75) || (p.oi_add && p.oi_add >= 0.75);

          let risk = 0;
          if (minSph <= -6.00) risk += 30;
          else if (minSph <= -3.00) risk += 20;
          if (maxAbsCyl >= 2.00) risk += 15;
          if (risk >= 30) highRisk++;
          if (risk >= 20) followupNeeded++;
          if (maxAbsSph >= 3.00 || hasAdd || maxAbsCyl >= 2.00) premiumPotential++;
        });

        // Process financial
        const salesData = delinquentRes.data || [];
        const delinquentPatients = new Set(salesData.map(s => s.patient_id)).size;

        // Process deliveries
        const pendingDeliveries = deliveriesRes.data?.length || 0;

        // Monthly projection
        const monthSales = monthlySalesRes.data || [];
        const totalMonthly = monthSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const dayOfMonth = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const projectedMonthly = dayOfMonth > 0 ? (totalMonthly / dayOfMonth) * daysInMonth : 0;

        setMetrics({
          highClinicalRisk: highRisk,
          highCommercialValue: premiumPotential,
          activeDelinquency: delinquentPatients,
          pendingDeliveries,
          pendingFollowups: followupNeeded,
          monthlyProjection: projectedMonthly,
          totalActivePatients: uniqueRx.length,
        });
      } catch (err) {
        console.error('[GlobalExecutivePanel] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [profile?.defaultBranchId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          Cargando inteligencia ejecutiva...
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const fmt = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3 bg-primary/5">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Panel Ejecutivo Global
          <Badge variant="outline" className="text-[10px] ml-auto">
            {metrics.totalActivePatients} pacientes activos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <MiniKPI
            icon={ShieldAlert}
            label="Alto riesgo clínico"
            value={`${metrics.highClinicalRisk}`}
            detail="Necesitan seguimiento"
            color="text-destructive"
          />
          <MiniKPI
            icon={Crown}
            label="Alto valor comercial"
            value={`${metrics.highCommercialValue}`}
            detail="Potencial premium"
            color="text-amber-500"
          />
          <MiniKPI
            icon={AlertTriangle}
            label="Morosidad activa"
            value={`${metrics.activeDelinquency}`}
            detail="Pacientes con deuda"
            color="text-destructive"
          />
          <MiniKPI
            icon={Truck}
            label="Entregas pendientes"
            value={`${metrics.pendingDeliveries}`}
            detail="Por entregar"
            color="text-warning"
          />
          <MiniKPI
            icon={CalendarClock}
            label="Requieren seguimiento"
            value={`${metrics.pendingFollowups}`}
            detail="Revisiones recomendadas"
            color="text-primary"
          />
          <MiniKPI
            icon={TrendingUp}
            label="Proyección mensual"
            value={fmt(metrics.monthlyProjection)}
            detail="Estimado del mes"
            color="text-success"
          />
          <MiniKPI
            icon={Users}
            label="Pacientes activos"
            value={`${metrics.totalActivePatients}`}
            detail="Con graduación vigente"
            color="text-primary"
          />
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 text-center italic">
          Datos consolidados de los motores Clínico, Comercial, Financiero y Automatización
        </p>
      </CardContent>
    </Card>
  );
}
