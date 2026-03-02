import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Loader2, DollarSign, Calendar, Globe, Languages, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCompanySettings } from '@/hooks/useCompanySettings';

const CURRENCIES = [
  { value: 'MXN', label: 'MXN - Peso mexicano', symbol: '$' },
  { value: 'USD', label: 'USD - Dólar estadounidense', symbol: '$' },
  { value: 'EUR', label: 'EUR - Euro', symbol: '€' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31)' },
];

const TIMEZONES = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (UTC-6)' },
  { value: 'America/Monterrey', label: 'Monterrey (UTC-6)' },
  { value: 'America/Cancun', label: 'Cancún (UTC-5)' },
  { value: 'America/Tijuana', label: 'Tijuana (UTC-8)' },
  { value: 'America/Hermosillo', label: 'Hermosillo (UTC-7)' },
];

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

export function SystemPreferences() {
  const { settings, isLoading, isSaving, updateSettings } = useCompanySettings();
  
  const [formData, setFormData] = useState({
    currency: 'MXN',
    date_format: 'DD/MM/YYYY',
    timezone: 'America/Mexico_City',
    language: 'es',
    tax_rate: 16,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        currency: settings.currency,
        date_format: settings.date_format,
        timezone: settings.timezone,
        language: settings.language,
        tax_rate: settings.tax_rate,
      });
    }
  }, [settings]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateSettings(formData);
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
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Preferencias del Sistema
        </CardTitle>
        <CardDescription>
          Configura las preferencias regionales y de formato
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <motion.div 
          className="grid gap-6 sm:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Currency */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Moneda
            </Label>
            <Select
              value={formData.currency}
              onValueChange={(value) => handleChange('currency', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar moneda" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(currency => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Afecta el formato de precios en todo el sistema
            </p>
          </div>

          {/* Date Format */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Formato de Fecha
            </Label>
            <Select
              value={formData.date_format}
              onValueChange={(value) => handleChange('date_format', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar formato" />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map(format => (
                  <SelectItem key={format.value} value={format.value}>
                    {format.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Zona Horaria
            </Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleChange('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar zona" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map(tz => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              Idioma
            </Label>
            <Select
              value={formData.language}
              onValueChange={(value) => handleChange('language', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar idioma" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Tax Rate */}
        <motion.div 
          className="space-y-2 max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Label className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            IVA/Impuesto (%)
          </Label>
          <div className="relative">
            <Input
              type="number"
              value={formData.tax_rate}
              onChange={(e) => handleChange('tax_rate', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              min={0}
              max={100}
              step={0.5}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tasa de impuesto aplicable a ventas (México: 16%)
          </p>
        </motion.div>

        {/* Preview */}
        <motion.div 
          className="p-4 rounded-lg border bg-muted/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h4 className="text-sm font-medium mb-3">Vista previa de formatos</h4>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <span className="text-muted-foreground">Precio:</span>
              <span className="ml-2 font-mono">
                {CURRENCIES.find(c => c.value === formData.currency)?.symbol || '$'}
                1,234.56 {formData.currency}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Fecha:</span>
              <span className="ml-2 font-mono">
                {formData.date_format === 'DD/MM/YYYY' && '09/02/2026'}
                {formData.date_format === 'MM/DD/YYYY' && '02/09/2026'}
                {formData.date_format === 'YYYY-MM-DD' && '2026-02-09'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">IVA:</span>
              <span className="ml-2 font-mono">
                {formData.tax_rate}%
              </span>
            </div>
          </div>
        </motion.div>

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
