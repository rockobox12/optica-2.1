import { useState, useEffect, useCallback } from 'react';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { UnsavedChangesDialog } from '@/components/ui/UnsavedChangesDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { POSTerminal } from '@/components/pos/POSTerminal';
import { SalesHistory } from '@/components/pos/SalesHistory';
import { CreditSales } from '@/components/pos/CreditSales';
import { CreditScoring } from '@/components/credit/CreditScoring';
import { PaymentPlans } from '@/components/credit/PaymentPlans';
import { CollectionAssignments } from '@/components/credit/CollectionAssignments';
import { CollectionVisits } from '@/components/credit/CollectionVisits';
import { DelinquencyReport } from '@/components/credit/DelinquencyReport';
import { ShoppingCart, History, CreditCard, Wifi, WifiOff, Star, FileText, Users, MapPin, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';

// Preload params from clinical module
export interface POSPreloadParams {
  fromExam: boolean;
  patientId: string | null;
  examId: string | null;
  prescriptionId: string | null;
}

export default function Sales() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('pos');
  const [posOpen, setPosOpen] = useState(true);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hasDirtyCart, setHasDirtyCart] = useState(false);
  const { isOnline, pendingSales } = useOfflineSync();
  
  // Handle preload params from clinical module
  const preloadParams: POSPreloadParams = {
    fromExam: searchParams.get('fromExam') === 'true',
    patientId: searchParams.get('patientId'),
    examId: searchParams.get('examId'),
    prescriptionId: searchParams.get('prescriptionId'),
  };
  
  // Clear URL params after reading (so refresh doesn't re-trigger)
  useEffect(() => {
    if (preloadParams.fromExam) {
      const timer = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [preloadParams.fromExam, setSearchParams]);

  // Lock body scroll when POS modal is open
  useEffect(() => {
    if (activeTab === 'pos' && posOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [activeTab, posOpen]);

  // Re-open POS when switching to pos tab
  useEffect(() => {
    if (activeTab === 'pos') setPosOpen(true);
  }, [activeTab]);

  const handleClosePOS = useCallback(() => {
    if (hasDirtyCart) {
      setShowCloseConfirm(true);
    } else {
      setPosOpen(false);
      setActiveTab('history');
    }
  }, [hasDirtyCart]);

  const confirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setHasDirtyCart(false);
    setPosOpen(false);
    setActiveTab('history');
  }, []);

  return (
    <RoleGuard allowedRoles={['super_admin', 'gerente', 'doctor', 'asistente', 'cobrador']} accessDeniedTitle="Acceso restringido" accessDeniedMessage="No tienes permisos para acceder a Ventas.">
    <MainLayout>
      <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 w-full">

          {/* POS Modal Overlay — Centered premium modal */}
          {activeTab === 'pos' && posOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center">
              {/* Backdrop — blocks interaction, no onClick to prevent accidental close */}
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200" />

              {/* Modal container — centered, premium style like "Registrar Paciente" */}
              <div className={
                'relative z-10 flex flex-col bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300 ' +
                'w-screen h-[100dvh] ' +
                'sm:w-[92vw] sm:max-w-[1200px] sm:h-[90vh] sm:rounded-2xl sm:border sm:border-border/60'
              }>
                <POSTerminal
                  preloadParams={(preloadParams.fromExam || preloadParams.patientId) ? preloadParams : undefined}
                  onClose={handleClosePOS}
                  onDirtyChange={setHasDirtyCart}
                />
              </div>
            </div>
          )}

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-end mb-2">
              <Button
                size="lg"
                onClick={() => { setPosOpen(true); setActiveTab('pos'); }}
                className="gap-2 bg-primary text-primary-foreground shadow-lg hover:shadow-xl text-base px-6"
              >
                <ShoppingCart className="h-5 w-5" />
                Nueva Venta
              </Button>
            </div>
            <SalesHistory />
          </TabsContent>

          <TabsContent value="credit" className="space-y-4">
            <CreditSales />
          </TabsContent>

          <TabsContent value="scoring" className="space-y-4">
            <CreditScoring />
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <PaymentPlans />
          </TabsContent>

          <TabsContent value="collectors" className="space-y-4">
            <CollectionAssignments />
          </TabsContent>

          <TabsContent value="visits" className="space-y-4">
            <CollectionVisits />
          </TabsContent>

          <TabsContent value="delinquency" className="space-y-4">
            <DelinquencyReport />
          </TabsContent>
        </Tabs>
      </div>

      <UnsavedChangesDialog
        open={showCloseConfirm}
        onOpenChange={setShowCloseConfirm}
        onContinue={() => setShowCloseConfirm(false)}
        onDiscard={confirmClose}
      />
    </MainLayout>
    </RoleGuard>
  );
}
