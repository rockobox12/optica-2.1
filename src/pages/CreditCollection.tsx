import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { CollectionAssignments } from '@/components/credit/CollectionAssignments';
import { CollectionVisits } from '@/components/credit/CollectionVisits';
import { CreditScoring } from '@/components/credit/CreditScoring';
import { DelinquencyReport } from '@/components/credit/DelinquencyReport';
import { PaymentPlans } from '@/components/credit/PaymentPlans';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  MapPin, 
  Star, 
  FileText, 
  AlertTriangle,
  Eye
} from 'lucide-react';

export default function CreditCollection() {
  const { hasAnyRole } = useAuth();
  
  // Only cobrador has limited actions, admin has full access
  const isReadOnly = hasAnyRole(['cobrador']) && !hasAnyRole(['admin']);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Crédito y Cobranza
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de créditos, cobranza y seguimiento de pagos
          </p>
          {isReadOnly && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded-lg">
              <Eye className="h-4 w-4" />
              <span>Modo solo lectura</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="delinquency" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="delinquency" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Morosidad</span>
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Asignaciones</span>
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Visitas</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Planes</span>
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Scoring</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="delinquency">
            <DelinquencyReport />
          </TabsContent>

          <TabsContent value="assignments">
            <RoleGuard 
              allowedRoles={['admin', 'cobrador']} 
              fallback={<CollectionAssignments />}
            >
              <CollectionAssignments />
            </RoleGuard>
          </TabsContent>

          <TabsContent value="visits">
            <RoleGuard 
              allowedRoles={['admin', 'cobrador']} 
              fallback={<CollectionVisits />}
            >
              <CollectionVisits />
            </RoleGuard>
          </TabsContent>

          <TabsContent value="plans">
            <PaymentPlans />
          </TabsContent>

          <TabsContent value="scoring">
            <CreditScoring />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
