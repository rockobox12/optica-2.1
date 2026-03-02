import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentCalendar } from '@/components/appointments/AppointmentCalendar';
import { WaitingRoom } from '@/components/appointments/WaitingRoom';
import { DoctorScheduleManager } from '@/components/appointments/DoctorScheduleManager';
import { TodayDeliveries } from '@/components/appointments/TodayDeliveries';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Calendar, Users, Clock, Package } from 'lucide-react';

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'calendar');

  // Sync URL tab parameter with state
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without full navigation
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'calendar') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams, { replace: true });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-display font-bold text-foreground">
            Agenda Médica
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestiona citas, horarios, entregas y sala de espera
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid h-auto">
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="deliveries" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Entregas Hoy</span>
            </TabsTrigger>
            <TabsTrigger value="waiting" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Sala de Espera</span>
            </TabsTrigger>
            <TabsTrigger value="schedules" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Horarios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <AppointmentCalendar />
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-4">
            <RoleGuard allowedRoles={['admin', 'doctor', 'asistente']} showAccessDenied={true}>
              <TodayDeliveries />
            </RoleGuard>
          </TabsContent>

          <TabsContent value="waiting" className="space-y-4">
            <WaitingRoom />
          </TabsContent>

          <TabsContent value="schedules" className="space-y-4">
            <DoctorScheduleManager />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
