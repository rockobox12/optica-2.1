import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightLeft, Check, X, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingRequest {
  id: string;
  from_branch_name: string;
  to_branch_name: string;
  reason: string;
  notes: string | null;
  requester_name: string;
  requested_at: string;
  status: string;
}

interface PendingTransferBannerProps {
  patientId: string;
  refreshTrigger?: number;
  onTransferred?: () => void;
}

export function PendingTransferBanner({ patientId, refreshTrigger, onTransferred }: PendingTransferBannerProps) {
  const { isAdmin, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const canView = isAdmin() || hasAnyRole(['gerente']);

  useEffect(() => {
    if (canView) fetchRequests();
  }, [patientId, refreshTrigger, canView]);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('patient_transfer_requests')
      .select('id, from_branch_id, to_branch_id, reason, notes, requested_by, requested_at, status')
      .eq('patient_id', patientId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (!data || data.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const branchIds = new Set<string>();
    const userIds = new Set<string>();
    data.forEach((r: any) => {
      branchIds.add(r.from_branch_id);
      branchIds.add(r.to_branch_id);
      if (r.requested_by) userIds.add(r.requested_by);
    });

    const [branchRes, profileRes] = await Promise.all([
      supabase.from('branches').select('id, name').in('id', Array.from(branchIds)),
      supabase.from('profiles').select('user_id, full_name').in('user_id', Array.from(userIds)),
    ]);

    const branchMap: Record<string, string> = {};
    (branchRes.data || []).forEach((b: any) => { branchMap[b.id] = b.name; });
    const userMap: Record<string, string> = {};
    (profileRes.data || []).forEach((p: any) => { userMap[p.user_id] = p.full_name; });

    setRequests(
      data.map((r: any) => ({
        id: r.id,
        from_branch_name: branchMap[r.from_branch_id] || '—',
        to_branch_name: branchMap[r.to_branch_id] || '—',
        reason: r.reason,
        notes: r.notes,
        requester_name: userMap[r.requested_by] || '—',
        requested_at: r.requested_at,
        status: r.status,
      }))
    );
    setLoading(false);
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase.rpc('approve_transfer_request', {
        p_request_id: requestId,
        p_review_notes: reviewNotes.trim() || null,
      });
      if (error) throw error;
      toast({ title: 'Transferencia aprobada', description: 'El paciente ha sido transferido exitosamente.' });
      setReviewNotes('');
      fetchRequests();
      onTransferred?.();
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
      toast({ title: 'Solicitud rechazada', description: 'Se ha rechazado la solicitud de transferencia.' });
      setReviewNotes('');
      setShowRejectInput(null);
      fetchRequests();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || requests.length === 0) return null;

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <Card key={req.id} className="border-warning/40 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                    Transferencia pendiente
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(req.requested_at), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">De</span>{' '}
                  <strong>{req.from_branch_name}</strong>{' '}
                  <span className="text-muted-foreground">a</span>{' '}
                  <strong>{req.to_branch_name}</strong>
                </p>
                <p className="text-sm text-muted-foreground">Motivo: {req.reason}</p>
                {req.notes && <p className="text-xs text-muted-foreground italic">{req.notes}</p>}
                <p className="text-xs text-muted-foreground">Solicitó: {req.requester_name}</p>

                {isAdmin() && (
                  <div className="pt-2 space-y-2 border-t border-border mt-2">
                    {showRejectInput === req.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Motivo del rechazo..."
                          rows={2}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                            className="gap-1"
                          >
                            {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                            Confirmar rechazo
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setShowRejectInput(null); setReviewNotes(''); }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id)}
                          disabled={!!actionLoading}
                          className="gap-1"
                        >
                          {actionLoading === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Aprobar transferencia
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowRejectInput(req.id)}
                          disabled={!!actionLoading}
                          className="gap-1"
                        >
                          <X className="h-3 w-3" />
                          Rechazar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
