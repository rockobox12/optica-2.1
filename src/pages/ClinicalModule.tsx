import { useState } from 'react';
import {
  FileText,
  ArrowLeftRight,
  Calculator,
  Contact,
  Activity,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { TranspositionCalculator } from '@/components/clinical/TranspositionCalculator';
import { ContactLensCalculator } from '@/components/clinical/ContactLensCalculator';
import { DigitalPrescription } from '@/components/clinical/DigitalPrescription';

export default function ClinicalModule() {
  const [showTransposition, setShowTransposition] = useState(false);
  const [showContactLens, setShowContactLens] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const { toast } = useToast();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Herramienta Optometría
            </h1>
            <p className="text-muted-foreground mt-1">
              Calculadoras y herramientas clínicas para optometristas
            </p>
          </div>
        </div>

        {/* Quick Actions - Only Tools */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary"
            onClick={() => setShowTransposition(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <ArrowLeftRight className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium">Transposición</p>
                  <p className="text-xs text-muted-foreground">Convertir cilindro +/-</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary"
            onClick={() => setShowContactLens(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Contact className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Lentes Contacto</p>
                  <p className="text-xs text-muted-foreground">Cálculo de parámetros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary"
            onClick={() => setShowPrescription(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <FileText className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium">Receta Digital</p>
                  <p className="text-xs text-muted-foreground">Generar receta</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Tools Only */}
        <Tabs defaultValue="tools">
          <TabsList>
            <TabsTrigger value="tools" className="gap-2">
              <Calculator className="h-4 w-4" />
              Herramientas Clínicas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tools" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-purple-500" />
                    Transposición de Cilindro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Convierte recetas de cilindro positivo a negativo y viceversa.
                  </p>
                  <Button onClick={() => setShowTransposition(true)} className="w-full">
                    Abrir Calculadora
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Contact className="h-4 w-4 text-green-500" />
                    Cálculo de Lentes de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Calcula parámetros de LC basado en queratometría y refracción.
                  </p>
                  <Button onClick={() => setShowContactLens(true)} className="w-full">
                    Abrir Calculadora
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Esférico Equivalente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Calcula el esférico equivalente para una graduación.
                  </p>
                  <Button onClick={() => setShowContactLens(true)} className="w-full">
                    Calcular SE
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <Dialog open={showTransposition} onOpenChange={setShowTransposition}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-purple-500" />
                Transposición de Cilindro
              </DialogTitle>
            </DialogHeader>
            <TranspositionCalculator />
          </DialogContent>
        </Dialog>

        <Dialog open={showContactLens} onOpenChange={setShowContactLens}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Contact className="h-5 w-5 text-green-500" />
                Calculadora de Lentes de Contacto
              </DialogTitle>
            </DialogHeader>
            <ContactLensCalculator />
          </DialogContent>
        </Dialog>

        <Dialog open={showPrescription} onOpenChange={setShowPrescription}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                Generar Receta Digital
              </DialogTitle>
            </DialogHeader>
            <DigitalPrescription
              onSuccess={() => {
                setShowPrescription(false);
                toast({
                  title: 'Receta generada',
                  description: 'La receta digital ha sido creada correctamente',
                });
              }}
              onCancel={() => setShowPrescription(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
