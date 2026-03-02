import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Trash2, 
  Building2, 
  Save, 
  Loader2,
  Image as ImageIcon,
  Globe,
  Mail,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { cn } from '@/lib/utils';

export function CompanySettingsForm() {
  const { settings, isLoading, isSaving, updateSettings, uploadLogo, deleteLogo } = useCompanySettings();
  
  const [formData, setFormData] = useState({
    company_name: '',
    slogan: '',
    rfc: '',
    phone: '',
    email: '',
    website: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        company_name: settings.company_name || '',
        slogan: settings.slogan || '',
        rfc: settings.rfc || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
      });
    }
  }, [settings]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      await uploadLogo(file);
    } finally {
      setIsUploading(false);
    }
  }, [uploadLogo]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
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
          <div className="grid gap-6 md:grid-cols-[250px_1fr]">
            <Skeleton className="h-[250px] rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sloganCharsLeft = 100 - (formData.slogan?.length || 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Información de la Empresa
        </CardTitle>
        <CardDescription>
          Configura los datos de tu negocio para facturas, tickets y documentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 md:grid-cols-[280px_1fr]">
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Logo de la Óptica</Label>
            
            <div
              className={cn(
                "relative aspect-square rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                settings?.logo_url && "border-solid border-muted"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              <AnimatePresence mode="wait">
                {isUploading ? (
                  <motion.div
                    key="uploading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Subiendo...</span>
                  </motion.div>
                ) : settings?.logo_url ? (
                  <motion.img
                    key="logo"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    src={settings.logo_url}
                    alt="Logo de la empresa"
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3 p-6 text-center"
                  >
                    <div className="p-3 rounded-full bg-muted">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Arrastra tu logo aquí</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        o haz clic para seleccionar
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <input
                id="logo-upload"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => document.getElementById('logo-upload')?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Logo
                </Button>
                {settings?.logo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteLogo}
                    disabled={isUploading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                PNG, JPG o SVG. Máximo 2MB.<br />
                Recomendado: 500x500px, fondo transparente
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">
                  Nombre de la Empresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Óptica Istmeña"
                  maxLength={50}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rfc">RFC/Identificación Fiscal</Label>
                <Input
                  id="rfc"
                  value={formData.rfc}
                  onChange={(e) => handleInputChange('rfc', e.target.value.toUpperCase())}
                  placeholder="ABC123456XYZ"
                  maxLength={13}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="slogan">Lema/Slogan</Label>
                <span className={cn(
                  "text-xs",
                  sloganCharsLeft < 20 ? "text-warning" : "text-muted-foreground"
                )}>
                  {sloganCharsLeft} caracteres restantes
                </span>
              </div>
              <Textarea
                id="slogan"
                value={formData.slogan}
                onChange={(e) => handleInputChange('slogan', e.target.value)}
                placeholder="Tu visión, nuestra pasión"
                maxLength={100}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Se mostrará en tickets, reportes y pie de página
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  Teléfono Principal
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+52 951 123 4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  Email General
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="contacto@opticaistmena.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                Sitio Web
              </Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://opticaistmena.com"
              />
            </div>

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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
