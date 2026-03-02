import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductList } from '@/components/inventory/ProductList';
import { StockOverview } from '@/components/inventory/StockOverview';
import { Kardex } from '@/components/inventory/Kardex';
import { StockAlerts } from '@/components/inventory/StockAlerts';
import { CategoryManager } from '@/components/inventory/CategoryManager';
import { Package, Warehouse, FileText, AlertTriangle, FolderOpen } from 'lucide-react';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('products');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Inventario
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de productos, categorías, stock y movimientos
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Productos</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Categorías</span>
            </TabsTrigger>
            <TabsTrigger value="stock" className="gap-2">
              <Warehouse className="h-4 w-4" />
              <span className="hidden sm:inline">Stock</span>
            </TabsTrigger>
            <TabsTrigger value="kardex" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Kardex</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Alertas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductList />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="stock">
            <StockOverview />
          </TabsContent>

          <TabsContent value="kardex">
            <Kardex />
          </TabsContent>

          <TabsContent value="alerts">
            <StockAlerts />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
