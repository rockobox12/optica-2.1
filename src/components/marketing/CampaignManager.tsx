import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send, Pause, Play, Eye, Trash2, Mail, MessageSquare, Phone, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

const channelIcons: Record<string, React.ElementType> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
};

export function CampaignManager() {
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    campaign_type: 'whatsapp',
    message_content: '',
    message_subject: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch patient count for targeting
  const { data: patientCount = 0 } = useQuery({
    queryKey: ['patient-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      if (error) throw error;
      return count || 0;
    },
  });

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .insert({
          name: newCampaign.name,
          description: newCampaign.description,
          campaign_type: newCampaign.campaign_type,
          status: 'draft',
          total_recipients: patientCount,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create message
      const { error: messageError } = await supabase
        .from('campaign_messages')
        .insert({
          campaign_id: campaign.id,
          channel: newCampaign.campaign_type,
          subject: newCampaign.message_subject || null,
          content: newCampaign.message_content,
        });

      if (messageError) throw messageError;

      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setShowCreate(false);
      setNewCampaign({ name: '', description: '', campaign_type: 'whatsapp', message_content: '', message_subject: '' });
      toast({ title: 'Campaña creada exitosamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ 
          status,
          started_at: status === 'active' ? new Date().toISOString() : undefined,
          completed_at: status === 'completed' ? new Date().toISOString() : undefined,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast({ title: 'Estado actualizado' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      toast({ title: 'Campaña eliminada' });
    },
  });

  const ChannelIcon = channelIcons[newCampaign.campaign_type] || MessageSquare;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campañas de Marketing</h3>
          <p className="text-sm text-muted-foreground">
            {patientCount} pacientes activos disponibles
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Campaña
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Campaña</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre de la campaña</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="Ej: Promoción de Verano"
                />
              </div>

              <div>
                <Label>Descripción</Label>
                <Input
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  placeholder="Descripción breve..."
                />
              </div>

              <div>
                <Label>Canal</Label>
                <Select
                  value={newCampaign.campaign_type}
                  onValueChange={(v) => setNewCampaign({ ...newCampaign, campaign_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        SMS
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newCampaign.campaign_type === 'email' && (
                <div>
                  <Label>Asunto del correo</Label>
                  <Input
                    value={newCampaign.message_subject}
                    onChange={(e) => setNewCampaign({ ...newCampaign, message_subject: e.target.value })}
                    placeholder="Asunto..."
                  />
                </div>
              )}

              <div>
                <Label>Mensaje</Label>
                <Textarea
                  value={newCampaign.message_content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, message_content: e.target.value })}
                  placeholder="Escribe tu mensaje aquí... Usa {{nombre}} para personalizar"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variables: {'{{nombre}}'}, {'{{telefono}}'}, {'{{email}}'}
                </p>
              </div>

              <div className="p-3 bg-muted rounded-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">
                  Se enviará a <strong>{patientCount}</strong> pacientes activos
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={() => createMutation.mutate()}
                  disabled={!newCampaign.name || !newCampaign.message_content || createMutation.isPending}
                >
                  Crear Campaña
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaña</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Destinatarios</TableHead>
                <TableHead className="text-center">Enviados</TableHead>
                <TableHead className="text-center">Abiertos</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const ChannelIcon = channelIcons[campaign.campaign_type] || MessageSquare;
                const openRate = campaign.sent_count > 0 
                  ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1)
                  : '0';

                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {campaign.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <ChannelIcon className="h-3 w-3" />
                        {campaign.campaign_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[campaign.status]}>
                        {statusLabels[campaign.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{campaign.total_recipients}</TableCell>
                    <TableCell className="text-center">{campaign.sent_count}</TableCell>
                    <TableCell className="text-center">
                      {campaign.opened_count} ({openRate}%)
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(campaign.created_at), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {campaign.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: 'active' })}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === 'active' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: 'paused' })}
                          >
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateStatusMutation.mutate({ id: campaign.id, status: 'active' })}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {campaign.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => deleteMutation.mutate(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay campañas creadas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
