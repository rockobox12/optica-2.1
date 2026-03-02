import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, MessageSquare, Calendar, Gift, ShoppingBag, Clock, UserX } from 'lucide-react';

const triggerIcons: Record<string, React.ElementType> = {
  birthday: Gift,
  appointment_reminder: Calendar,
  post_purchase: ShoppingBag,
  prescription_expiry: Clock,
  inactive_customer: UserX,
};

const triggerLabels: Record<string, string> = {
  birthday: 'Cumpleaños',
  appointment_reminder: 'Recordatorio de Cita',
  post_purchase: 'Post-Compra',
  prescription_expiry: 'Receta por Vencer',
  inactive_customer: 'Cliente Inactivo',
};

export function AutomatedMessages() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'birthday',
    message_template: '',
    channels: ['whatsapp'],
    send_time: '09:00',
    days_offset: 0,
    is_active: true,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch automated messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['automated-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automated_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingMessage) {
        const { error } = await supabase
          .from('automated_messages')
          .update({
            name: formData.name,
            trigger_type: formData.trigger_type,
            message_template: formData.message_template,
            channels: formData.channels,
            send_time: formData.send_time,
            days_offset: formData.days_offset,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMessage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('automated_messages').insert({
          name: formData.name,
          trigger_type: formData.trigger_type,
          message_template: formData.message_template,
          channels: formData.channels,
          send_time: formData.send_time,
          days_offset: formData.days_offset,
          is_active: formData.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automated-messages'] });
      handleCloseDialog();
      toast({ title: editingMessage ? 'Mensaje actualizado' : 'Mensaje creado' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('automated_messages')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automated-messages'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automated_messages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automated-messages'] });
      toast({ title: 'Mensaje eliminado' });
    },
  });

  const handleEdit = (message: any) => {
    setEditingMessage(message);
    setFormData({
      name: message.name,
      trigger_type: message.trigger_type,
      message_template: message.message_template,
      channels: message.channels || ['whatsapp'],
      send_time: message.send_time || '09:00',
      days_offset: message.days_offset || 0,
      is_active: message.is_active,
    });
    setShowCreate(true);
  };

  const handleCloseDialog = () => {
    setShowCreate(false);
    setEditingMessage(null);
    setFormData({
      name: '',
      trigger_type: 'birthday',
      message_template: '',
      channels: ['whatsapp'],
      send_time: '09:00',
      days_offset: 0,
      is_active: true,
    });
  };

  const getOffsetLabel = (type: string, offset: number) => {
    if (offset === 0) return 'El mismo día';
    if (offset > 0) return `${offset} días después`;
    return `${Math.abs(offset)} días antes`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mensajes Automatizados</h3>
          <p className="text-sm text-muted-foreground">
            Configura mensajes que se envían automáticamente
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Mensaje
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingMessage ? 'Editar' : 'Crear'} Mensaje Automatizado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Felicitación de Cumpleaños"
                />
              </div>

              <div>
                <Label>Disparador</Label>
                <Select
                  value={formData.trigger_type}
                  onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hora de envío</Label>
                  <Input
                    type="time"
                    value={formData.send_time}
                    onChange={(e) => setFormData({ ...formData, send_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Días de anticipación/retraso</Label>
                  <Input
                    type="number"
                    value={formData.days_offset}
                    onChange={(e) => setFormData({ ...formData, days_offset: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Negativo = antes, Positivo = después
                  </p>
                </div>
              </div>

              <div>
                <Label>Mensaje</Label>
                <Textarea
                  value={formData.message_template}
                  onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                  placeholder="Escribe el mensaje..."
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variables: {'{{nombre}}'}, {'{{hora}}'}, {'{{sucursal}}'}, {'{{puntos}}'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label>Activar mensaje</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={() => saveMutation.mutate()}
                  disabled={!formData.name || !formData.message_template || saveMutation.isPending}
                >
                  {editingMessage ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {messages.map((message) => {
          const TriggerIcon = triggerIcons[message.trigger_type] || MessageSquare;
          
          return (
            <Card key={message.id} className={!message.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TriggerIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{message.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {triggerLabels[message.trigger_type]}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={message.is_active}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: message.id, is_active: checked })}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {message.message_template}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {message.send_time?.substring(0, 5)}
                    </span>
                    <span>{getOffsetLabel(message.trigger_type, message.days_offset)}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(message)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(message.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {messages.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay mensajes automatizados</p>
            <p className="text-sm text-muted-foreground">Crea tu primer mensaje automático</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
