import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDeliveryAI, DeliveryAnalysis } from '@/hooks/useDeliveryAI';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Brain, 
  AlertTriangle, 
  MessageCircle, 
  Calendar,
  RefreshCw,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  FlaskConical,
  Building2,
  CheckCircle2,
} from 'lucide-react';

function RiskBadge({ score }: { score: number }) {
  if (score >= 50) {
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <TrendingUp className="h-3 w-3" />
        Alto ({score})
      </Badge>
    );
  }
  if (score >= 20) {
    return (
      <Badge variant="outline" className="text-xs gap-1 border-warning text-warning bg-warning/10">
        <Minus className="h-3 w-3" />
        Medio ({score})
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs gap-1 border-success text-success bg-success/10">
      <TrendingDown className="h-3 w-3" />
      Bajo ({score})
    </Badge>
  );
}

function LabLocationIndicator({ analysis }: { analysis: DeliveryAnalysis }) {
  if (!analysis.labOrderStatus) {
    return null;
  }

  const isReady = analysis.labOrderStatus === 'LISTO_PARA_ENTREGA';
  const isInOptica = analysis.labOrderLocation === 'EN_OPTICA';

  if (isReady && isInOptica) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Listo</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>Listo para entregar - En óptica</TooltipContent>
      </Tooltip>
    );
  }

  if (isInOptica) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
            <Building2 className="h-3 w-3" />
            <span>En óptica</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>Producto en óptica - {analysis.labOrderStatus}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400">
          <FlaskConical className="h-3 w-3" />
          <span>En lab</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>Producto en laboratorio - {analysis.labOrderStatus}</TooltipContent>
    </Tooltip>
  );
}

function DeliveryAnalysisCard({ 
  analysis, 
  onViewDetails,
  onWhatsApp,
}: { 
  analysis: DeliveryAnalysis;
  onViewDetails: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium text-sm truncate block">{analysis.patientName}</span>
          <div className="text-xs text-muted-foreground">
            {format(new Date(analysis.appointmentDate), 'EEE d MMM', { locale: es })} - {analysis.startTime}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <RiskBadge score={analysis.riskScore} />
          <LabLocationIndicator analysis={analysis} />
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground line-clamp-2">
        {analysis.riskReasons[0]}
      </div>

      <div className="flex gap-2 pt-1">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 h-7 text-xs"
          onClick={onViewDetails}
        >
          <Lightbulb className="h-3 w-3 mr-1" />
          Ver sugerencia
        </Button>
        {analysis.patientPhone && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs text-success border-success/30 hover:bg-success/10"
            onClick={onWhatsApp}
          >
            <MessageCircle className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SuggestionModal({ 
  analysis, 
  isOpen, 
  onClose,
  onWhatsApp,
  onReschedule,
}: { 
  analysis: DeliveryAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
  onWhatsApp: () => void;
  onReschedule: () => void;
}) {
  if (!analysis) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Análisis IA de Entrega
          </DialogTitle>
          <DialogDescription>
            Sugerencias automáticas basadas en historial y estado del pedido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Patient & Date */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{analysis.patientName}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(analysis.appointmentDate), 'EEEE d \'de\' MMMM', { locale: es })} - {analysis.startTime}
              </p>
            </div>
            <RiskBadge score={analysis.riskScore} />
          </div>

          <Separator />

          {/* Risk Reasons */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Factores de riesgo detectados
            </p>
            <ul className="space-y-1">
              {analysis.riskReasons.map((reason, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Lab Order Status */}
          {analysis.labOrderStatus && (
            <div className={`p-3 rounded-lg ${
              analysis.labOrderLocation === 'EN_OPTICA' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
            }`}>
              <p className="text-sm font-medium flex items-center gap-2">
                {analysis.labOrderLocation === 'EN_OPTICA' ? (
                  <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <FlaskConical className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                )}
                {analysis.labOrderNumber ? `Orden ${analysis.labOrderNumber}` : 'Orden de Laboratorio'}
              </p>
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <p>
                  Estado: <span className="font-medium">
                    {analysis.labOrderStatus === 'LISTO_PARA_ENTREGA' ? 'Listo para entrega' : 
                     analysis.labOrderStatus === 'EN_LABORATORIO' ? 'En laboratorio' :
                     analysis.labOrderStatus === 'EN_OPTICA' ? 'En óptica' :
                     analysis.labOrderStatus === 'RECIBIDA' ? 'Recibida' :
                     analysis.labOrderStatus === 'ENTREGADO' ? 'Entregado' :
                     analysis.labOrderStatus === 'RETRABAJO' ? 'Retrabajo' :
                     analysis.labOrderStatus}
                  </span>
                </p>
                <p>
                  Ubicación: <span className="font-medium">
                    {analysis.labOrderLocation === 'EN_OPTICA' ? '📍 En óptica' : '🔬 En laboratorio'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
            <p className="text-sm font-medium flex items-center gap-1 mb-1">
              <Lightbulb className="h-4 w-4 text-primary" />
              Recomendación IA
            </p>
            <p className="text-sm">{analysis.recommendation}</p>
          </div>

          {/* Suggested Message */}
          <div>
            <p className="text-sm font-medium mb-2">Mensaje sugerido para WhatsApp</p>
            <div className="bg-secondary/50 p-3 rounded-lg text-sm whitespace-pre-wrap">
              {analysis.suggestedWhatsAppMessage}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              className="flex-1 gap-2"
              onClick={onWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </Button>
            <Button 
              variant="outline"
              className="flex-1 gap-2"
              onClick={onReschedule}
            >
              <Calendar className="h-4 w-4" />
              Reprogramar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeliveryAIWidget() {
  const navigate = useNavigate();
  const {
    highRiskDeliveries,
    mediumRiskDeliveries,
    analyzedCount,
    highRiskCount,
    isLoading,
    refetch,
    selectedAnalysis,
    setSelectedAnalysis,
    viewSuggestion,
    openWhatsApp,
    logRescheduleAction,
  } = useDeliveryAI();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = async (analysis: DeliveryAnalysis) => {
    await viewSuggestion(analysis);
    setIsModalOpen(true);
  };

  const handleWhatsApp = async () => {
    if (selectedAnalysis) {
      await openWhatsApp(selectedAnalysis);
    }
  };

  const handleReschedule = async () => {
    if (selectedAnalysis) {
      await logRescheduleAction(selectedAnalysis);
      setIsModalOpen(false);
      navigate(`/agenda?date=${selectedAnalysis.appointmentDate}&view=day`);
    }
  };

  const handleQuickWhatsApp = async (analysis: DeliveryAnalysis) => {
    await openWhatsApp(analysis);
  };

  // Combine high and medium risk for display
  const riskyDeliveries = [...highRiskDeliveries, ...mediumRiskDeliveries].slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Entregas – IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analyzedCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Entregas – IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No hay entregas para analizar
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Entregas – IA
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{analyzedCount} analizadas</span>
            {highRiskCount > 0 && (
              <>
                <span>•</span>
                <span className="text-destructive font-medium">
                  {highRiskCount} alto riesgo
                </span>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {riskyDeliveries.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <TrendingDown className="h-6 w-6 mx-auto mb-2 text-green-500" />
              Sin entregas de riesgo detectadas
            </div>
          ) : (
            <ScrollArea className="h-[280px] px-4 pb-4">
              <div className="space-y-3">
                {riskyDeliveries.map((analysis) => (
                  <DeliveryAnalysisCard
                    key={analysis.deliveryId}
                    analysis={analysis}
                    onViewDetails={() => handleViewDetails(analysis)}
                    onWhatsApp={() => handleQuickWhatsApp(analysis)}
                  />
                ))}
              </div>

              {(highRiskDeliveries.length + mediumRiskDeliveries.length) > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs"
                  onClick={() => navigate('/agenda')}
                >
                  Ver todas las entregas
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <SuggestionModal
        analysis={selectedAnalysis}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onWhatsApp={handleWhatsApp}
        onReschedule={handleReschedule}
      />
    </>
  );
}
