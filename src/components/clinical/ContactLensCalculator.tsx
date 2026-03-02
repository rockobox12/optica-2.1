import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Contact, Calculator, Eye, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactLensParams {
  bc: number;
  diameter: number;
  sphere: number;
  cylinder?: number;
  axis?: number;
}

export function ContactLensCalculator() {
  const { toast } = useToast();
  
  // Keratometry values
  const [odK1, setOdK1] = useState('');
  const [odK2, setOdK2] = useState('');
  const [oiK1, setOiK1] = useState('');
  const [oiK2, setOiK2] = useState('');
  
  // Refraction values
  const [odSphere, setOdSphere] = useState('');
  const [odCylinder, setOdCylinder] = useState('');
  const [odAxis, setOdAxis] = useState('');
  const [oiSphere, setOiSphere] = useState('');
  const [oiCylinder, setOiCylinder] = useState('');
  const [oiAxis, setOiAxis] = useState('');
  
  // Vertex distance
  const [vertexDistance, setVertexDistance] = useState('12');
  
  // Lens type
  const [lensType, setLensType] = useState('spherical');
  
  // Results
  const [odResult, setOdResult] = useState<ContactLensParams | null>(null);
  const [oiResult, setOiResult] = useState<ContactLensParams | null>(null);

  const calculateKAvg = (k1: string, k2: string): number | null => {
    const k1Num = parseFloat(k1);
    const k2Num = parseFloat(k2);
    if (!isNaN(k1Num) && !isNaN(k2Num)) {
      return (k1Num + k2Num) / 2;
    }
    return null;
  };

  // Calculate BC from keratometry
  const calculateBC = (kAvg: number): number => {
    // BC = 337.5 / K average (in mm)
    // Adding 0.5-1.0mm for soft lenses
    const bcMm = 337.5 / kAvg;
    return Math.round((bcMm + 0.5) * 100) / 100;
  };

  // Calculate vertex distance compensation
  const calculateVertexCompensation = (power: number, vd: number): number => {
    // For powers > 4D, vertex distance compensation is needed
    if (Math.abs(power) <= 4) return power;
    
    // Formula: Fc = F / (1 - d*F)
    // Where d is vertex distance in meters
    const dMeters = vd / 1000;
    const compensated = power / (1 - dMeters * power);
    return Math.round(compensated * 4) / 4; // Round to nearest 0.25
  };

  const calculate = () => {
    const vd = parseFloat(vertexDistance) || 12;
    
    // OD calculations
    const odKAvg = calculateKAvg(odK1, odK2);
    const odSph = parseFloat(odSphere);
    const odCyl = parseFloat(odCylinder) || 0;
    const odAx = parseInt(odAxis) || 0;
    
    if (odKAvg && !isNaN(odSph)) {
      const bc = calculateBC(odKAvg);
      let spherePower = calculateVertexCompensation(odSph, vd);
      
      // For spherical lenses, add half cylinder to sphere
      if (lensType === 'spherical' && odCyl !== 0) {
        spherePower = calculateVertexCompensation(odSph + odCyl / 2, vd);
      }
      
      setOdResult({
        bc,
        diameter: 14.0, // Standard soft lens diameter
        sphere: spherePower,
        cylinder: lensType === 'toric' ? calculateVertexCompensation(odCyl, vd) : undefined,
        axis: lensType === 'toric' ? odAx : undefined,
      });
    }
    
    // OI calculations
    const oiKAvg = calculateKAvg(oiK1, oiK2);
    const oiSph = parseFloat(oiSphere);
    const oiCyl = parseFloat(oiCylinder) || 0;
    const oiAx = parseInt(oiAxis) || 0;
    
    if (oiKAvg && !isNaN(oiSph)) {
      const bc = calculateBC(oiKAvg);
      let spherePower = calculateVertexCompensation(oiSph, vd);
      
      if (lensType === 'spherical' && oiCyl !== 0) {
        spherePower = calculateVertexCompensation(oiSph + oiCyl / 2, vd);
      }
      
      setOiResult({
        bc,
        diameter: 14.0,
        sphere: spherePower,
        cylinder: lensType === 'toric' ? calculateVertexCompensation(oiCyl, vd) : undefined,
        axis: lensType === 'toric' ? oiAx : undefined,
      });
    }

    toast({
      title: 'Cálculo completado',
      description: 'Parámetros de lentes de contacto calculados',
    });
  };

  const formatPower = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}`;
  };

  const copyResult = (eye: 'od' | 'oi') => {
    const result = eye === 'od' ? odResult : oiResult;
    if (result) {
      let text = `BC: ${result.bc}mm | Ø: ${result.diameter}mm | Esf: ${formatPower(result.sphere)}`;
      if (result.cylinder !== undefined) {
        text += ` | Cil: ${formatPower(result.cylinder)} x ${result.axis}°`;
      }
      navigator.clipboard.writeText(text);
      toast({ title: 'Copiado', description: 'Parámetros copiados al portapapeles' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Lens Type Selection */}
      <div className="space-y-2">
        <Label>Tipo de Lente</Label>
        <Select value={lensType} onValueChange={setLensType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spherical">Esférico</SelectItem>
            <SelectItem value="toric">Tórico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Keratometry Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              Queratometría OD
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">K1 (D)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={odK1}
                  onChange={(e) => setOdK1(e.target.value)}
                  placeholder="43.00"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">K2 (D)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={odK2}
                  onChange={(e) => setOdK2(e.target.value)}
                  placeholder="44.00"
                  className="h-8"
                />
              </div>
            </div>
            {odK1 && odK2 && (
              <p className="text-xs text-muted-foreground">
                K Promedio: {calculateKAvg(odK1, odK2)?.toFixed(2)} D
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              Queratometría OI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">K1 (D)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={oiK1}
                  onChange={(e) => setOiK1(e.target.value)}
                  placeholder="43.00"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">K2 (D)</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={oiK2}
                  onChange={(e) => setOiK2(e.target.value)}
                  placeholder="44.00"
                  className="h-8"
                />
              </div>
            </div>
            {oiK1 && oiK2 && (
              <p className="text-xs text-muted-foreground">
                K Promedio: {calculateKAvg(oiK1, oiK2)?.toFixed(2)} D
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Refraction Input */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Refracción OD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Esfera</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={odSphere}
                  onChange={(e) => setOdSphere(e.target.value)}
                  placeholder="-2.00"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cilindro</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={odCylinder}
                  onChange={(e) => setOdCylinder(e.target.value)}
                  placeholder="-1.00"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Eje</Label>
                <Input
                  type="number"
                  min="0"
                  max="180"
                  value={odAxis}
                  onChange={(e) => setOdAxis(e.target.value)}
                  placeholder="180"
                  className="h-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Refracción OI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Esfera</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={oiSphere}
                  onChange={(e) => setOiSphere(e.target.value)}
                  placeholder="-2.00"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cilindro</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={oiCylinder}
                  onChange={(e) => setOiCylinder(e.target.value)}
                  placeholder="-1.00"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Eje</Label>
                <Input
                  type="number"
                  min="0"
                  max="180"
                  value={oiAxis}
                  onChange={(e) => setOiAxis(e.target.value)}
                  placeholder="180"
                  className="h-8"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vertex Distance */}
      <div className="space-y-2">
        <Label>Distancia al Vértice (mm)</Label>
        <Input
          type="number"
          step="1"
          value={vertexDistance}
          onChange={(e) => setVertexDistance(e.target.value)}
          placeholder="12"
          className="max-w-[120px]"
        />
        <p className="text-xs text-muted-foreground">
          Se aplica compensación para poderes mayores a ±4.00 D
        </p>
      </div>

      <Button onClick={calculate} className="w-full gap-2">
        <Calculator className="h-4 w-4" />
        Calcular Parámetros
      </Button>

      {/* Results */}
      {(odResult || oiResult) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {odResult && (
            <Card className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30">
              <CardHeader className="py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Contact className="h-4 w-4 text-blue-500" />
                    LC Ojo Derecho
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyResult('od')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">BC:</span>
                    <span className="font-mono font-bold ml-2">{odResult.bc} mm</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ø:</span>
                    <span className="font-mono font-bold ml-2">{odResult.diameter} mm</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Esfera:</span>
                    <span className="font-mono font-bold ml-2">{formatPower(odResult.sphere)}</span>
                  </div>
                  {odResult.cylinder !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Cil:</span>
                      <span className="font-mono font-bold ml-2">{formatPower(odResult.cylinder)} x {odResult.axis}°</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {oiResult && (
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/30">
              <CardHeader className="py-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Contact className="h-4 w-4 text-green-500" />
                    LC Ojo Izquierdo
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyResult('oi')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">BC:</span>
                    <span className="font-mono font-bold ml-2">{oiResult.bc} mm</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ø:</span>
                    <span className="font-mono font-bold ml-2">{oiResult.diameter} mm</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Esfera:</span>
                    <span className="font-mono font-bold ml-2">{formatPower(oiResult.sphere)}</span>
                  </div>
                  {oiResult.cylinder !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Cil:</span>
                      <span className="font-mono font-bold ml-2">{formatPower(oiResult.cylinder)} x {oiResult.axis}°</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
