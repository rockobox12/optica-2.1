import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignAI } from '@/hooks/useCampaignAI';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Send, 
  Eye, 
  MousePointer,
  Calendar,
  DollarSign,
  Users,
  Sparkles,
  Loader2,
  Lightbulb
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

export function CampaignMetrics() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  
  const { 
    isLoading: aiLoading, 
    analysis, 
    analyzeResults, 
    suggestImprovements,
    clearAnalysis 
  } = useCampaignAI();

  // Fetch completed campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['completed-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .in('status', ['sent', 'completed'])
        .order('completed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  const handleAnalyze = async () => {
    if (!selectedCampaign) return;
    
    await analyzeResults(selectedCampaign.id, {
      name: selectedCampaign.name,
      channel: selectedCampaign.campaign_type,
      total_recipients: selectedCampaign.total_recipients,
      sent_count: selectedCampaign.sent_count,
      opened_count: selectedCampaign.opened_count,
      responses_count: selectedCampaign.responses_count || 0,
      appointments_generated: selectedCampaign.appointments_generated || 0,
      sales_attributed: selectedCampaign.sales_attributed || 0,
      started_at: selectedCampaign.started_at,
      completed_at: selectedCampaign.completed_at,
    });
  };

  const handleSuggestImprovements = async () => {
    // Get all campaign data for improvements
    const campaignData = campaigns.map(c => ({
      name: c.name,
      channel: c.campaign_type,
      sent_count: c.sent_count,
      opened_count: c.opened_count,
      open_rate: c.sent_count > 0 ? (c.opened_count / c.sent_count * 100).toFixed(1) : 0,
    }));

    await suggestImprovements({ campaigns: campaignData });
  };

  const getOpenRate = (campaign: any) => {
    if (!campaign.sent_count) return 0;
    return ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1);
  };

  const getDeliveryRate = (campaign: any) => {
    if (!campaign.total_recipients) return 0;
    return ((campaign.sent_count / campaign.total_recipients) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Campaign Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análisis de Resultados
          </CardTitle>
          <CardDescription>
            Selecciona una campaña para ver métricas detalladas y análisis IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecciona una campaña" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map(campaign => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    <div className="flex items-center gap-2">
                      <span>{campaign.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {campaign.campaign_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={handleAnalyze}
              disabled={!selectedCampaignId || aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analizar con IA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Metrics */}
      {selectedCampaign && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enviados</p>
                  <p className="text-2xl font-bold">{selectedCampaign.sent_count}</p>
                </div>
                <Send className="h-8 w-8 text-muted-foreground" />
              </div>
              <Progress 
                value={Number(getDeliveryRate(selectedCampaign))} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {getDeliveryRate(selectedCampaign)}% entregados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abiertos</p>
                  <p className="text-2xl font-bold">{selectedCampaign.opened_count}</p>
                </div>
                <Eye className="h-8 w-8 text-muted-foreground" />
              </div>
              <Progress 
                value={Number(getOpenRate(selectedCampaign))} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {getOpenRate(selectedCampaign)}% tasa de apertura
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Citas Generadas</p>
                  <p className="text-2xl font-bold">
                    {selectedCampaign.appointments_generated || 0}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventas Atribuidas</p>
                  <p className="text-2xl font-bold">
                    ${(selectedCampaign.sales_attributed || 0).toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              {selectedCampaign.roi_estimated && (
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    ROI: {selectedCampaign.roi_estimated}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Analysis Results */}
      {analysis && (
        <Card className="border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Análisis de IA
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearAnalysis}>
                Cerrar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            {analysis.summary && (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Resumen Ejecutivo</h4>
                <p className="text-sm">{analysis.summary}</p>
              </div>
            )}

            {/* Metrics Analysis */}
            {analysis.metrics_analysis && (
              <div className="space-y-2">
                <h4 className="font-medium">Interpretación de Métricas</h4>
                <div className="grid gap-2 md:grid-cols-3">
                  {Object.entries(analysis.metrics_analysis).map(([key, data]: [string, any]) => (
                    <div key={key} className="p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-lg font-bold">{data.value}%</p>
                      <Badge 
                        variant="secondary"
                        className={
                          data.interpretation?.toLowerCase().includes('excelente') 
                            ? 'bg-green-100 text-green-800'
                            : data.interpretation?.toLowerCase().includes('bajo')
                            ? 'bg-red-100 text-red-800'
                            : ''
                        }
                      >
                        {data.interpretation}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ROI Analysis */}
            {analysis.roi_analysis && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-medium text-amber-800 mb-1">Análisis ROI</h4>
                <p className="text-sm text-amber-900">{analysis.roi_analysis}</p>
              </div>
            )}

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Recomendaciones
                </h4>
                <ul className="space-y-1">
                  {analysis.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Campaign Suggestion */}
            {analysis.next_campaign_suggestion && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-medium mb-2">Próxima Campaña Sugerida</h4>
                <div className="grid gap-2 md:grid-cols-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Objetivo:</span>
                    <p className="font-medium">{analysis.next_campaign_suggestion.objective}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Segmento:</span>
                    <p className="font-medium">{analysis.next_campaign_suggestion.segment}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Timing:</span>
                    <p className="font-medium">{analysis.next_campaign_suggestion.timing}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Global Improvements Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Optimización Global</h4>
              <p className="text-sm text-muted-foreground">
                Analiza todas las campañas para sugerir mejoras generales
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSuggestImprovements}
              disabled={aiLoading || campaigns.length === 0}
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Sugerir Mejoras
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
