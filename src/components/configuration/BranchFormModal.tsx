import { useState, useEffect } from 'react';
import { Loader2, MapPin, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Branch, BranchFormData } from '@/hooks/useBranchManagement';

interface BranchFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  onSave: (data: Partial<BranchFormData>) => Promise<void>;
  isSaving: boolean;
}

const initialFormData: Partial<BranchFormData> = {
  code: '',
  name: '',
  address: '',
  colony: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  manager: '',
  is_active: true,
  is_main: false,
};

export function BranchFormModal({ 
  open, 
  onOpenChange, 
  branch, 
  onSave,
  isSaving 
}: BranchFormModalProps) {
  const [formData, setFormData] = useState<Partial<BranchFormData>>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEditing = !!branch;

  useEffect(() => {
    if (branch) {
      setFormData({
        code: branch.code || '',
        name: branch.name,
        address: branch.address || '',
        colony: branch.colony || '',
        city: branch.city || '',
        state: branch.state || '',
        zip_code: branch.zip_code || '',
        phone: branch.phone || '',
        email: branch.email || '',
        manager: branch.manager || '',
        is_active: branch.is_active,
        is_main: branch.is_main,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [branch, open]);

  const handleChange = (field: keyof BranchFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Mínimo 3 caracteres';
    }

    if (!formData.address?.trim()) {
      newErrors.address = 'La dirección es requerida';
    } else if (formData.address.length < 10) {
      newErrors.address = 'Mínimo 10 caracteres';
    }

    if (!formData.city?.trim()) {
      newErrors.city = 'La ciudad es requerida';
    }

    if (!formData.state?.trim()) {
      newErrors.state = 'El estado es requerido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Formato de email inválido';
    }

    if (formData.zip_code && !/^\d{5}$/.test(formData.zip_code)) {
      newErrors.zip_code = 'Debe tener 5 dígitos';
    }

    if (formData.code && !/^[A-Za-z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Solo alfanumérico, sin espacios';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {isEditing ? 'Editar Sucursal' : 'Nueva Sucursal'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica los datos de la sucursal' 
              : 'Ingresa los datos de la nueva sucursal'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Código/Clave</Label>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                placeholder="SUC001"
                maxLength={10}
                className={errors.code ? 'border-destructive' : ''}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Se genera automáticamente si se deja vacío
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre de la Sucursal <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Sucursal Centro"
                maxLength={50}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Dirección Completa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Calle 5 de Mayo #123, Centro, Juchitán, Oaxaca"
              maxLength={200}
              rows={2}
              className={errors.address ? 'border-destructive' : ''}
            />
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="colony">Colonia/Barrio</Label>
              <Input
                id="colony"
                value={formData.colony || ''}
                onChange={(e) => handleChange('colony', e.target.value)}
                placeholder="Centro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">
                Ciudad <span className="text-destructive">*</span>
              </Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="Juchitán de Zaragoza"
                className={errors.city ? 'border-destructive' : ''}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="state">
                Estado/Provincia <span className="text-destructive">*</span>
              </Label>
              <Input
                id="state"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="Oaxaca"
                className={errors.state ? 'border-destructive' : ''}
              />
              {errors.state && (
                <p className="text-xs text-destructive">{errors.state}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">Código Postal</Label>
              <Input
                id="zip_code"
                value={formData.zip_code || ''}
                onChange={(e) => handleChange('zip_code', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="70000"
                maxLength={5}
                className={errors.zip_code ? 'border-destructive' : ''}
              />
              {errors.zip_code && (
                <p className="text-xs text-destructive">{errors.zip_code}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono de Sucursal</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="951 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email de Sucursal</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="centro@optica.com"
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manager">Encargado/Gerente</Label>
            <Input
              id="manager"
              value={formData.manager || ''}
              onChange={(e) => handleChange('manager', e.target.value)}
              placeholder="Juan Pérez"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label>Estado de la Sucursal</Label>
              <p className="text-sm text-muted-foreground">
                {formData.is_active ? 'Activa y operando' : 'Inactiva temporalmente'}
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
