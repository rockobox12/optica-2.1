import { MainLayout } from '@/components/layout/MainLayout';
import { ClinicalMarketingBridge } from '@/components/clinical-marketing';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function OportunidadesClinicas() {
  return (
    <MainLayout>
      <RoleGuard 
        allowedRoles={['admin', 'doctor']}
        fallback={
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para acceder a este módulo. 
              Solo Administradores y Doctores pueden ver las oportunidades clínicas.
            </AlertDescription>
          </Alert>
        }
      >
        <ClinicalMarketingBridge />
      </RoleGuard>
    </MainLayout>
  );
}
