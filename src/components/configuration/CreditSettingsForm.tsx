import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useCreditSettings } from '@/hooks/useCreditSettings';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, ShieldCheck, Info, Percent, DollarSign } from 'lucide-react';

export function CreditSettingsForm() {
  const { settings, loading, updateSettings } = useCreditSettings();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: 'blockSalesToMorosos' | 'adminExceptionOnly' | 'adminDownPaymentException' | 'blockMoroso30plus' | 'allowOnlyPaymentsWhenBlocked', value: boolean) => {
    setSaving(true);
    try {
      await updateSettings({ [key]: value });
      toast({ title: 'Configuración actualizada', description: 'Los cambios se guardaron correctamente.' });
    } catch {
      toast({ title: 'Error al guardar', description: 'No se pudo actualizar la configuración.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleNumberChange = async (key: 'minDownPaymentPercent' | 'minDownPaymentAmount', value: string) => {
    const num = value === '' ? null : parseFloat(value);
    if (key === 'minDownPaymentPercent' && (num === null || num < 0 || num > 100)) return;
    if (key === 'minDownPaymentAmount' && num !== null && num < 0) return;

    setSaving(true);
    try {
      await updateSettings({ [key]: num } as any);
      toast({ title: 'Configuración actualizada' });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          Crédito y Cobranza
        </CardTitle>
        <CardDescription>
          Configura las reglas de bloqueo de ventas y enganche mínimo para créditos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Un paciente se considera <strong>moroso</strong> cuando tiene saldo pendiente y la fecha de próximo pago ya venció.
          </AlertDescription>
        </Alert>

        {/* Moroso blocking section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Bloquear ventas a pacientes morosos
              </Label>
              <p className="text-sm text-muted-foreground">
                Impide finalizar ventas en POS cuando el paciente tiene pagos vencidos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.blockSalesToMorosos ? 'destructive' : 'secondary'}>
                {settings.blockSalesToMorosos ? 'Activo' : 'Inactivo'}
              </Badge>
              <Switch
                checked={settings.blockSalesToMorosos}
                onCheckedChange={(v) => handleToggle('blockSalesToMorosos', v)}
                disabled={saving}
              />
            </div>
          </div>

          {settings.blockSalesToMorosos && (
            <div className="flex items-center justify-between pl-6 border-l-2 border-primary/30">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Permitir excepción solo Administrador
                </Label>
                <p className="text-sm text-muted-foreground">
                  Solo el Administrador puede autorizar una venta a un paciente moroso (requiere motivo)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={settings.adminExceptionOnly ? 'default' : 'secondary'}>
                  {settings.adminExceptionOnly ? 'Solo Admin' : 'Cualquier usuario'}
                </Badge>
                <Switch
                  checked={settings.adminExceptionOnly}
                  onCheckedChange={(v) => handleToggle('adminExceptionOnly', v)}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </div>

        {/* Down payment (enganche) section */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Enganche Mínimo para Ventas a Crédito
          </h3>
          <p className="text-sm text-muted-foreground">
            Define el enganche mínimo requerido al registrar una venta a crédito. Se aplica el mayor entre el porcentaje y el monto fijo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" />
                Enganche mínimo (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={settings.minDownPaymentPercent}
                onChange={(e) => handleNumberChange('minDownPaymentPercent', e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">Porcentaje del total de la venta</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Enganche mínimo ($) <span className="text-muted-foreground font-normal">— opcional</span>
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={settings.minDownPaymentAmount ?? ''}
                onChange={(e) => handleNumberChange('minDownPaymentAmount', e.target.value)}
                placeholder="Sin monto fijo"
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">Monto fijo mínimo (si se configura)</p>
            </div>
          </div>

          <div className="flex items-center justify-between pl-6 border-l-2 border-primary/30">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Permitir excepción de enganche solo Administrador
              </Label>
              <p className="text-sm text-muted-foreground">
                Solo el Administrador puede autorizar una venta a crédito sin el enganche mínimo
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.adminDownPaymentException ? 'default' : 'secondary'}>
                {settings.adminDownPaymentException ? 'Solo Admin' : 'Desactivado'}
              </Badge>
              <Switch
                checked={settings.adminDownPaymentException}
                onCheckedChange={(v) => handleToggle('adminDownPaymentException', v)}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Moroso 30+ blocking section */}
        <div className="border-t pt-6 space-y-4">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Bloqueo por Morosidad 30+ días
          </h3>
          <p className="text-sm text-muted-foreground">
            Controles adicionales para pacientes con atraso significativo (&ge;30 días).
          </p>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Bloquear nueva venta si moroso 30+
              </Label>
              <p className="text-sm text-muted-foreground">
                Impide ventas nuevas cuando el paciente tiene &ge;30 días de atraso
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={settings.blockMoroso30plus ? 'destructive' : 'secondary'}>
                {settings.blockMoroso30plus ? 'Activo' : 'Inactivo'}
              </Badge>
              <Switch
                checked={settings.blockMoroso30plus}
                onCheckedChange={(v) => handleToggle('blockMoroso30plus', v)}
                disabled={saving}
              />
            </div>
          </div>

          {settings.blockMoroso30plus && (
            <div className="flex items-center justify-between pl-6 border-l-2 border-primary/30">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Permitir solo abonos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Solo permite registrar abonos/pagos, no ventas nuevas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={settings.allowOnlyPaymentsWhenBlocked ? 'default' : 'secondary'}>
                  {settings.allowOnlyPaymentsWhenBlocked ? 'Solo abonos' : 'Desactivado'}
                </Badge>
                <Switch
                  checked={settings.allowOnlyPaymentsWhenBlocked}
                  onCheckedChange={(v) => handleToggle('allowOnlyPaymentsWhenBlocked', v)}
                  disabled={saving}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
