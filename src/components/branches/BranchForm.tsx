import { useState } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Building2, MapPin, Phone, MessageCircle } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
}

interface BranchFormProps {
  branch?: Branch;
  onSuccess: () => void;
  onCancel: () => void;
}

const branchSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp_number: z.string().optional(),
});

export function BranchForm({ branch, onSuccess, onCancel }: BranchFormProps) {
  const isEdit = !!branch;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    phone: branch?.phone || '',
    whatsapp_number: branch?.whatsapp_number || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    try {
      branchSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (isEdit) {
        const { error } = await supabase
          .from('branches')
          .update({
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            whatsapp_number: formData.whatsapp_number || null,
          })
          .eq('id', branch.id);

        if (error) throw error;

        toast({
          title: 'Sucursal actualizada',
          description: 'Los datos de la sucursal han sido actualizados',
        });
      } else {
        const { error } = await supabase
          .from('branches')
          .insert({
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            whatsapp_number: formData.whatsapp_number || null,
          });

        if (error) throw error;

        toast({
          title: 'Sucursal creada',
          description: 'La nueva sucursal ha sido registrada correctamente',
        });
      }

      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Nombre de la sucursal *
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ej: Sucursal Centro"
          required
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          Teléfono
        </Label>
        <Input
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          placeholder="+52 951 123 4567"
        />
      </div>

      {/* WhatsApp */}
      <div className="space-y-2">
        <Label htmlFor="whatsapp_number" className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          WhatsApp (para notificaciones)
        </Label>
        <Input
          id="whatsapp_number"
          value={formData.whatsapp_number}
          onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
          placeholder="9711234567"
        />
        <p className="text-xs text-muted-foreground">
          Número de WhatsApp de la sucursal para enviar notificaciones a clientes
        </p>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address" className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          Dirección
        </Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="Av. Principal #123, Col. Centro, CP 70000"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              {isEdit ? 'Guardando...' : 'Creando...'}
            </span>
          ) : (
            isEdit ? 'Guardar Cambios' : 'Crear Sucursal'
          )}
        </Button>
      </div>
    </form>
  );
}
