import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ID reservado para "paciente llegó solo" - mismo que en PromotorSelector del POS
const DEFAULT_PROMOTOR_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_PROMOTOR_NAME = 'Óptica Istmeña (Paciente llegó solo)';

export interface ReferredByInfo {
  promotorId: string | null;
  promotorNombre: string;
}

interface ReferredBySelectorProps {
  value: ReferredByInfo;
  onChange: (info: ReferredByInfo) => void;
}

export function ReferredBySelector({ value, onChange }: ReferredBySelectorProps) {
  // Fetch active promotores
  const { data: promotores = [], isLoading, isError } = useQuery({
    queryKey: ['promotores-activos-pacientes'],
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

  const handleChange = (selectedId: string) => {
    if (selectedId === DEFAULT_PROMOTOR_ID || selectedId === 'default') {
      // "Paciente llegó solo" - guardamos null en el ID
      onChange({
        promotorId: null,
        promotorNombre: DEFAULT_PROMOTOR_NAME,
      });
    } else {
      const promotor = promotores.find(p => p.id === selectedId);
      if (promotor) {
        onChange({
          promotorId: promotor.id,
          promotorNombre: promotor.nombre_completo,
        });
      }
    }
  };

  // Determinar el valor actual para el Select
  const getCurrentValue = (): string => {
    if (!value.promotorId) {
      return 'default';
    }
    return value.promotorId;
  };

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar promotores.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="referred_by" className="flex items-center gap-1.5">
        <UserPlus className="h-4 w-4" />
        Referido por
      </Label>
      <Select
        value={getCurrentValue()}
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger id="referred_by">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Cargando...</span>
            </div>
          ) : (
            <SelectValue placeholder="Seleccionar quién refirió al paciente" />
          )}
        </SelectTrigger>
        <SelectContent>
          {/* Opción fija SIEMPRE al inicio */}
          <SelectItem value="default">
            <span className="text-muted-foreground">{DEFAULT_PROMOTOR_NAME}</span>
          </SelectItem>
          
          {/* Lista de promotores activos */}
          {promotores
            .filter(p => p.id !== DEFAULT_PROMOTOR_ID) // Excluir si existe el default en la tabla
            .map((promotor) => (
              <SelectItem key={promotor.id} value={promotor.id}>
                {promotor.nombre_completo}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Si el paciente llegó por su cuenta, seleccione "Óptica Istmeña"
      </p>
    </div>
  );
}

export { DEFAULT_PROMOTOR_NAME };
