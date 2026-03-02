import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LabOrderPrintView } from './LabOrderPrintView';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  User,
  Phone,
  Calendar,
  Package,
  Eye,
  Glasses,
  Clock,
  CalendarCheck,
  Printer,
  MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LabOrderWhatsApp } from './LabOrderWhatsApp';
import { DeliveryScheduleModal } from '@/components/pos/DeliveryScheduleModal';

interface LabOrderDetailProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
}

interface StatusHistory {
  id: string;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  RECIBIDA: 'Recibida',
  EN_LABORATORIO: 'En Laboratorio',
  EN_OPTICA: 'En Óptica',
  LISTO_PARA_ENTREGA: 'Listo para Entrega',
  ENTREGADO: 'Entregado',
  RETRABAJO: 'Retrabajo',
  sent: 'Enviado al laboratorio',
  in_production: 'En producción',
  quality_check: 'Control de calidad',
  ready: 'Listo para entrega',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const locationLabels: Record<string, string> = {
  EN_LABORATORIO: 'En Laboratorio',
  EN_OPTICA: 'En Óptica',
};

export function LabOrderDetail({ orderId, open, onClose }: LabOrderDetailProps) {
  const [order, setOrder] = useState<any>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [promotorName, setPromotorName] = useState<string | null>(null);
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();
  
  const canScheduleDelivery = hasAnyRole(['admin', 'doctor', 'asistente']);

  useEffect(() => {
    if (open && orderId) {
      fetchOrderDetails();
    }
  }, [open, orderId]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      // Fetch order with branch info
      const { data: orderData, error: orderError } = await supabase
        .from('lab_orders')
        .select(`
          *,
          patients (first_name, last_name, mobile, phone, email),
          branches (id, name, whatsapp_number, phone, address)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch promotor name from sale if linked
      if (orderData?.sale_id) {
        const { data: saleData } = await supabase
          .from('sales')
          .select('promotor_id')
          .eq('id', orderData.sale_id)
          .single();

        if (saleData?.promotor_id && saleData.promotor_id !== '00000000-0000-0000-0000-000000000001') {
          const { data: promotorData } = await supabase
            .from('promotores')
            .select('nombre_completo')
            .eq('id', saleData.promotor_id)
            .single();
          setPromotorName(promotorData?.nombre_completo || null);
        } else {
          setPromotorName(null);
        }
      }

      // Fetch status history
      const { data: historyData, error: historyError } = await supabase
        .from('lab_order_status_history')
        .select('*')
        .eq('lab_order_id', orderId)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la orden',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Remove old inline WhatsApp function - now using LabOrderWhatsApp component

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Orden {order?.order_number || '...'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : order ? (
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 pr-4">
              {/* Status */}
              <div className="flex items-center">
                <Badge
                  className={`text-sm ${
                    order.status === 'ready' || order.status === 'LISTO_PARA_ENTREGA'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {statusLabels[order.status] || order.status}
                </Badge>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setShowPrint(!showPrint)}
                  >
                    <Printer className="h-4 w-4" />
                    {showPrint ? 'Ocultar' : 'Imprimir'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                    onClick={() => {
                      const patientFullName = `${order.patients?.first_name || ''} ${order.patients?.last_name || ''}`.trim();
                      const phone = order.patient_phone || order.patients?.mobile || order.patients?.phone;
                      
                      let msg = `📋 *Orden de Laboratorio ${order.order_number}*\n`;
                      msg += `👤 Paciente: ${patientFullName}\n`;
                      msg += `📅 Fecha: ${format(new Date(order.created_at), "dd/MM/yyyy", { locale: es })}\n`;
                      if (order.estimated_delivery_date) {
                        msg += `🗓️ Entrega estimada: ${format(new Date(order.estimated_delivery_date), "dd/MM/yyyy", { locale: es })}\n`;
                      }
                      msg += `📊 Estado: ${statusLabels[order.status] || order.status}\n\n`;
                      
                      msg += `👁️ *Graduación OD:* Esf ${order.od_sphere ?? '-'} Cil ${order.od_cylinder ?? '-'} Eje ${order.od_axis ?? '-'}° Add ${order.od_add ?? '-'}\n`;
                      msg += `👁️ *Graduación OI:* Esf ${order.oi_sphere ?? '-'} Cil ${order.oi_cylinder ?? '-'} Eje ${order.oi_axis ?? '-'}° Add ${order.oi_add ?? '-'}\n`;
                      if (order.pd_right || order.pd_left || order.pd_total) {
                        msg += `📏 DIP: ${order.pd_right || '-'}/${order.pd_left || '-'} Total: ${order.pd_total || '-'}\n`;
                      }
                      msg += `\n`;
                      
                      if (order.lens_material) msg += `🔹 Material: ${order.lens_material}\n`;
                      if (order.lens_treatment) msg += `🔹 Tratamiento: ${order.lens_treatment}\n`;
                      if (order.frame_brand || order.frame_model) {
                        msg += `🔹 Armazón: ${[order.frame_brand, order.frame_model, order.frame_color].filter(Boolean).join(' / ')}\n`;
                      }
                      if (order.notes) msg += `\n📝 Notas: ${order.notes}\n`;
                      msg += `\n_Óptica Istmeña_`;

                      const encodedMsg = encodeURIComponent(msg);
                      const whatsappUrl = phone 
                        ? `https://wa.me/${phone.replace(/\D/g, '').replace(/^(?!52)/, '52')}?text=${encodedMsg}`
                        : `https://wa.me/?text=${encodedMsg}`;
                      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Enviar WhatsApp
                  </Button>
                </div>
              </div>

              {/* Print View */}
              {showPrint && (
                <LabOrderPrintView order={order} promotorName={promotorName} />
              )}

              {/* WhatsApp Notification - Only show when ready */}
              {(order.status === 'ready' || order.status === 'LISTO_PARA_ENTREGA') && (
                <LabOrderWhatsApp
                  orderId={order.id}
                  orderNumber={order.order_number}
                  patientName={`${order.patients?.first_name || ''} ${order.patients?.last_name || ''}`}
                  patientPhone={order.patient_phone || order.patients?.mobile || order.patients?.phone}
                  patientId={order.patient_id}
                  branchId={order.branch_id}
                  estimatedDeliveryDate={order.estimated_delivery_date}
                  notificationSentAt={order.notification_sent_at}
                  notifyCount={order.notify_count || 0}
                  onNotificationSent={fetchOrderDetails}
                />
              )}

              {/* Schedule Delivery Button - Show when order is ready */}
              {(order.status === 'ready' || order.status === 'LISTO_PARA_ENTREGA') && canScheduleDelivery && order.sale_id && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={() => setShowDeliveryModal(true)}
                >
                  <CalendarCheck className="h-4 w-4" />
                  Agendar Entrega
                </Button>
              )}

              {/* Patient Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Paciente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">
                    {order.patients.first_name} {order.patients.last_name}
                  </p>
                  {order.patient_phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {order.patient_phone}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Información del pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Laboratorio</p>
                      <p className="font-medium">{order.laboratory_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tipo</p>
                      <p className="font-medium capitalize">{order.order_type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prioridad</p>
                      <Badge variant={order.priority === 'urgent' ? 'destructive' : 'secondary'}>
                        {order.priority === 'urgent' ? 'Urgente' : order.priority === 'low' ? 'Baja' : 'Normal'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Costo Lab.</p>
                      <p className="font-medium">${order.laboratory_cost?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Prescription Data */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Graduación
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* OD */}
                    <div>
                      <p className="text-sm font-medium text-primary mb-2">Ojo Derecho (OD)</p>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Esfera</p>
                          <p className="font-mono">{order.od_sphere ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cilindro</p>
                          <p className="font-mono">{order.od_cylinder ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Eje</p>
                          <p className="font-mono">{order.od_axis ?? '-'}°</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Adición</p>
                          <p className="font-mono">{order.od_add ?? '-'}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* OI */}
                    <div>
                      <p className="text-sm font-medium text-primary mb-2">Ojo Izquierdo (OI)</p>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Esfera</p>
                          <p className="font-mono">{order.oi_sphere ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cilindro</p>
                          <p className="font-mono">{order.oi_cylinder ?? '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Eje</p>
                          <p className="font-mono">{order.oi_axis ?? '-'}°</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Adición</p>
                          <p className="font-mono">{order.oi_add ?? '-'}</p>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* PD */}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">DIP Derecha</p>
                        <p className="font-mono">{order.pd_right ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">DIP Izquierda</p>
                        <p className="font-mono">{order.pd_left ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">DIP Total</p>
                        <p className="font-mono">{order.pd_total ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Altura montaje</p>
                        <p className="font-mono">{order.fitting_height ?? '-'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Material / Treatment / Frame - Highlighted */}
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Glasses className="h-4 w-4" />
                    Material / Tratamiento / Armazón
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Material</p>
                      <p className="font-semibold text-base">
                        {order.lens_material || (
                          <span className="text-orange-500 text-sm font-normal">No especificado</span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Tratamiento</p>
                      <p className="font-semibold text-base">
                        {order.lens_treatment || (
                          <span className="text-orange-500 text-sm font-normal">No especificado</span>
                        )}
                      </p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Armazón</p>
                      <p className="font-semibold text-base">
                        {order.frame_brand || order.frame_model ? (
                          [order.frame_brand, order.frame_model, order.frame_color, order.frame_size].filter(Boolean).join(' / ')
                        ) : (
                          <span className="text-orange-500 text-sm font-normal">No especificado</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Additional details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Tipo de lente</p>
                      <p className="font-medium capitalize">{order.lens_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Color lente</p>
                      <p className="font-medium">{order.lens_color || '-'}</p>
                    </div>
                    {order.frame_model && (
                      <div>
                        <p className="text-muted-foreground">Modelo armazón</p>
                        <p className="font-medium">{order.frame_model}</p>
                      </div>
                    )}
                    {order.frame_size && (
                      <div>
                        <p className="text-muted-foreground">Medidas</p>
                        <p className="font-medium">{order.frame_size}</p>
                      </div>
                    )}
                  </div>

                  {/* Link to sale if data is missing */}
                  {(!order.lens_material && !order.lens_treatment && !order.frame_brand) && order.sale_id && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-orange-600">
                        ⚠️ No se detectaron productos. Revisa la venta vinculada.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fechas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Creación</p>
                      <p className="font-medium">
                        {format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entrega estimada</p>
                      <p className="font-medium">
                        {order.estimated_delivery_date
                          ? format(new Date(order.estimated_delivery_date), "dd MMM yyyy", { locale: es })
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entrega real</p>
                      <p className="font-medium">
                        {order.actual_delivery_date
                          ? format(new Date(order.actual_delivery_date), "dd MMM yyyy", { locale: es })
                          : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {(order.special_instructions || order.internal_notes) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {order.special_instructions && (
                      <div>
                        <p className="text-muted-foreground">Instrucciones especiales</p>
                        <p>{order.special_instructions}</p>
                      </div>
                    )}
                    {order.internal_notes && (
                      <div>
                        <p className="text-muted-foreground">Notas internas</p>
                        <p>{order.internal_notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              {history.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Historial de estados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {history.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                          <div className="flex-1">
                            <p className="font-medium">
                              {item.previous_status
                                ? `${statusLabels[item.previous_status] || item.previous_status} → ${statusLabels[item.new_status] || item.new_status}`
                                : statusLabels[item.new_status] || item.new_status}
                            </p>
                            <p className="text-muted-foreground">
                              {format(new Date(item.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                            </p>
                            {item.notes && <p className="text-muted-foreground mt-1">{item.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        ) : null}

        {/* Delivery Schedule Modal */}
        {order && order.patient_id && order.sale_id && (
          <DeliveryScheduleModal
            open={showDeliveryModal}
            onOpenChange={setShowDeliveryModal}
            patientId={order.patient_id}
            patientName={`${order.patients?.first_name || ''} ${order.patients?.last_name || ''}`}
            patientPhone={order.patient_phone || order.patients?.mobile || order.patients?.phone}
            saleId={order.sale_id}
            saleNumber={order.order_number}
            labOrderId={order.id}
            branchId={order.branch_id}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
