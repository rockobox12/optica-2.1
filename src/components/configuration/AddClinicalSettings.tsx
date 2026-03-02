import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAddClinicalConfig } from '@/hooks/useAddClinicalConfig';
import { Loader2, Eye, Save } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export function AddClinicalSettings() {
  const { toast } = useToast();
  const { config, suggestions, loading, updateConfig } = useAddClinicalConfig();
  const [saving, setSaving] = useState(false);
  
  // Local state for form
  const [formData, setFormData] = useState({
    edad_minima_add: 40,
    permitir_add_menores: false,
    mostrar_sugerencia_add: true,
    add_min: 0.50,
    add_max: 3.50,
    add_step: 0.25,
  });

  // Sync form with config when loaded
  useEffect(() => {
    if (config) {
      setFormData({
        edad_minima_add: config.edad_minima_add,
        permitir_add_menores: config.permitir_add_menores,
        mostrar_sugerencia_add: config.mostrar_sugerencia_add,
        add_min: config.add_min,
        add_max: config.add_max,
        add_step: config.add_step,
      });
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateConfig(formData);
      if (success) {
        toast({
          title: 'Configuración guardada',
          description: 'Los cambios de ADD se han guardado correctamente',
        });
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Configuración de Adición (ADD)
          </CardTitle>
          <CardDescription>
            Configura las reglas clínicas para el campo ADD basadas en la edad del paciente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Age threshold */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edad_minima_add">Edad mínima para ADD</Label>
              <Input
                id="edad_minima_add"
                type="number"
                min="30"
                max="60"
                value={formData.edad_minima_add}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  edad_minima_add: parseInt(e.target.value) || 40,
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Edad a partir de la cual se habilita el campo ADD (recomendado: 40)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add_step">Incrementos de ADD</Label>
              <Input
                id="add_step"
                type="number"
                step="0.25"
                min="0.25"
                max="0.50"
                value={formData.add_step}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  add_step: parseFloat(e.target.value) || 0.25,
                }))}
              />
              <p className="text-xs text-muted-foreground">
                Valor de incremento permitido (ej: 0.25)
              </p>
            </div>
          </div>

          {/* Range */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="add_min">ADD mínimo</Label>
              <Input
                id="add_min"
                type="number"
                step="0.25"
                min="0.25"
                max="1.00"
                value={formData.add_min}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  add_min: parseFloat(e.target.value) || 0.50,
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add_max">ADD máximo</Label>
              <Input
                id="add_max"
                type="number"
                step="0.25"
                min="2.00"
                max="5.00"
                value={formData.add_max}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  add_max: parseFloat(e.target.value) || 3.50,
                }))}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir ADD en menores</Label>
                <p className="text-sm text-muted-foreground">
                  Permite capturar ADD aunque el paciente sea menor a la edad mínima
                </p>
              </div>
              <Switch
                checked={formData.permitir_add_menores}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  permitir_add_menores: checked,
                }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar sugerencia de ADD</Label>
                <p className="text-sm text-muted-foreground">
                  Muestra un valor sugerido según la edad del paciente
                </p>
              </div>
              <Switch
                checked={formData.mostrar_sugerencia_add}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  mostrar_sugerencia_add: checked,
                }))}
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Age-based suggestions table */}
      <Card>
        <CardHeader>
          <CardTitle>Sugerencias por Rango de Edad</CardTitle>
          <CardDescription>
            Valores de ADD sugeridos automáticamente según la edad del paciente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rango de Edad</TableHead>
                <TableHead>ADD Sugerido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((suggestion) => (
                <TableRow key={suggestion.id}>
                  <TableCell>
                    {suggestion.min_age} – {suggestion.max_age ?? '+'} años
                  </TableCell>
                  <TableCell className="font-medium">
                    +{suggestion.suggested_add.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-4">
            Estos rangos están basados en estándares de presbicia y son solo sugerencias. 
            El valor final siempre lo decide el especialista.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
