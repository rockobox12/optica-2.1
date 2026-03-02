import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, Copy, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TransposedValues {
  sphere: number;
  cylinder: number;
  axis: number;
}

export function TranspositionCalculator() {
  const { toast } = useToast();
  const [sphere, setSphere] = useState('');
  const [cylinder, setCylinder] = useState('');
  const [axis, setAxis] = useState('');
  const [result, setResult] = useState<TransposedValues | null>(null);

  const transpose = () => {
    const sph = parseFloat(sphere);
    const cyl = parseFloat(cylinder);
    const ax = parseInt(axis);

    if (isNaN(sph) || isNaN(cyl) || isNaN(ax)) {
      toast({
        title: 'Error',
        description: 'Ingresa valores válidos para esfera, cilindro y eje',
        variant: 'destructive',
      });
      return;
    }

    if (ax < 0 || ax > 180) {
      toast({
        title: 'Error',
        description: 'El eje debe estar entre 0° y 180°',
        variant: 'destructive',
      });
      return;
    }

    // Transposition formula
    const newSphere = sph + cyl;
    const newCylinder = -cyl;
    const newAxis = ax <= 90 ? ax + 90 : ax - 90;

    setResult({
      sphere: newSphere,
      cylinder: newCylinder,
      axis: newAxis,
    });
  };

  const copyResult = () => {
    if (result) {
      const text = `Esf: ${result.sphere >= 0 ? '+' : ''}${result.sphere.toFixed(2)} Cil: ${result.cylinder >= 0 ? '+' : ''}${result.cylinder.toFixed(2)} Eje: ${result.axis}°`;
      navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado',
        description: 'Resultado copiado al portapapeles',
      });
    }
  };

  const formatValue = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  };

  const calculateSphericalEquivalent = () => {
    const sph = parseFloat(sphere);
    const cyl = parseFloat(cylinder);
    if (!isNaN(sph) && !isNaN(cyl)) {
      return (sph + cyl / 2).toFixed(2);
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Valores Originales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Esfera (D)</Label>
              <Input
                type="number"
                step="0.25"
                value={sphere}
                onChange={(e) => setSphere(e.target.value)}
                placeholder="+/-0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cilindro (D)</Label>
              <Input
                type="number"
                step="0.25"
                value={cylinder}
                onChange={(e) => setCylinder(e.target.value)}
                placeholder="+/-0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Eje (°)</Label>
              <Input
                type="number"
                min="0"
                max="180"
                value={axis}
                onChange={(e) => setAxis(e.target.value)}
                placeholder="0-180"
              />
            </div>
          </div>
          
          {sphere && cylinder && (
            <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
              Esférico equivalente: <strong>{calculateSphericalEquivalent()} D</strong>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={transpose} className="w-full gap-2">
        <ArrowLeftRight className="h-4 w-4" />
        Transponer Cilindro
      </Button>

      {/* Result */}
      {result && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                Resultado Transpuesto
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={copyResult}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Esfera</p>
                <p className="text-2xl font-mono font-bold">{formatValue(result.sphere)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cilindro</p>
                <p className="text-2xl font-mono font-bold">{formatValue(result.cylinder)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Eje</p>
                <p className="text-2xl font-mono font-bold">{result.axis}°</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
              Esférico equivalente: <strong>{((result.sphere) + (result.cylinder / 2)).toFixed(2)} D</strong>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="text-sm text-muted-foreground bg-secondary/30 p-4 rounded-lg">
        <p className="font-medium mb-2">Fórmula de transposición:</p>
        <ul className="space-y-1 text-xs">
          <li>• Nueva Esfera = Esfera original + Cilindro original</li>
          <li>• Nuevo Cilindro = Cambiar signo del cilindro</li>
          <li>• Nuevo Eje = ±90° al eje original</li>
        </ul>
      </div>
    </div>
  );
}
