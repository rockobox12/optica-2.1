import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, ArrowRight } from 'lucide-react';

interface Transfer {
  id: string;
  from_branch_name: string;
  to_branch_name: string;
  reason: string;
  notes: string | null;
  transferred_by_name: string;
  transferred_at: string;
  pending_balance: number;
}

interface PatientTransferHistoryProps {
  patientId: string;
  refreshTrigger?: number;
}

export function PatientTransferHistory({ patientId, refreshTrigger }: PatientTransferHistoryProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, [patientId, refreshTrigger]);

  const fetchTransfers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_transfers')
      .select('id, reason, notes, transferred_by, transferred_at, pending_balance, from_branch_id, to_branch_id')
      .eq('patient_id', patientId)
      .order('transferred_at', { ascending: false });

    if (!data || data.length === 0) {
      setTransfers([]);
      setLoading(false);
      return;
    }

    // Resolve branch names and user names
    const branchIds = new Set<string>();
    const userIds = new Set<string>();
    data.forEach((t: any) => {
      branchIds.add(t.from_branch_id);
      branchIds.add(t.to_branch_id);
      if (t.transferred_by) userIds.add(t.transferred_by);
    });

    const [branchRes, profileRes] = await Promise.all([
      supabase.from('branches').select('id, name').in('id', Array.from(branchIds)),
      supabase.from('profiles').select('user_id, full_name').in('user_id', Array.from(userIds)),
    ]);

    const branchMap: Record<string, string> = {};
    (branchRes.data || []).forEach((b: any) => { branchMap[b.id] = b.name; });

    const userMap: Record<string, string> = {};
    (profileRes.data || []).forEach((p: any) => { userMap[p.user_id] = p.full_name; });

    setTransfers(
      data.map((t: any) => ({
        id: t.id,
        from_branch_name: branchMap[t.from_branch_id] || '—',
        to_branch_name: branchMap[t.to_branch_id] || '—',
        reason: t.reason,
        notes: t.notes,
        transferred_by_name: userMap[t.transferred_by] || '—',
        transferred_at: t.transferred_at,
        pending_balance: t.pending_balance || 0,
      }))
    );
    setLoading(false);
  };

  if (loading) return null;
  if (transfers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          Historial de Transferencias
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transfers.map((t) => (
            <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border text-sm">
              <ArrowRightLeft className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{t.from_branch_name}</Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="default" className="text-xs">{t.to_branch_name}</Badge>
                </div>
                <p className="text-muted-foreground">{t.reason}</p>
                {t.notes && <p className="text-xs text-muted-foreground italic">{t.notes}</p>}
                {t.pending_balance > 0 && (
                  <p className="text-xs text-warning">Saldo pendiente al transferir: ${t.pending_balance.toFixed(2)}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {format(new Date(t.transferred_at), "dd/MM/yyyy HH:mm", { locale: es })} — {t.transferred_by_name}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
