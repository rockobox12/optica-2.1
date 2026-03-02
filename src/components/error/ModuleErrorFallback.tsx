import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ModuleErrorFallbackProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ModuleErrorFallback({
  title = 'Error al cargar el módulo',
  description = 'No se pudo cargar el contenido de este módulo.',
  onRetry,
}: ModuleErrorFallbackProps) {
  return (
    <Card className="border-destructive/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/10">
            <AlertCircle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      {onRetry && (
        <CardContent>
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
