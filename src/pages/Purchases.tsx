import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierList } from '@/components/purchases/SupplierList';
import { PurchaseOrderList } from '@/components/purchases/PurchaseOrderList';
import { ReceptionList } from '@/components/purchases/ReceptionList';
import { Truck, FileText, PackageCheck, Users } from 'lucide-react';

export default function Purchases() {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Compras
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de proveedores, órdenes de compra y recepciones
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="orders" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Órdenes</span>
            </TabsTrigger>
            <TabsTrigger value="receptions" className="gap-2">
              <PackageCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Recepciones</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Proveedores</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <PurchaseOrderList />
          </TabsContent>

          <TabsContent value="receptions">
            <ReceptionList />
          </TabsContent>

          <TabsContent value="suppliers">
            <SupplierList />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
