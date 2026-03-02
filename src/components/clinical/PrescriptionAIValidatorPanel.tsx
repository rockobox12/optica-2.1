import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Brain,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { type Finding } from '@/hooks/usePrescriptionAIValidator';

interface PrescriptionAIValidatorPanelProps {
  onAnalyze: () => Promise<void>;
  loading: boolean;
  result: {
    findings: Finding[];
    findingsCount: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    hasHistory: boolean;
    historyCount: number;
  } | null;
  error: string | null;
  onMarkReviewed?: () => void;
  onCompareWithHistory?: () => void;
}

export function PrescriptionAIValidatorPanel({
  onAnalyze,
  loading,
  result,
  error,
  onMarkReviewed,
  onCompareWithHistory,
}: PrescriptionAIValidatorPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [reviewed, setReviewed] = useState(false);

  const getSeverityColor = (severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (severity) {
      case 'HIGH':
        return 'destructive';
      case 'MEDIUM':
        return 'default';
      case 'LOW':
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (severity) {
      case 'HIGH':
        return <AlertCircle className="h-4 w-4" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4" />;
      case 'LOW':
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getSeverityLabel = (severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (severity) {
      case 'HIGH':
        return 'Alta probabilidad de error';
      case 'MEDIUM':
        return 'Revisar valores';
      case 'LOW':
        return 'Sin problemas detectados';
    }
  };

  const getEyeIcon = (eye?: 'OD' | 'OI' | 'BOTH') => {
    if (!eye) return null;
    return (
      <Badge variant="outline" className="text-xs">
        {eye === 'BOTH' ? 'OD/OI' : eye}
      </Badge>
    );
  };

  const handleMarkReviewed = () => {
    setReviewed(true);
    onMarkReviewed?.();
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span>IA – Validación Clínica</span>
          </div>
          {result && !reviewed && (
            <Badge variant={getSeverityColor(result.severity)}>
              {getSeverityIcon(result.severity)}
              <span className="ml-1">{getSeverityLabel(result.severity)}</span>
            </Badge>
          )}
          {reviewed && (
            <Badge variant="outline" className="text-muted-foreground">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Revisado
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Info disclaimer */}
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          Sugerencias de IA. Validar clínicamente antes de guardar.
        </p>

        {/* Analyze button */}
        {!result && !loading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            className="w-full gap-2"
          >
            <Brain className="h-4 w-4" />
            Analizar graduación
          </Button>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Analizando...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && !reviewed && (
          <div className="space-y-3">
            {/* No findings */}
            {result.findings.length === 0 && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">
                  Sin inconsistencias detectadas
                </AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  La graduación parece consistente
                  {result.hasHistory && ` con el historial (${result.historyCount} registros)`}.
                </AlertDescription>
              </Alert>
            )}

            {/* Findings list */}
            {result.findings.length > 0 && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {result.findingsCount} hallazgo{result.findingsCount > 1 ? 's' : ''} detectado{result.findingsCount > 1 ? 's' : ''}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {result.findings.map((finding, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border text-sm ${
                        finding.severity === 'HIGH'
                          ? 'border-destructive/30 bg-destructive/5'
                          : finding.severity === 'MEDIUM'
                          ? 'border-amber-500/30 bg-amber-50 dark:bg-amber-950/20'
                          : 'border-muted bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="shrink-0 mt-0.5">
                          {finding.severity === 'HIGH' ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : finding.severity === 'MEDIUM' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Info className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{finding.message}</span>
                            {getEyeIcon(finding.eye)}
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {finding.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {result.hasHistory && onCompareWithHistory && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCompareWithHistory}
                  className="gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Ver comparación
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkReviewed}
                className="gap-1 text-muted-foreground"
              >
                <ShieldCheck className="h-3 w-3" />
                Marcar como revisado
              </Button>
            </div>
          </div>
        )}

        {/* Reviewed state */}
        {reviewed && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Análisis marcado como revisado
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onAnalyze}
              className="text-xs"
            >
              Volver a analizar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
