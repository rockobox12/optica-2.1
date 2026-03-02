import { useState, useEffect } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '@/lib/api-error-handler';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';

type AppRole = 'super_admin' | 'admin' | 'gerente' | 'doctor' | 'optometrista' | 'asistente' | 'cobrador' | 'tecnico';

interface Branch {
  id: string;
  name: string;
}

interface UserRoleWithBranch {
  role: AppRole;
  branch_id: string | null;
  branch_name?: string;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  professional_license: string | null;
  username: string | null;
  is_active: boolean;
  default_branch_id: string | null;
  roles: AppRole[];
  rolesWithBranches: UserRoleWithBranch[];
}

interface UserFormProps {
  user?: UserProfile;
  branches: Branch[];
  onSuccess: () => void;
  onCancel: () => void;
}

// Base schema for user data
const baseSchema = z.object({
  full_name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre es demasiado largo'),
  email: z.string().trim().email('Correo electrónico inválido').max(255, 'El correo es demasiado largo'),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  birth_date: z.string().optional(),
  username: z.string().trim().optional(),
  professional_license: z.string().trim().optional(),
});

// Schema for creating new users (requires password)
const createSchema = baseSchema.extend({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// Schema for doctor-specific validation
const doctorSchema = z.object({
  professional_license: z.string().trim().min(1, 'La cédula profesional es obligatoria para doctores'),
  phone: z.string().trim().min(1, 'El teléfono es obligatorio para doctores'),
  address: z.string().trim().min(1, 'La dirección es obligatoria para doctores'),
  birth_date: z.string().min(1, 'La fecha de nacimiento es obligatoria para doctores'),
});

const allRoles: { value: AppRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Administrador' },
  { value: 'gerente', label: 'Gerente de Sucursal' },
  { value: 'doctor', label: 'Doctor/Optometrista' },
  { value: 'optometrista', label: 'Tec. en Optometría' },
  { value: 'asistente', label: 'Asistente' },
  { value: 'cobrador', label: 'Cobrador' },
];

export function UserForm({ user, branches, onSuccess, onCancel }: UserFormProps) {
  const isEdit = !!user;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    password: '',
    phone: user?.phone || '',
    address: user?.address || '',
    birth_date: user?.birth_date || '',
    username: user?.username || '',
    professional_license: user?.professional_license || '',
    default_branch_id: user?.default_branch_id || '',
  });
  
  const [roleAssignments, setRoleAssignments] = useState<Record<AppRole, { selected: boolean; branchId: string }>>(() => {
    const initial: Record<AppRole, { selected: boolean; branchId: string }> = {
      super_admin: { selected: false, branchId: '' },
      admin: { selected: false, branchId: '' },
      gerente: { selected: false, branchId: '' },
      doctor: { selected: false, branchId: '' },
      optometrista: { selected: false, branchId: '' },
      asistente: { selected: false, branchId: '' },
      cobrador: { selected: false, branchId: '' },
      tecnico: { selected: false, branchId: '' },
    };

    if (user?.rolesWithBranches) {
      user.rolesWithBranches.forEach(r => {
        // Skip vendedor role if user had it (legacy data)
        if (r.role === 'vendedor' as string) return;
        if (initial[r.role as AppRole]) {
          initial[r.role as AppRole] = { selected: true, branchId: r.branch_id || '' };
        }
      });
    }

    return initial;
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedRoles = Object.entries(roleAssignments)
    .filter(([_, data]) => data.selected)
    .map(([role]) => role as AppRole);

  const isDoctorSelected = roleAssignments.doctor.selected;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    setGeneralError(null);

    try {
      // Validate base schema
      if (isEdit) {
        baseSchema.parse(formData);
      } else {
        createSchema.parse(formData);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
      }
    }

    // Validate doctor-specific fields
    if (isDoctorSelected) {
      try {
        doctorSchema.parse({
          professional_license: formData.professional_license,
          phone: formData.phone,
          address: formData.address,
          birth_date: formData.birth_date,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach((err) => {
            if (err.path[0]) {
              newErrors[err.path[0] as string] = err.message;
            }
          });
        }
      }

      // Validate username is required for doctors
      if (!formData.username?.trim()) {
        newErrors.username = 'El nombre de usuario es obligatorio para doctores';
      }
    }

    // Validate at least one role
    if (selectedRoles.length === 0) {
      newErrors.roles = 'Selecciona al menos un rol';
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
        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name.trim(),
            phone: formData.phone?.trim() || null,
            address: formData.address?.trim() || null,
            birth_date: formData.birth_date || null,
            username: formData.username?.trim() || null,
            professional_license: formData.professional_license?.trim() || null,
            default_branch_id: formData.default_branch_id || null,
          })
          .eq('user_id', user.user_id);

        if (profileError) {
          const errorResult = handleApiError(profileError, 'actualización de perfil', { showToast: false });
          if (Object.keys(errorResult.fieldErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...errorResult.fieldErrors }));
          } else {
            setGeneralError(errorResult.message);
            setIsRetryable(errorResult.isRetryable);
          }
          return;
        }

        // Update roles via secure RPC (SECURITY DEFINER)
        const rolesToSet = Object.entries(roleAssignments)
          .filter(([_, data]) => data.selected)
          .map(([role, data]) => ({
            role,
            branch_id: data.branchId || null,
          }));

        if (rolesToSet.length > 0) {
          const { error: rolesError } = await supabase.rpc('set_user_roles', {
            p_target_user_id: user.user_id,
            p_roles: rolesToSet,
          });

          if (rolesError) {
            if (rolesError.message?.includes('Permiso denegado') || rolesError.message?.includes('propios roles')) {
              setGeneralError(rolesError.message);
            } else {
              const errorResult = handleApiError(rolesError, 'asignación de roles', { showToast: false });
              setGeneralError(errorResult.message);
            }
            return;
          }
        }

        toast({
          title: 'Usuario actualizado',
          description: 'Los datos del usuario han sido actualizados',
        });
        onSuccess();
      } else {
        // Create new user via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name.trim(),
            },
          },
        });

        if (authError) {
          const errorResult = handleApiError(authError, 'creación de usuario', { showToast: false });
          if (Object.keys(errorResult.fieldErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...errorResult.fieldErrors }));
          } else {
            setGeneralError(errorResult.message);
            setIsRetryable(errorResult.isRetryable);
          }
          return;
        }

        if (!authData.user) {
          setGeneralError('No se pudo crear el usuario. Intenta de nuevo.');
          setIsRetryable(true);
          return;
        }

        const userId = authData.user.id;

        // Wait for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update the profile with additional data - this is our "transactional" update
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            phone: formData.phone?.trim() || null,
            address: formData.address?.trim() || null,
            birth_date: formData.birth_date || null,
            username: formData.username?.trim() || null,
            professional_license: formData.professional_license?.trim() || null,
            default_branch_id: formData.default_branch_id || null,
          })
          .eq('user_id', userId);

        if (profileError) {
          // Profile update failed - log but don't fail completely
          console.error('Profile update error:', profileError);
          const errorResult = handleApiError(profileError, 'perfil del usuario', { showToast: false });
          if (Object.keys(errorResult.fieldErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...errorResult.fieldErrors }));
          }
        }

        // Assign roles via secure RPC (SECURITY DEFINER)
        const rolesToSet = Object.entries(roleAssignments)
          .filter(([_, data]) => data.selected)
          .map(([role, data]) => ({
            role,
            branch_id: data.branchId || null,
          }));

        if (rolesToSet.length > 0) {
          const { error: rolesError } = await supabase.rpc('set_user_roles', {
            p_target_user_id: userId,
            p_roles: rolesToSet,
          });

          if (rolesError) {
            console.error('Roles insert error:', rolesError);
            toast({
              title: 'Usuario creado con advertencia',
              description: 'El usuario fue creado pero hubo un problema asignando los roles. Por favor, edita el usuario para asignar roles.',
              variant: 'default',
            });
            onSuccess();
            return;
          }
        }

        toast({
          title: 'Usuario creado',
          description: 'El nuevo usuario ha sido registrado correctamente',
        });
        onSuccess();
      }
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
    // Re-trigger submit by creating a synthetic event
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const handleRoleToggle = (role: AppRole) => {
    setRoleAssignments(prev => ({
      ...prev,
      [role]: { ...prev[role], selected: !prev[role].selected },
    }));
  };

  const handleRoleBranchChange = (role: AppRole, branchId: string) => {
    setRoleAssignments(prev => ({
      ...prev,
      [role]: { ...prev[role], branchId },
    }));
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="full_name">Nombre completo *</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
            placeholder="Juan Pérez García"
            required
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="correo@ejemplo.com"
            disabled={isEdit}
            required
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>

        {/* Password (only for new users) */}
        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              required
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>
        )}

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Nombre de usuario</Label>
          <Input
            id="username"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            placeholder="jperez"
          />
        </div>

        {/* Default Branch */}
        <div className="space-y-2">
          <Label htmlFor="default_branch">Sucursal predeterminada</Label>
          <Select
            value={formData.default_branch_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, default_branch_id: value }))}
          >
            <SelectTrigger>
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Seleccionar sucursal" />
            </SelectTrigger>
            <SelectContent>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            Teléfono {isDoctorSelected && '*'}
          </Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+52 951 123 4567"
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <MaskedDateInput
            value={formData.birth_date}
            onChange={(val) => setFormData(prev => ({ ...prev, birth_date: val }))}
            label={`Fecha de nacimiento ${isDoctorSelected ? '*' : ''}`}
            mode="birthdate"
            error={errors.birth_date}
          />
        </div>

        {/* Address */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">
            Dirección {isDoctorSelected && '*'}
          </Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Av. Principal #123, Col. Centro"
          />
          {errors.address && (
            <p className="text-xs text-destructive">{errors.address}</p>
          )}
        </div>

        {/* Professional License (for doctors) */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="professional_license">
            Cédula profesional {isDoctorSelected && '*'}
          </Label>
          <Input
            id="professional_license"
            value={formData.professional_license}
            onChange={(e) => setFormData(prev => ({ ...prev, professional_license: e.target.value }))}
            placeholder="12345678"
          />
          {errors.professional_license && (
            <p className="text-xs text-destructive">{errors.professional_license}</p>
          )}
        </div>
      </div>

      {/* Roles with Branch Assignment */}
      <div className="space-y-4">
        <div>
          <Label>Roles y Sucursales *</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Asigna roles y opcionalmente restringe cada rol a una sucursal específica
          </p>
        </div>
        
        <div className="space-y-3">
          {allRoles.map(role => (
            <div
              key={role.value}
              className={`p-4 rounded-lg border transition-colors ${
                roleAssignments[role.value].selected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={roleAssignments[role.value].selected}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                  />
                  <Label
                    htmlFor={`role-${role.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {role.label}
                  </Label>
                </div>
                
                {roleAssignments[role.value].selected && role.value !== 'super_admin' && role.value !== 'admin' && (
                  <Select
                    value={roleAssignments[role.value].branchId || 'all'}
                    onValueChange={(value) => handleRoleBranchChange(role.value, value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Todas las sucursales" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las sucursales</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {errors.roles && (
          <p className="text-xs text-destructive">{errors.roles}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || selectedRoles.length === 0}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              {isEdit ? 'Guardando...' : 'Creando...'}
            </span>
          ) : (
            isEdit ? 'Guardar Cambios' : 'Crear Usuario'
          )}
        </Button>
      </div>
    </form>
  );
}
