import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PackageManager } from '@/components/commercial/PackageManager';
import { PromotionManager } from '@/components/commercial/PromotionManager';
import { Package, Percent } from 'lucide-react';

export default function Commercial() {
  const [activeTab, setActiveTab] = useState('packages');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Módulo Comercial
          </h1>
          <p className="text-muted-foreground mt-1">
            Paquetes, promociones y precios
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="packages" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Paquetes</span>
            </TabsTrigger>
            <TabsTrigger value="promotions" className="gap-2">
              <Percent className="h-4 w-4" />
              <span className="hidden sm:inline">Promociones</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages">
            <PackageManager />
          </TabsContent>

          <TabsContent value="promotions">
            <PromotionManager />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
