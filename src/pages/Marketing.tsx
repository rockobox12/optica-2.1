import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoyaltyDashboard } from '@/components/marketing/LoyaltyDashboard';
import { CustomerLoyalty } from '@/components/marketing/CustomerLoyalty';
import { CampaignManager } from '@/components/marketing/CampaignManager';
import { AutomatedMessages } from '@/components/marketing/AutomatedMessages';
import { LoyaltySettings } from '@/components/marketing/LoyaltySettings';
import { AICampaignGenerator } from '@/components/marketing/AICampaignGenerator';
import { CampaignApprovalWorkflow } from '@/components/marketing/CampaignApprovalWorkflow';
import { CampaignMetrics } from '@/components/marketing/CampaignMetrics';
import { RoleGuard } from '@/components/auth/RoleGuard';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  MessageSquare,
  Settings,
  Sparkles,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';

export default function Marketing() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <RoleGuard allowedRoles={['super_admin', 'gerente']} accessDeniedTitle="Acceso restringido" accessDeniedMessage="No tienes permisos para acceder a Marketing.">
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Marketing y Lealtad
          </h1>
          <p className="text-muted-foreground mt-1">
            Programa de puntos, campañas IA y mensajes automáticos
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="gap-2">
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Campañas</span>
            </TabsTrigger>
            <TabsTrigger value="ai-campaigns" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Campañas IA</span>
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Aprobaciones</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="automated" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Automatizados</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuración</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <LoyaltyDashboard />
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <CustomerLoyalty />
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4">
            <CampaignManager />
          </TabsContent>

          <TabsContent value="ai-campaigns" className="space-y-4">
            <RoleGuard allowedRoles={['admin']}>
              <AICampaignGenerator />
            </RoleGuard>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <CampaignApprovalWorkflow />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <RoleGuard allowedRoles={['admin']}>
              <CampaignMetrics />
            </RoleGuard>
          </TabsContent>

          <TabsContent value="automated" className="space-y-4">
            <AutomatedMessages />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <LoyaltySettings />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
    </RoleGuard>
  );
}
