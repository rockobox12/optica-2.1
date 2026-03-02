import { useState } from 'react';
import {
  Package,
  Plus,
  LayoutGrid,
  List,
  RefreshCw,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LabOrderKanban } from '@/components/laboratory/LabOrderKanban';
import { LabOrderList } from '@/components/laboratory/LabOrderList';
import { LabOrderForm } from '@/components/laboratory/LabOrderForm';
import { LabOrderDetail } from '@/components/laboratory/LabOrderDetail';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Laboratory() {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const viewMode = 'list';
  const [refreshKey, setRefreshKey] = useState(0);
  
  const isMobile = useIsMobile();

  const handleViewOrder = (orderId: string) => {
    setViewOrderId(orderId);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleOrderCreated = () => {
    setShowNewOrder(false);
    handleRefresh();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Órdenes de Trabajo
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestión de órdenes de laboratorio y seguimiento de producción
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowNewOrder(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Orden
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <LabOrderList
          key={`list-${refreshKey}`}
          onViewOrder={handleViewOrder}
          onRefresh={handleRefresh}
        />
      </div>

      {/* New Order Dialog */}
      <Dialog open={showNewOrder} onOpenChange={setShowNewOrder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Nueva Orden de Laboratorio
            </DialogTitle>
          </DialogHeader>
          <LabOrderForm onSuccess={handleOrderCreated} />
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <LabOrderDetail
        orderId={viewOrderId || ''}
        open={!!viewOrderId}
        onClose={() => setViewOrderId(null)}
      />
    </MainLayout>
  );
}
