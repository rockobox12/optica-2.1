import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClinicalMarketingBridge } from '@/hooks/useClinicalMarketingBridge';
import { 
  Brain, 
  Sparkles, 
  Loader2, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  Mail,
  Phone,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  Shield,
  Calendar
} from 'lucide-react';

const priorityConfig = {
  high: { label: 'Alta', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  medium: { label: 'Media', color: 'bg-amber-100 text-amber-800', icon: Clock },
  low: { label: 'Baja', color: 'bg-blue-100 text-blue-800', icon: Clock },
};

const opportunityTypeLabels: Record<string, string> = {
  overdue_review_6m: 'Revisión 6 meses',
  overdue_review_12m: 'Revisión 12 meses',
  overdue_review_18m: 'Revisión 18+ meses',
  progressive_change: 'Cambio graduación',
  contact_lens_followup: 'Seguimiento LC',
  recurring_symptoms: 'Síntomas recurrentes',
  no_post_delivery_followup: 'Sin seguimiento',
  stable_no_visit: 'Sin visita reciente',
};

const channelIcons: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  email: Mail,
  sms: Phone,
};

export function ClinicalMarketingBridge() {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [discardReason, setDiscardReason] = useState('');

  const {
    opportunities,
    marketingActions,
    loadingOpportunities,
    isDetecting,
    isGenerating,
    isAdmin,
    isDoctor,
    detectOpportunities,
    generateMarketingAction,
    approveAction,
    discardOpportunity,
  } = useClinicalMarketingBridge();

  const filteredOpportunities = opportunities.filter(opp => {
    if (filterPriority !== 'all' && opp.priority !== filterPriority) return false;
    if (filterType !== 'all' && opp.opportunity_type !== filterType) return false;
    return true;
  });

  const handleGenerateAction = async (opportunityId: string) => {
    await generateMarketingAction(opportunityId);
  };

  const handleApprove = () => {
    if (selectedAction) {
      approveAction.mutate({
        actionId: selectedAction.id,
        approvedMessage: approvalMessage || selectedAction.suggested_message,
      });
      setShowApprovalDialog(false);
      setApprovalMessage('');
      setSelectedAction(null);
    }
  };

  const handleDiscard = () => {
    if (selectedOpportunity) {
      discardOpportunity.mutate({
        opportunityId: selectedOpportunity.id,
        reason: discardReason,
      });
      setShowDiscardDialog(false);
      setDiscardReason('');
      setSelectedOpportunity(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            IA – Oportunidades Clínicas y Seguimiento
          </h2>
          <p className="text-muted-foreground">
            Detecta oportunidades clínicas y genera acciones de marketing con aprobación humana
          </p>
        </div>
        <Button
          onClick={detectOpportunities}
          disabled={isDetecting}
        >
          {isDetecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Detectando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Detectar Oportunidades
            </>
          )}
        </Button>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Control ético:</strong> La IA solo sugiere acciones. No se envían comunicaciones sin aprobación del Administrador.
          {isDoctor && !isAdmin && (
            <span className="block mt-1 text-muted-foreground">
              Rol Doctor: puedes ver oportunidades clínicas pero no aprobar envíos.
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="opportunities" className="gap-2">
            <Eye className="h-4 w-4" />
            Oportunidades ({opportunities.length})
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="actions" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Acciones ({marketingActions.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="opportunities" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(opportunityTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opportunities List */}
          <div className="space-y-3">
            {loadingOpportunities ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Cargando oportunidades...</p>
              </div>
            ) : filteredOpportunities.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay oportunidades detectadas.</p>
                  <p className="text-sm">Haz clic en "Detectar Oportunidades" para analizar pacientes.</p>
                </CardContent>
              </Card>
            ) : (
              filteredOpportunities.map((opp) => {
                const priority = priorityConfig[opp.priority as keyof typeof priorityConfig];
                const PriorityIcon = priority?.icon || Clock;
                
                return (
                  <Card key={opp.id} className={opp.status === 'suggested' ? 'border-primary' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={priority?.color}>
                              <PriorityIcon className="h-3 w-3 mr-1" />
                              {priority?.label}
                            </Badge>
                            <Badge variant="outline">
                              {opportunityTypeLabels[opp.opportunity_type] || opp.opportunity_type}
                            </Badge>
                            {opp.status === 'suggested' && (
                              <Badge className="bg-primary/20 text-primary">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Acción sugerida
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{opp.patients?.full_name || 'Paciente'}</span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {/* Show full clinical summary only to doctors */}
                            {isDoctor ? opp.clinical_summary : (
                              opp.clinical_summary.length > 100 
                                ? opp.clinical_summary.substring(0, 100) + '...'
                                : opp.clinical_summary
                            )}
                          </p>
                        </div>

                        <div className="flex gap-2 ml-4">
                          {opp.status === 'detected' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleGenerateAction(opp.id)}
                                disabled={isGenerating}
                              >
                                {isGenerating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <ArrowRight className="h-4 w-4 mr-1" />
                                    Generar Acción
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedOpportunity(opp);
                                  setShowDiscardDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {opp.status === 'suggested' && isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveTab('actions')}
                            >
                              Ver Acción
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="actions" className="space-y-4">
            {marketingActions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay acciones de marketing pendientes.</p>
                </CardContent>
              </Card>
            ) : (
              marketingActions.map((action: any) => {
                const ChannelIcon = channelIcons[action.channel] || MessageSquare;
                
                return (
                  <Card key={action.id} className={action.status === 'approved' ? 'border-green-300' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="gap-1">
                              <ChannelIcon className="h-3 w-3" />
                              {action.channel}
                            </Badge>
                            <Badge variant="secondary">{action.action_type}</Badge>
                            <Badge 
                              variant="secondary"
                              className={
                                action.status === 'approved' 
                                  ? 'bg-green-100 text-green-800'
                                  : action.status === 'suggested'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ''
                              }
                            >
                              {action.status === 'approved' ? 'Aprobada' : 
                               action.status === 'suggested' ? 'Pendiente' : action.status}
                            </Badge>
                          </div>

                          <p className="font-medium mb-1">{action.patients?.full_name}</p>
                          
                          <div className="p-3 bg-muted rounded-lg text-sm">
                            {action.approved_message || action.suggested_message}
                          </div>

                          {action.suggested_send_window && (
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Mejor momento: {action.suggested_send_window.best_days?.join(', ')} {action.suggested_send_window.best_hours}
                              </span>
                            </div>
                          )}
                        </div>

                        {action.status === 'suggested' && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedAction(action);
                                setApprovalMessage(action.suggested_message);
                                setShowApprovalDialog(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aprobar Acción de Marketing</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Al aprobar, esta acción podrá ser programada para envío. 
                Revisa y edita el mensaje si es necesario.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensaje a enviar</label>
              <Textarea
                value={approvalMessage}
                onChange={(e) => setApprovalMessage(e.target.value)}
                rows={5}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={approveAction.isPending}>
              {approveAction.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Aprobar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard Dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar Oportunidad</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Estás seguro de descartar esta oportunidad? Esta acción se registrará para mejorar futuras detecciones.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Input
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                placeholder="Ej: Paciente ya fue contactado..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDiscard}
              disabled={discardOpportunity.isPending}
            >
              {discardOpportunity.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Descartar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
