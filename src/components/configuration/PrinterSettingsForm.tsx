import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Save, Monitor } from 'lucide-react';
import { readLocalSettings, writeLocalSettings } from '@/hooks/usePrinterSettings';
import { showSuccess } from '@/lib/toast-utils';

export function PrinterSettingsForm() {
  const initial = readLocalSettings();
  const [paperSize, setPaperSize] = useState(initial.paperSize);
  const [density, setDensity] = useState(initial.density);
  const [speed, setSpeed] = useState(initial.speed);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    writeLocalSettings({ paperSize, density, speed });
    setHasChanges(false);
    showSuccess('Configuración de impresora guardada en este dispositivo');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          Impresora Térmica
        </CardTitle>
        <CardDescription>
          Configura tipo de papel, densidad visual y velocidad de impresión.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
          <Monitor className="h-4 w-4 shrink-0" />
          <span>Esta configuración se guarda <strong>solo en este dispositivo</strong>. Cada equipo (PC, celular) puede tener su propia configuración.</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo de papel</Label>
            <Select value={paperSize} onValueChange={(v: any) => { setPaperSize(v); setHasChanges(true); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58 mm</SelectItem>
                <SelectItem value="80mm">80 mm</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Densidad visual</Label>
            <Select value={density} onValueChange={(v: any) => { setDensity(v); setHasChanges(true); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="dark">Oscuro</SelectItem>
                <SelectItem value="extra_dark">Muy Oscuro (recomendado 58mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Velocidad</Label>
            <Select value={speed} onValueChange={(v: any) => { setSpeed(v); setHasChanges(true); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="slow">Lento (más oscuro)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {paperSize === '58mm' && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Tips para 58mm:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Si el texto sale gris → sube la densidad a <strong>Muy Oscuro</strong></li>
              <li>Si se quema el papel → baja a <strong>Normal</strong></li>
              <li>El logo se convierte automáticamente a blanco/negro</li>
            </ul>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={!hasChanges} className="min-w-[140px]">
            <Save className="h-4 w-4 mr-2" />Guardar en este equipo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
