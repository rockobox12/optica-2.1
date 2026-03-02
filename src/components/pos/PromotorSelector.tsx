import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Megaphone, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const DEFAULT_PROMOTOR_ID = '00000000-0000-0000-0000-000000000001';

export interface PromotorInfo {
  id: string;
  nombre: string;
}

interface PromotorSelectorProps {
  value: PromotorInfo | null;
  onChange: (promotor: PromotorInfo | null) => void;
  required?: boolean;
  error?: boolean;
}

export function PromotorSelector({ value, onChange, required = true, error = false }: PromotorSelectorProps) {
  // Fetch active promotores
  const { data: promotores = [], isLoading, isError } = useQuery({
    queryKey: ['promotores-activos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotores')
        .select('id, nombre_completo')
        .eq('activo', true)
        .order('nombre_completo');
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleChange = (promotorId: string) => {
    const promotor = promotores.find(p => p.id === promotorId);
    if (promotor) {
      onChange({
        id: promotor.id,
        nombre: promotor.nombre_completo,
      });
    }
  };

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar promotores. No se puede cerrar la venta.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className={`text-sm flex items-center gap-1.5 ${error ? 'text-destructive' : ''}`}>
        <Megaphone className="h-4 w-4" />
        Promotor {required && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={value?.id || ''}
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger className={error ? 'border-destructive' : ''}>
          <SelectValue placeholder={isLoading ? 'Cargando promotores...' : 'Seleccione un promotor'} />
        </SelectTrigger>
        <SelectContent>
          {promotores.map((promotor) => (
            <SelectItem key={promotor.id} value={promotor.id}>
              <div className="flex items-center gap-2">
                {promotor.id === DEFAULT_PROMOTOR_ID ? (
                  <span className="text-muted-foreground">{promotor.nombre_completo}</span>
                ) : (
                  <span>{promotor.nombre_completo}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive">
          Debe seleccionar un promotor para continuar
        </p>
      )}
    </div>
  );
}
