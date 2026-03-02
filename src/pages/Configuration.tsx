import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { DeveloperWatermark } from '@/components/branding/DeveloperWatermark';
import { APP_CONFIG } from '@/config/app';
import { AdminAuthorizationPanel } from '@/components/authorization/AdminAuthorizationPanel';
import { TransferRequestsPanel } from '@/components/expediente/TransferRequestsPanel';
import { CorporateSettings } from '@/components/configuration/CorporateSettings';
import { VersionChangelog } from '@/components/configuration/VersionChangelog';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AddClinicalSettings, CompanySettingsForm, BranchManagement, SystemPreferences } from '@/components/configuration';
import { PrintTestTool } from '@/components/configuration/PrintTestTool';
import { PrinterSettingsForm } from '@/components/configuration/PrinterSettingsForm';
import { CreditSettingsForm } from '@/components/configuration/CreditSettingsForm';
import { PaymentReminderSettings } from '@/components/configuration/PaymentReminderSettings';
import { InstallmentReminderSettings } from '@/components/configuration/InstallmentReminderSettings';
import { AutoMessageSettings, MessageHistory } from '@/components/messaging';
import { PatientPortalSettings } from '@/components/configuration/PatientPortalSettings';
import { DatabaseResetSection } from '@/components/configuration/DatabaseResetSection';
import { 
  Settings, 
  Building2, 
  Bell, 
  Printer, 
  FileText, 
  Shield,
  Palette,
  Globe,
  Info,
  ShieldCheck,
  Eye,
  MessageSquare,
  MapPin,
  CreditCard,
  Smartphone,
  Wrench,
  ArrowRightLeft
} from 'lucide-react';

export default function Configuration() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('empresa');
  const { toast } = useToast();

  // Handle tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleSave = () => {
    toast({
      title: 'Configuración guardada',
      description: 'Los cambios se han guardado correctamente',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Configuración
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra la configuración general del sistema
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap gap-2 h-auto p-2 bg-muted/50">
            <TabsTrigger value="empresa" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Empresa</span>
            </TabsTrigger>
            <TabsTrigger value="sucursales" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Sucursales</span>
            </TabsTrigger>
            <TabsTrigger value="preferencias" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Preferencias</span>
            </TabsTrigger>
            <TabsTrigger value="notificaciones" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
            <TabsTrigger value="impresion" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Impresión</span>
            </TabsTrigger>
            <TabsTrigger value="facturacion" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Facturación</span>
            </TabsTrigger>
            <TabsTrigger value="seguridad" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="autorizaciones" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Autorizaciones</span>
            </TabsTrigger>
            <TabsTrigger value="transferencias" className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Transferencias</span>
            </TabsTrigger>
            <TabsTrigger value="credito" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Crédito</span>
            </TabsTrigger>
            <TabsTrigger value="clinico" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Clínico</span>
            </TabsTrigger>
            <TabsTrigger value="apariencia" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Apariencia</span>
            </TabsTrigger>
            <TabsTrigger value="mensajeria" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Mensajería</span>
            </TabsTrigger>
            <TabsTrigger value="portal" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              <span className="hidden sm:inline">Portal Paciente</span>
            </TabsTrigger>
            <TabsTrigger value="mantenimiento" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Mantenimiento</span>
            </TabsTrigger>
            <TabsTrigger value="integraciones" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Integraciones</span>
            </TabsTrigger>
            <TabsTrigger value="acerca" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Acerca de</span>
            </TabsTrigger>
          </TabsList>

          {/* Empresa Tab - Company Settings with Logo */}
          <TabsContent value="empresa">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden modificar la información de la empresa."
            >
              <CompanySettingsForm />
            </RoleGuard>
          </TabsContent>

          {/* Sucursales Tab - Branch Management */}
          <TabsContent value="sucursales">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden gestionar las sucursales."
            >
              <BranchManagement />
            </RoleGuard>
          </TabsContent>

          {/* Preferencias Tab - System Preferences */}
          <TabsContent value="preferencias">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden modificar las preferencias del sistema."
            >
              <SystemPreferences />
            </RoleGuard>
          </TabsContent>

          <TabsContent value="notificaciones">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden modificar las notificaciones."
            >
              <div className="space-y-6">
                <PaymentReminderSettings />
                <Card>
                  <CardHeader>
                    <CardTitle>Notificaciones Generales</CardTitle>
                    <CardDescription>
                      Configura las notificaciones del sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Notificaciones por Email</Label>
                          <p className="text-sm text-muted-foreground">
                            Recibe alertas importantes por correo electrónico
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Alertas de Stock Bajo</Label>
                          <p className="text-sm text-muted-foreground">
                            Notificaciones cuando el inventario esté bajo
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Recordatorios de Citas</Label>
                          <p className="text-sm text-muted-foreground">
                            Enviar recordatorios automáticos a pacientes
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Alertas de Créditos Vencidos</Label>
                          <p className="text-sm text-muted-foreground">
                            Notificaciones sobre pagos pendientes
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                    <Button onClick={handleSave}>Guardar Cambios</Button>
                  </CardContent>
                </Card>
              </div>
            </RoleGuard>
          </TabsContent>

          <TabsContent value="impresion">
            <div className="space-y-6">
              {/* Printer Settings */}
              <PrinterSettingsForm />

              {/* Thermal Print Test Tool */}
              <PrintTestTool />

              {/* General Print Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de Impresión</CardTitle>
                  <CardDescription>
                    Ajustes para tickets y documentos impresos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="printer">Impresora de Tickets</Label>
                      <Input id="printer" placeholder="Nombre de la impresora" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-width">Ancho del Ticket (mm)</Label>
                      <Input id="ticket-width" type="number" defaultValue="80" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Imprimir Logo en Tickets</Label>
                        <p className="text-sm text-muted-foreground">
                          Incluir el logo de la empresa en cada ticket
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Imprimir Automáticamente</Label>
                        <p className="text-sm text-muted-foreground">
                          Imprimir ticket al completar una venta
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="footer-message">Mensaje de Pie de Ticket</Label>
                    <Textarea 
                      id="footer-message" 
                      placeholder="¡Gracias por su compra!"
                      defaultValue="¡Gracias por su preferencia! Óptica Istmeña"
                    />
                  </div>
                  <Button onClick={handleSave}>Guardar Cambios</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="facturacion">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Facturación</CardTitle>
                <CardDescription>
                  Ajustes para la emisión de facturas electrónicas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pac">Proveedor PAC</Label>
                    <Input id="pac" placeholder="Nombre del PAC" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serie">Serie de Facturación</Label>
                    <Input id="serie" defaultValue="A" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="folio">Folio Inicial</Label>
                    <Input id="folio" type="number" defaultValue="1" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regimen">Régimen Fiscal</Label>
                    <Input id="regimen" placeholder="601 - General de Ley" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Facturación Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Generar factura automáticamente al solicitar datos fiscales
                    </p>
                  </div>
                  <Switch />
                </div>
                <Button onClick={handleSave}>Guardar Cambios</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seguridad">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Seguridad</CardTitle>
                <CardDescription>
                  Políticas de seguridad y acceso al sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticación de Dos Factores</Label>
                      <p className="text-sm text-muted-foreground">
                        Requerir 2FA para todos los usuarios
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cierre de Sesión Automático</Label>
                      <p className="text-sm text-muted-foreground">
                        Cerrar sesión después de inactividad
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Tiempo de Inactividad (minutos)</Label>
                    <Input id="session-timeout" type="number" defaultValue="30" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Registro de Actividad</Label>
                      <p className="text-sm text-muted-foreground">
                        Mantener bitácora detallada de acciones
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                <Button onClick={handleSave}>Guardar Cambios</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authorization Requests Panel - Only visible to admins */}
          <TabsContent value="autorizaciones">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden gestionar solicitudes de autorización."
            >
              <AdminAuthorizationPanel />
            </RoleGuard>
          </TabsContent>

          {/* Transfer Requests Panel */}
          <TabsContent value="transferencias">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden gestionar transferencias de pacientes."
            >
              <div className="space-y-6">
                <CorporateSettings />
                <TransferRequestsPanel />
              </div>
            </RoleGuard>
          </TabsContent>

          {/* Credit Configuration - Only visible to admins */}
          <TabsContent value="credito">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden modificar la configuración de crédito."
            >
              <div className="space-y-6">
                <CreditSettingsForm />
                <InstallmentReminderSettings />
              </div>
            </RoleGuard>
          </TabsContent>

          {/* Clinical Configuration - Only visible to admins */}
          <TabsContent value="clinico">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden modificar la configuración clínica."
            >
              <AddClinicalSettings />
            </RoleGuard>
          </TabsContent>

          {/* Messaging Configuration - Only visible to admins */}
          <TabsContent value="mensajeria">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden configurar la mensajería automática."
            >
              <div className="space-y-6">
                <AutoMessageSettings />
                <MessageHistory />
              </div>
            </RoleGuard>
          </TabsContent>

          <TabsContent value="apariencia">
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>
                  Personaliza la apariencia del sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Modo Oscuro</Label>
                      <p className="text-sm text-muted-foreground">
                        Usar tema oscuro en toda la aplicación
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sidebar Compacto</Label>
                      <p className="text-sm text-muted-foreground">
                        Iniciar con el menú lateral colapsado
                      </p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Animaciones</Label>
                      <p className="text-sm text-muted-foreground">
                        Habilitar animaciones en la interfaz
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
                <Button onClick={handleSave}>Guardar Cambios</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portal del Paciente - Only visible to admins */}
          <TabsContent value="portal">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden configurar el portal del paciente."
            >
              <PatientPortalSettings />
            </RoleGuard>
          </TabsContent>

          {/* Maintenance / Database Reset - Only visible to admins */}
          <TabsContent value="mantenimiento">
            <RoleGuard 
              allowedRoles={['admin']} 
              accessDeniedTitle="Acceso restringido"
              accessDeniedMessage="Solo los administradores pueden acceder a las herramientas de mantenimiento."
            >
              <DatabaseResetSection />
            </RoleGuard>
          </TabsContent>

          <TabsContent value="integraciones">
            <Card>
              <CardHeader>
                <CardTitle>Integraciones</CardTitle>
                <CardDescription>
                  Conexiones con servicios externos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">WhatsApp Business API</h4>
                        <p className="text-sm text-muted-foreground">
                          Enviar notificaciones y mensajes automáticos
                        </p>
                      </div>
                      <Button variant="outline">Configurar</Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Servicio de Email</h4>
                        <p className="text-sm text-muted-foreground">
                          Configuración SMTP para correos del sistema
                        </p>
                      </div>
                      <Button variant="outline">Configurar</Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Pasarela de Pagos</h4>
                        <p className="text-sm text-muted-foreground">
                          Procesar pagos con tarjeta en línea
                        </p>
                      </div>
                      <Button variant="outline">Configurar</Button>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Laboratorios Externos</h4>
                        <p className="text-sm text-muted-foreground">
                          Conexión con sistemas de laboratorio
                        </p>
                      </div>
                      <Button variant="outline">Configurar</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acerca">
            <Card>
              <CardHeader>
                <CardTitle>Acerca del Sistema</CardTitle>
                <CardDescription>
                  Información del sistema y desarrollador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Sistema</p>
                    <p className="font-medium">{APP_CONFIG.appName}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Versión</p>
                    <p className="font-medium">{APP_CONFIG.appVersion}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Fecha de Build</p>
                    <p className="font-medium">{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Entorno</p>
                    <p className="font-medium capitalize">{APP_CONFIG.environment}</p>
                  </div>
                </div>

                <VersionChangelog />
                
                <div className="p-6 rounded-lg border bg-gradient-to-br from-primary/5 to-accent/5">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Desarrollado por</p>
                    <p className="text-xl font-display font-bold text-primary">Rockobox</p>
                    <DeveloperWatermark variant="copyright" className="justify-center" />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Sistema de gestión integral para ópticas. Todos los derechos reservados.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
