import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AuthorizationProvider } from "@/components/authorization/AuthorizationProvider";
import { BranchProvider } from "@/hooks/useBranchContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { RouteTracker } from "@/components/auth/RouteTracker";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import AccessLogs from "./pages/AccessLogs";
import UsersManagement from "./pages/UsersManagement";
import BranchesManagement from "./pages/BranchesManagement";
import Expediente from "./pages/Expediente";
import ClinicalModule from "./pages/ClinicalModule";
import Appointments from "./pages/Appointments";
import Sales from "./pages/Sales";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Inventory from "./pages/Inventory";
import Purchases from "./pages/Purchases";
import CashRegister from "./pages/CashRegister";
import Reports from "./pages/Reports";
import Marketing from "./pages/Marketing";
import CreditCollection from "./pages/CreditCollection";
import CobroRapido from "./pages/CobroRapido";
import Configuration from "./pages/Configuration";
import OportunidadesClinicas from "./pages/OportunidadesClinicas";
import Promotores from "./pages/Promotores";
import Comisiones from "./pages/Comisiones";
import Commercial from "./pages/Commercial";
import Laboratory from "./pages/Laboratory";
import Notifications from "./pages/Notifications";
import CorporateDashboard from "./pages/CorporateDashboard";
import Bienvenida from "./pages/Bienvenida";
import { PatientPortalProvider } from "./hooks/usePatientPortal";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalHome from "./pages/portal/PortalHome";
import PortalSales from "./pages/portal/PortalSales";
import PortalBalance from "./pages/portal/PortalBalance";
import PortalAppointments from "./pages/portal/PortalAppointments";
import PortalPoints from "./pages/portal/PortalPoints";

// Configure QueryClient with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthorizationProvider>
           <BranchProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
            <BrowserRouter>
            <RouteTracker />
            <ErrorBoundary>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                {/* Usuarios: accessible by all (tecnico gets profile-only view inside) */}
                <Route
                  path="/usuarios"
                  element={
                    <ProtectedRoute>
                      <UsersManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bitacora"
                  element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <AccessLogs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sucursales"
                  element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <BranchesManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/promotores"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente']}>
                      <Promotores />
                    </ProtectedRoute>
                  }
                />
                {/* Expediente - accessible by all (tecnico gets filtered view inside) */}
                <Route
                  path="/expediente"
                  element={
                    <ProtectedRoute>
                      <Expediente />
                    </ProtectedRoute>
                  }
                />
                <Route path="/pacientes" element={<Navigate to="/expediente" replace />} />
                <Route path="/expediente-clinico" element={<Navigate to="/expediente" replace />} />
                <Route path="/clinico" element={<Navigate to="/expediente" replace />} />
                {/* Herramienta Optometría - open to tecnico too */}
                <Route
                  path="/herramienta-optometria"
                  element={
                    <ProtectedRoute>
                      <ClinicalModule />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/agenda"
                  element={
                    <ProtectedRoute>
                      <Appointments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/ventas"
                  element={
                    <ProtectedRoute>
                      <Sales />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/inventario"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente', 'doctor', 'asistente']}>
                      <Inventory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compras"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente']}>
                      <Purchases />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/caja"
                  element={
                    <ProtectedRoute>
                      <CashRegister />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reportes"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente']}>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/marketing"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente']}>
                      <Marketing />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/credito-cobranza"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente', 'cobrador']}>
                      <CreditCollection />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cobro-rapido"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente', 'cobrador', 'asistente']}>
                      <CobroRapido />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/configuracion"
                  element={
                    <ProtectedRoute requiredRoles={['admin']}>
                      <Configuration />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/oportunidades-clinicas"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente', 'doctor']}>
                      <OportunidadesClinicas />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/comisiones"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente']}>
                      <Comisiones />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/comercial"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente']}>
                      <Commercial />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/laboratorio"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente', 'doctor', 'asistente']}>
                      <Laboratory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/notificaciones"
                  element={
                    <ProtectedRoute>
                      <Notifications />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard-corporativo"
                  element={
                    <ProtectedRoute requiredRoles={['admin', 'gerente']}>
                      <CorporateDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/bienvenida" element={<Bienvenida />} />
                {/* Patient Portal (public, OTP-based auth) */}
                <Route path="/portal" element={<PatientPortalProvider><PortalLogin /></PatientPortalProvider>} />
                <Route path="/portal/home" element={<PatientPortalProvider><PortalHome /></PatientPortalProvider>} />
                <Route path="/portal/compras" element={<PatientPortalProvider><PortalSales /></PatientPortalProvider>} />
                <Route path="/portal/saldo" element={<PatientPortalProvider><PortalBalance /></PatientPortalProvider>} />
                <Route path="/portal/citas" element={<PatientPortalProvider><PortalAppointments /></PatientPortalProvider>} />
                <Route path="/portal/puntos" element={<PatientPortalProvider><PortalPoints /></PatientPortalProvider>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
            </TooltipProvider>
          </BranchProvider>
        </AuthorizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
