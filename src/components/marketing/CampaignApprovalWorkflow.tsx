import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCampaignAI } from '@/hooks/useCampaignAI';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Send, 
  Pause,
  Eye,
  AlertTriangle,
  Shield,
  Calendar,
  MessageSquare,
  Mail,
  Phone
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: Clock },
  ready_for_review: { label: 'Pendiente Revisión', color: 'bg-blue-100 text-blue-800', icon: Eye },
  approved: { label: 'Aprobada', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  scheduled: { label: 'Programada', color: 'bg-purple-100 text-purple-800', icon: Calendar },
  sent: { label: 'Enviada', color: 'bg-emerald-100 text-emerald-800', icon: Send },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle },
  paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800', icon: Pause },
};

const channelIcons: Record<string, React.ElementType> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
};

export function CampaignApprovalWorkflow() {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  
  const { toast } = useToast();
  const { roles, user } = useAuth();
  const { logAudit } = useCampaignAI();
  const queryClient = useQueryClient();
  const isAdmin = roles?.includes('admin');

  // Fetch campaigns pending review
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns-for-review'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .in('status', ['draft', 'ready_for_review', 'approved', 'scheduled'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation for status updates
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      campaignId, 
      newStatus, 
      notes 
    }: { 
      campaignId: string; 
      newStatus: string; 
      notes?: string 
    }) => {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (!campaign) throw new Error('Campaign not found');

      const updates: Record<string, any> = { status: newStatus };
      
      if (newStatus === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('marketing_campaigns')
        .update(updates)
        .eq('id', campaignId);

      if (error) throw error;

      // Log audit
      await logAudit(
        campaignId,
        `status_change_${newStatus}`,
        campaign.status,
        newStatus,
        notes
      );

      return { campaignId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns-for-review'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setShowApprovalDialog(false);
      setApprovalNotes('');
      toast({ 
        title: approvalAction === 'approve' ? 'Campaña aprobada' : 'Campaña rechazada' 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  const handleApprovalAction = (campaign: any, action: 'approve' | 'reject') => {
    setSelectedCampaign(campaign);
    setApprovalAction(action);
    setShowApprovalDialog(true);
  };

  const confirmApproval = () => {
    if (!selectedCampaign) return;
    
    const newStatus = approvalAction === 'approve' ? 'approved' : 'cancelled';
    updateStatusMutation.mutate({
      campaignId: selectedCampaign.id,
      newStatus,
      notes: approvalNotes,
    });
  };

  const submitForReview = (campaignId: string) => {
    updateStatusMutation.mutate({
      campaignId,
      newStatus: 'ready_for_review',
    });
  };

  const scheduleCampaign = (campaignId: string) => {
    updateStatusMutation.mutate({
      campaignId,
      newStatus: 'scheduled',
    });
  };

  const pendingReview = campaigns.filter(c => c.status === 'ready_for_review');
  const drafts = campaigns.filter(c => c.status === 'draft');
  const approved = campaigns.filter(c => ['approved', 'scheduled'].includes(c.status));

  return (
    <div className="space-y-6">
      {/* Admin Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Control de Aprobaciones:</strong> Solo administradores pueden aprobar campañas para envío.
          Todas las acciones quedan registradas en auditoría.
        </AlertDescription>
      </Alert>

      {/* Pending Review Section */}
      {isAdmin && pendingReview.length > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="bg-blue-50">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Eye className="h-5 w-5" />
              Campañas Pendientes de Aprobación ({pendingReview.length})
            </CardTitle>
            <CardDescription>
              Revisa y aprueba campañas antes de que puedan ser enviadas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>IA</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingReview.map((campaign) => {
                  const ChannelIcon = channelIcons[campaign.campaign_type] || MessageSquare;
                  
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {campaign.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <ChannelIcon className="h-3 w-3" />
                          {campaign.campaign_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.total_recipients}</TableCell>
                      <TableCell>
                        {campaign.ai_generated && (
                          <Badge variant="secondary" className="text-xs">IA</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(parseISO(campaign.created_at), 'dd MMM', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleApprovalAction(campaign, 'approve')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleApprovalAction(campaign, 'reject')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Borradores ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((campaign) => {
                  const StatusIcon = statusConfig[campaign.status]?.icon || Clock;
                  
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <p className="font-medium">{campaign.name}</p>
                      </TableCell>
                      <TableCell>{campaign.campaign_type}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={statusConfig[campaign.status]?.color}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[campaign.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => submitForReview(campaign.id)}
                          disabled={updateStatusMutation.isPending}
                        >
                          Enviar a Revisión
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approved/Scheduled Section */}
      {approved.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Aprobadas y Programadas ({approved.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaña</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Aprobada</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.map((campaign) => {
                  const StatusIcon = statusConfig[campaign.status]?.icon || Clock;
                  
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell>
                        <p className="font-medium">{campaign.name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={statusConfig[campaign.status]?.color}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[campaign.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.approved_at && format(parseISO(campaign.approved_at), 'dd MMM HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        {campaign.status === 'approved' && isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => scheduleCampaign(campaign.id)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Programar Envío
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Aprobar Campaña' : 'Rechazar Campaña'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedCampaign.name}</p>
                <p className="text-sm text-muted-foreground">{selectedCampaign.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{selectedCampaign.campaign_type}</Badge>
                  <Badge variant="secondary">{selectedCampaign.total_recipients} destinatarios</Badge>
                </div>
              </div>

              {approvalAction === 'reject' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Esta acción cancelará la campaña. El creador será notificado.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Notas {approvalAction === 'reject' && '(requerido)'}
                </label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder={
                    approvalAction === 'approve' 
                      ? 'Notas opcionales...' 
                      : 'Motivo del rechazo...'
                  }
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={updateStatusMutation.isPending || (approvalAction === 'reject' && !approvalNotes)}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
            >
              {approvalAction === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
