import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, Check, X, Loader2, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransferRequest {
  id: string;
  patient_name: string;
  patient_id: string;
  from_branch_name: string;
  to_branch_name: string;
  reason: string;
  notes: string | null;
  requester_name: string;
  requested_at: string;
  status: string;
  review_notes: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
}

export function TransferRequestsPanel() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('patient_transfer_requests')
      .select('id, patient_id, from_branch_id, to_branch_id, reason, notes, requested_by, requested_at, status, review_notes, reviewed_by, reviewed_at')
      .order('requested_at', { ascending: false })
      .limit(50);

    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Collect IDs to resolve
    const patientIds = new Set<string>();
    const branchIds = new Set<string>();
    const userIds = new Set<string>();
    data.forEach((r: any) => {
      patientIds.add(r.patient_id);
      branchIds.add(r.from_branch_id);
      branchIds.add(r.to_branch_id);
      if (r.requested_by) userIds.add(r.requested_by);
      if (r.reviewed_by) userIds.add(r.reviewed_by);
    });

    const [patientRes, branchRes, profileRes] = await Promise.all([
      supabase.from('patients').select('id, first_name, last_name').in('id', Array.from(patientIds)),
      supabase.from('branches').select('id, name').in('id', Array.from(branchIds)),
      supabase.from('profiles').select('user_id, full_name').in('user_id', Array.from(userIds)),
    ]);

    const patientMap: Record<string, string> = {};
    (patientRes.data || []).forEach((p: any) => { patientMap[p.id] = `${p.first_name} ${p.last_name}`; });
    const branchMap: Record<string, string> = {};
    (branchRes.data || []).forEach((b: any) => { branchMap[b.id] = b.name; });
    const userMap: Record<string, string> = {};
    (profileRes.data || []).forEach((p: any) => { userMap[p.user_id] = p.full_name; });

    setRequests(
      data.map((r: any) => ({
        id: r.id,
        patient_id: r.patient_id,
        patient_name: patientMap[r.patient_id] || '—',
        from_branch_name: branchMap[r.from_branch_id] || '—',
        to_branch_name: branchMap[r.to_branch_id] || '—',
        reason: r.reason,
        notes: r.notes,
        requester_name: userMap[r.requested_by] || '—',
        requested_at: r.requested_at,
        status: r.status,
        review_notes: r.review_notes,
        reviewer_name: r.reviewed_by ? (userMap[r.reviewed_by] || '—') : null,
        reviewed_at: r.reviewed_at,
      }))
    );
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase.rpc('approve_transfer_request', {
        p_request_id: requestId,
      });
      if (error) throw error;
      toast({ title: 'Transferencia aprobada', description: 'El paciente ha sido transferido.' });
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!reviewNotes.trim()) {
      toast({ title: 'Motivo requerido', description: 'Escribe un motivo para el rechazo.', variant: 'destructive' });
      return;
    }
    setActionLoading(requestId);
    try {
      const { error } = await supabase.rpc('reject_transfer_request', {
        p_request_id: requestId,
        p_review_notes: reviewNotes.trim(),
      });
      if (error) throw error;
      toast({ title: 'Solicitud rechazada' });
      setRejectId(null);
      setReviewNotes('');
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">Pendiente</Badge>;
      case 'approved': return <Badge variant="default" className="text-xs">Aprobada</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-xs">Rechazada</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          Solicitudes de Transferencia
        </CardTitle>
        <CardDescription>
          Gestiona las solicitudes de transferencia de pacientes entre sucursales
        </CardDescription>
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            Pendientes
          </Button>
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">
              {filter === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes registradas'}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/5 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paciente</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">De → A</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Motivo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Solicitó</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-border last:border-b-0 hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{req.patient_name}</td>
                    <td className="px-4 py-3 text-xs">
                      {req.from_branch_name} → {req.to_branch_name}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                      {req.reason}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {req.requester_name}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {format(new Date(req.requested_at), "dd/MM/yy HH:mm", { locale: es })}
                    </td>
                    <td className="px-4 py-3">{statusBadge(req.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'pending' ? (
                        rejectId === req.id ? (
                          <div className="space-y-2 text-left">
                            <Textarea
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              placeholder="Motivo del rechazo..."
                              rows={2}
                              className="text-xs"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)} disabled={!!actionLoading} className="h-7 text-xs gap-1">
                                {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                Rechazar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setReviewNotes(''); }} className="h-7 text-xs">
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" onClick={() => handleApprove(req.id)} disabled={!!actionLoading} className="h-7 text-xs gap-1">
                              {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Aprobar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRejectId(req.id)} disabled={!!actionLoading} className="h-7 text-xs gap-1">
                              <X className="h-3 w-3" />
                              Rechazar
                            </Button>
                          </div>
                        )
                      ) : (
                        req.review_notes && (
                          <span className="text-xs text-muted-foreground italic" title={req.review_notes}>
                            <FileText className="h-3 w-3 inline mr-1" />
                            {req.review_notes.substring(0, 30)}...
                          </span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
