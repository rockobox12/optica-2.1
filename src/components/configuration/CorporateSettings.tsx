import { useState, useEffect } from 'react';
import { Building2, Save, Loader2, Users, ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { Skeleton } from '@/components/ui/skeleton';

export function CorporateSettings() {
  const { settings, isLoading, isSaving, updateSettings } = useCompanySettings();
  const [enabled, setEnabled] = useState(true);
  const [crossBranchPayments, setCrossBranchPayments] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.corporate_patients_enabled ?? true);
      setCrossBranchPayments(settings.cross_branch_payments_enabled ?? false);
    }
  }, [settings]);

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    setHasChanges(true);
  };

  const handleCrossBranchToggle = (value: boolean) => {
    setCrossBranchPayments(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettings({ 
      corporate_patients_enabled: enabled,
      cross_branch_payments_enabled: crossBranchPayments,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Pacientes Corporativos y Multi-sucursal
        </CardTitle>
        <CardDescription>
          Configura la visibilidad de pacientes y pagos entre sucursales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Corporate patients toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Users className="h-4 w-4 text-muted-foreground" />
              Pacientes corporativos (ver en cualquier sucursal)
            </Label>
            <p className="text-sm text-muted-foreground max-w-md">
              Cuando está activo, gerentes y roles clínicos pueden buscar y atender pacientes de otras sucursales. 
              Si está desactivado, solo el Super Administrador puede ver pacientes de otras sedes.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Cross-branch payments toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="space-y-1">
            <Label className="flex items-center gap-2 text-base font-medium">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              Permitir pagos cruzados entre sucursales
            </Label>
            <p className="text-sm text-muted-foreground max-w-md">
              Permite que un paciente pague/abone una venta a crédito en una sucursal distinta 
              a donde se generó la venta. El dinero entra a la caja de la sucursal que cobra.
            </p>
          </div>
          <Switch
            checked={crossBranchPayments}
            onCheckedChange={handleCrossBranchToggle}
          />
        </div>

        {enabled && (
          <div className="text-sm text-muted-foreground p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="font-medium text-foreground mb-1">ℹ️ Modo corporativo activo</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Los pacientes podrán ser buscados y atendidos en cualquier sucursal</li>
              <li>Los eventos (consultas, ventas) se registran en la sucursal donde ocurren</li>
              <li>Los créditos y pagos se mantienen en la sucursal de la venta original</li>
              <li>El expediente muestra un badge indicando la sucursal de origen</li>
              {crossBranchPayments && (
                <li className="font-medium text-foreground">Los pagos cruzados están habilitados — el cobro se registra en la caja local</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
