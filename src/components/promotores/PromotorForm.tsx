import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '@/lib/api-error-handler';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

interface Promotor {
  id: string;
  nombre_completo: string;
  telefono: string | null;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
}

interface PromotorFormProps {
  promotor?: Promotor;
  onSuccess: () => void;
  onCancel: () => void;
}

const promotorSchema = z.object({
  nombre_completo: z.string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  telefono: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
});

export function PromotorForm({ promotor, onSuccess, onCancel }: PromotorFormProps) {
  const isEdit = !!promotor;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [formData, setFormData] = useState({
    nombre_completo: promotor?.nombre_completo || '',
    telefono: promotor?.telefono || '',
    observaciones: promotor?.observaciones || '',
    activo: promotor?.activo ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    setGeneralError(null);

    try {
      promotorSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setIsRetryable(false);
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('promotores')
          .update({
            nombre_completo: formData.nombre_completo.trim(),
            telefono: formData.telefono?.trim() || null,
            observaciones: formData.observaciones?.trim() || null,
            activo: formData.activo,
          })
          .eq('id', promotor.id);

        if (error) {
          const errorResult = handleApiError(error, 'actualización de promotor', { showToast: false });
          setGeneralError(errorResult.message);
          setIsRetryable(errorResult.isRetryable);
          return;
        }

        toast({
          title: 'Promotor actualizado',
          description: 'Los datos del promotor han sido actualizados',
        });
      } else {
        const { error } = await supabase
          .from('promotores')
          .insert({
            nombre_completo: formData.nombre_completo.trim(),
            telefono: formData.telefono?.trim() || null,
            observaciones: formData.observaciones?.trim() || null,
            activo: formData.activo,
          });

        if (error) {
          const errorResult = handleApiError(error, 'creación de promotor', { showToast: false });
          setGeneralError(errorResult.message);
          setIsRetryable(errorResult.isRetryable);
          return;
        }

        toast({
          title: 'Promotor creado',
          description: 'El nuevo promotor ha sido registrado correctamente',
        });
      }

      onSuccess();
    } catch (error: unknown) {
      const errorResult = handleApiError(error, isEdit ? 'actualización' : 'creación', { showToast: false });
      setGeneralError(errorResult.message);
      setIsRetryable(errorResult.isRetryable);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setGeneralError(null);
    setIsRetryable(false);
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Error Alert */}
      {generalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{generalError}</span>
            {isRetryable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="ml-4 gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Reintentar
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {/* Nombre Completo */}
        <div className="space-y-2">
          <Label htmlFor="nombre_completo">Nombre completo *</Label>
          <Input
            id="nombre_completo"
            value={formData.nombre_completo}
            onChange={(e) => setFormData(prev => ({ ...prev, nombre_completo: e.target.value }))}
            placeholder="Nombre del promotor o referido"
            required
          />
          {errors.nombre_completo && (
            <p className="text-xs text-destructive">{errors.nombre_completo}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            value={formData.telefono}
            onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
            placeholder="+52 951 123 4567"
          />
          {errors.telefono && (
            <p className="text-xs text-destructive">{errors.telefono}</p>
          )}
        </div>

        {/* Observaciones */}
        <div className="space-y-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea
            id="observaciones"
            value={formData.observaciones}
            onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
            placeholder="Notas adicionales sobre el promotor..."
            rows={3}
          />
        </div>

        {/* Activo */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
          <div>
            <Label htmlFor="activo" className="text-base">Promotor activo</Label>
            <p className="text-sm text-muted-foreground">
              Los promotores inactivos no aparecen en el POS
            </p>
          </div>
          <Switch
            id="activo"
            checked={formData.activo}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, activo: checked }))}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Guardar cambios' : 'Crear promotor'}
        </Button>
      </div>
    </form>
  );
}
