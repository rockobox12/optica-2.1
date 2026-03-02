import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCampaignAI } from '@/hooks/useCampaignAI';
import { AISegmentsList } from './AISegmentsList';
import { 
  Sparkles, 
  Loader2, 
  Target, 
  MessageSquare, 
  Mail, 
  Phone,
  Clock,
  Users,
  Lightbulb,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const objectives = [
  { value: 'recompra', label: 'Recompra', description: 'Incentivar nueva compra' },
  { value: 'recuperacion', label: 'Recuperación', description: 'Pacientes sin visita reciente' },
  { value: 'promocion', label: 'Promoción', description: 'Ofertas especiales' },
  { value: 'cumpleanos', label: 'Cumpleaños', description: 'Felicitaciones y beneficios' },
  { value: 'lentes_listos', label: 'Lentes Listos', description: 'Notificar pedidos' },
  { value: 'revision', label: 'Revisión', description: 'Recordatorio de consulta' },
];

const channels = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: Phone },
];

interface AICampaignGeneratorProps {
  onCampaignCreated?: (campaign: any) => void;
}

export function AICampaignGenerator({ onCampaignCreated }: AICampaignGeneratorProps) {
  const [objective, setObjective] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null);
  const { toast } = useToast();
  
  const {
    isLoading,
    segments,
    campaign,
    generateSegments,
    generateCampaign,
    clearCampaign,
    clearSegments,
  } = useCampaignAI();

  const handleGenerateSegments = async () => {
    await generateSegments();
  };

  const handleGenerateCampaign = async () => {
    if (!objective) {
      toast({ title: 'Selecciona un objetivo', variant: 'destructive' });
      return;
    }
    await generateCampaign(objective, channel, {
      segment: selectedSegment,
    });
  };

  const handleCopyMessage = (content: string, variant: string) => {
    navigator.clipboard.writeText(content);
    setCopiedVariant(variant);
    setTimeout(() => setCopiedVariant(null), 2000);
    toast({ title: 'Mensaje copiado' });
  };

  const handleUseCampaign = () => {
    if (campaign && onCampaignCreated) {
      onCampaignCreated({
        ...campaign,
        segment: selectedSegment,
        channel,
        objective,
      });
    }
  };

  const ChannelIcon = channels.find(c => c.value === channel)?.icon || MessageSquare;

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sugerencias de IA.</strong> Todas las campañas requieren aprobación del Administrador antes de enviarse.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="segments" className="gap-2">
            <Target className="h-4 w-4" />
            Segmentación
          </TabsTrigger>
          <TabsTrigger value="campaign" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generar Campaña
          </TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Segmentación Inteligente
              </CardTitle>
              <CardDescription>
                La IA analizará los datos de pacientes para sugerir segmentos de alto impacto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleGenerateSegments}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando datos...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Segmentos con IA
                  </>
                )}
              </Button>

              <AISegmentsList 
                segments={segments}
                onSelectSegment={setSelectedSegment}
                selectedSegment={selectedSegment}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaign" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Crear Campaña con IA
              </CardTitle>
              <CardDescription>
                Define el objetivo y canal, la IA generará mensajes optimizados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Objetivo de la Campaña</Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona objetivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {objectives.map(obj => (
                        <SelectItem key={obj.value} value={obj.value}>
                          <div>
                            <span className="font-medium">{obj.label}</span>
                            <span className="text-muted-foreground ml-2 text-sm">
                              - {obj.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Canal</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {channels.map(ch => (
                        <SelectItem key={ch.value} value={ch.value}>
                          <div className="flex items-center gap-2">
                            <ch.icon className="h-4 w-4" />
                            {ch.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSegment && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4" />
                    <span>Segmento seleccionado: <strong>{selectedSegment.name}</strong></span>
                    <Badge variant="secondary" className="ml-auto">
                      ~{selectedSegment.estimated_size} pacientes
                    </Badge>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleGenerateCampaign}
                disabled={isLoading || !objective}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando campaña...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Campaña
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Campaign Preview */}
          {campaign && (
            <Card className="border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{campaign.name}</CardTitle>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Generado por IA
                  </Badge>
                </div>
                <CardDescription>{campaign.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recommended Segment */}
                <div className="p-3 bg-muted rounded-lg">
                  <Label className="text-xs text-muted-foreground">Segmento Recomendado</Label>
                  <p className="font-medium">{campaign.recommended_segment}</p>
                </div>

                {/* Message Variants */}
                <div className="space-y-3">
                  <Label>Variaciones de Mensaje (A/B)</Label>
                  {campaign.messages.map((msg, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge>Variante {msg.variant}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyMessage(msg.content, msg.variant)}
                        >
                          {copiedVariant === msg.variant ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {msg.subject && (
                        <p className="text-sm font-medium">Asunto: {msg.subject}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs text-primary font-medium">CTA: {msg.cta}</p>
                    </div>
                  ))}
                </div>

                {/* Timing Suggestions */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs">Hora Sugerida</Label>
                    </div>
                    <p className="font-medium">{campaign.best_hours}</p>
                    <p className="text-xs text-muted-foreground">
                      Mejores días: {campaign.best_days.join(', ')}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-xs">Alcance Estimado</Label>
                    </div>
                    <p className="font-medium">{campaign.estimated_reach} pacientes</p>
                  </div>
                </div>

                {/* Tips */}
                {campaign.tips && campaign.tips.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                      <Label className="text-xs text-amber-800">Consejos de la IA</Label>
                    </div>
                    <ul className="text-sm text-amber-800 space-y-1">
                      {campaign.tips.map((tip, idx) => (
                        <li key={idx}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={clearCampaign} className="flex-1">
                    Descartar
                  </Button>
                  <Button onClick={handleUseCampaign} className="flex-1">
                    Usar esta Campaña
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
