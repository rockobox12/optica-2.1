import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuickPaymentSearch } from '@/components/cobro-rapido/QuickPaymentSearch';
import { ScheduledPaymentsList } from '@/components/cobro-rapido/ScheduledPaymentsList';
import { Banknote, CalendarClock } from 'lucide-react';

export default function CobroRapido() {
  const [activeTab, setActiveTab] = useState('cobrar');

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-7 w-7 text-primary" />
            Cobro Rápido
          </h1>
          <p className="text-muted-foreground mt-1">
            Registra abonos y pagos de créditos de forma rápida
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="cobrar" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Cobrar Ahora
            </TabsTrigger>
            <TabsTrigger value="programados" className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Cobros Programados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cobrar">
            <QuickPaymentSearch />
          </TabsContent>

          <TabsContent value="programados">
            <ScheduledPaymentsList />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
