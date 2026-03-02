import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  FileText, Mail, Users, Calendar as CalendarIcon, 
  Download, Send, Clock, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ExecutiveQuickActions() {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date>();
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailSubject, setEmailSubject] = useState('Resumen Ejecutivo - Óptica Istmeña');
  const [meetingSubject, setMeetingSubject] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    
    // Simulate PDF generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Create a simple PDF-like report (in reality, you'd use a library like jsPDF)
    const reportContent = `
REPORTE EJECUTIVO - ÓPTICA ISTMEÑA
Fecha: ${format(new Date(), 'dd MMMM yyyy', { locale: es })}
=====================================

RESUMEN DE KPIs
---------------
• Ventas del Mes: $75,000.00
• Utilidad Bruta: $26,250.00 (35%)
• Clientes Atendidos: 150
• Ticket Promedio: $500.00
• Inventario Valorizado: $250,000.00
• Cuentas por Cobrar: $45,000.00

ALERTAS PENDIENTES
------------------
• 2 sucursales con bajo rendimiento
• 3 productos con margen negativo
• 5 cuentas vencidas > 30 días

Generado automáticamente por el sistema.
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-ejecutivo-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    setIsGeneratingPDF(false);
    toast.success('Reporte ejecutivo generado', {
      description: 'El archivo se ha descargado correctamente.',
    });
  };

  const handleSendEmail = () => {
    if (!emailRecipients.trim()) {
      toast.error('Ingresa al menos un destinatario');
      return;
    }
    
    // In production, this would call an edge function to send the email
    toast.success('Resumen enviado', {
      description: `Email enviado a: ${emailRecipients}`,
    });
    setEmailDialogOpen(false);
    setEmailRecipients('');
  };

  const handleScheduleMeeting = () => {
    if (!meetingDate || !meetingSubject.trim()) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    
    // In production, this would integrate with calendar or notification system
    toast.success('Reunión programada', {
      description: `${meetingSubject} - ${format(meetingDate, 'PPP', { locale: es })}`,
    });
    setMeetingDialogOpen(false);
    setMeetingDate(undefined);
    setMeetingSubject('');
    setMeetingNotes('');
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Clock className="h-5 w-5 animate-spin" />
            ) : (
              <FileText className="h-5 w-5 text-blue-600" />
            )}
            <div className="text-left">
              <div className="font-medium">Generar Reporte PDF</div>
              <div className="text-xs text-muted-foreground">Exportar resumen ejecutivo</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-5 w-5 text-green-600" />
            <div className="text-left">
              <div className="font-medium">Enviar Resumen por Email</div>
              <div className="text-xs text-muted-foreground">Compartir con el equipo</div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => setMeetingDialogOpen(true)}
          >
            <Users className="h-5 w-5 text-purple-600" />
            <div className="text-left">
              <div className="font-medium">Programar Junta</div>
              <div className="text-xs text-muted-foreground">Agendar reunión de equipo</div>
            </div>
          </Button>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Última actualización: {format(new Date(), 'HH:mm', { locale: es })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Resumen por Email</DialogTitle>
            <DialogDescription>
              Envía un resumen ejecutivo a los miembros del equipo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipients">Destinatarios</Label>
              <Input
                id="recipients"
                placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separa múltiples correos con comas
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Asunto</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendEmail}>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar Junta de Equipo</DialogTitle>
            <DialogDescription>
              Agenda una reunión para revisar el desempeño del negocio.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-subject">Tema de la reunión *</Label>
              <Input
                id="meeting-subject"
                placeholder="Ej: Revisión mensual de ventas"
                value={meetingSubject}
                onChange={(e) => setMeetingSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de la reunión *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !meetingDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {meetingDate ? format(meetingDate, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={meetingDate}
                    onSelect={setMeetingDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-notes">Notas (opcional)</Label>
              <Textarea
                id="meeting-notes"
                placeholder="Puntos a tratar, participantes requeridos..."
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleScheduleMeeting}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Programar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
