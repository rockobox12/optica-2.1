import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashRegisterSession } from '@/components/cashregister/CashRegisterSession';
import { CashCount } from '@/components/cashregister/CashCount';
import { ExpenseManager } from '@/components/cashregister/ExpenseManager';
import { BankAccounts } from '@/components/cashregister/BankAccounts';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  Wallet,
  Calculator,
  Receipt,
  Building,
} from 'lucide-react';

export default function CashRegister() {
  const [activeTab, setActiveTab] = useState('session');

  return (
    <RoleGuard allowedRoles={['super_admin', 'gerente', 'asistente']} accessDeniedTitle="Acceso restringido" accessDeniedMessage="No tienes permisos para acceder a Caja y Bancos.">
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Caja y Bancos</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de efectivo, arqueos, gastos y cuentas bancarias
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="session" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Caja</span>
            </TabsTrigger>
            <TabsTrigger value="count" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Arqueo</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Gastos</span>
            </TabsTrigger>
            <TabsTrigger value="banks" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              <span className="hidden sm:inline">Bancos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="session" className="mt-6">
            <CashRegisterSession />
          </TabsContent>

          <TabsContent value="count" className="mt-6">
            <CashCount />
          </TabsContent>

          <TabsContent value="expenses" className="mt-6">
            <ExpenseManager />
          </TabsContent>

          <TabsContent value="banks" className="mt-6">
            <BankAccounts />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
    </RoleGuard>
  );
}
