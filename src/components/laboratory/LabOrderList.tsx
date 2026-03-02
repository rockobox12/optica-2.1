import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Loader2,
  RefreshCw,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LabOrder {
  id: string;
  order_number: string;
  patient_id: string;
  laboratory_name: string | null;
  order_type: string;
  priority: string;
  status: string;
  location: string;
  estimated_delivery_date: string | null;
  whatsapp_notification_sent: boolean;
  patient_phone: string | null;
  created_at: string;
  patients: {
    first_name: string;
    last_name: string;
  };
}

const locationConfig: Record<string, { label: string; color: string }> = {
  EN_LABORATORIO: { label: 'Laboratorio', color: 'bg-amber-100 text-amber-800' },
  EN_OPTICA: { label: 'En Óptica', color: 'bg-teal-100 text-teal-800' },
};

interface LabOrderListProps {
  onViewOrder?: (orderId: string) => void;
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  RECIBIDA: { label: 'Recibida', color: 'bg-blue-100 text-blue-800', icon: Package },
  EN_LABORATORIO: { label: 'En Laboratorio', color: 'bg-purple-100 text-purple-800', icon: Truck },
  EN_OPTICA: { label: 'En Óptica', color: 'bg-teal-100 text-teal-800', icon: Package },
  LISTO_PARA_ENTREGA: { label: 'Listo para Entrega', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  ENTREGADO: { label: 'Entregado', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  RETRABAJO: { label: 'Retrabajo', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-800', icon: Truck },
  in_production: { label: 'En producción', color: 'bg-purple-100 text-purple-800', icon: Package },
  quality_check: { label: 'Control de calidad', color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  ready: { label: 'Listo', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  delivered: { label: 'Entregado', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'bg-gray-100 text-gray-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-600' },
};

export function LabOrderList({ onViewOrder, onRefresh }: LabOrderListProps) {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notifying, setNotifying] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lab_orders')
        .select(`
          *,
          patients!inner (first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las órdenes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('lab_orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Estado actualizado',
        description: `La orden ha sido actualizada a "${statusConfig[newStatus]?.label || newStatus}"`,
      });

      fetchOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
    }
  };

  const sendWhatsAppNotification = async (order: LabOrder) => {
    if (!order.patient_phone) {
      toast({
        title: 'Error',
        description: 'El paciente no tiene número de teléfono registrado',
        variant: 'destructive',
      });
      return;
    }

    setNotifying(order.id);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          orderId: order.id,
          phone: order.patient_phone,
          patientName: `${order.patients.first_name} ${order.patients.last_name}`,
          orderNumber: order.order_number,
        },
      });

      if (error) throw error;

      // Update order to mark notification as sent
      await supabase
        .from('lab_orders')
        .update({
          whatsapp_notification_sent: true,
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      toast({
        title: 'Notificación enviada',
        description: 'El paciente ha sido notificado por WhatsApp',
      });

      fetchOrders();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo enviar la notificación',
        variant: 'destructive',
      });
    } finally {
      setNotifying(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(searchLower) ||
      order.patients.first_name.toLowerCase().includes(searchLower) ||
      order.patients.last_name.toLowerCase().includes(searchLower) ||
      (order.laboratory_name?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending' || o.status === 'RECIBIDA').length,
    inProduction: orders.filter(o => o.status === 'in_production' || o.status === 'EN_LABORATORIO').length,
    ready: orders.filter(o => o.status === 'ready' || o.status === 'LISTO_PARA_ENTREGA').length,
    inOptica: orders.filter(o => o.location === 'EN_OPTICA').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total órdenes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">{stats.inProduction}</div>
            <p className="text-xs text-muted-foreground">En producción</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
            <p className="text-xs text-muted-foreground">Listos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, paciente o laboratorio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchOrders}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Orden</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Laboratorio</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Entrega Est.</TableHead>
                <TableHead>Notificación</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron órdenes
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const StatusIcon = statusConfig[order.status]?.icon || Clock;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        {order.patients.first_name} {order.patients.last_name}
                      </TableCell>
                      <TableCell>{order.laboratory_name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={priorityConfig[order.priority]?.color}>
                          {priorityConfig[order.priority]?.label || order.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusConfig[order.status]?.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[order.status]?.label || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={locationConfig[order.location]?.color || 'bg-muted text-muted-foreground'}>
                          {locationConfig[order.location]?.label || order.location || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.estimated_delivery_date
                          ? format(new Date(order.estimated_delivery_date), 'dd MMM yyyy', { locale: es })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {order.status === 'ready' && !order.whatsapp_notification_sent && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendWhatsAppNotification(order)}
                            disabled={notifying === order.id}
                          >
                            {notifying === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <MessageSquare className="h-4 w-4 mr-1" />
                                Notificar
                              </>
                            )}
                          </Button>
                        )}
                        {order.whatsapp_notification_sent && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onViewOrder?.(order.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => updateOrderStatus(order.id, 'sent')}
                              disabled={order.status === 'sent'}
                            >
                              Marcar como enviado
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateOrderStatus(order.id, 'in_production')}
                              disabled={order.status === 'in_production'}
                            >
                              En producción
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateOrderStatus(order.id, 'quality_check')}
                              disabled={order.status === 'quality_check'}
                            >
                              Control de calidad
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateOrderStatus(order.id, 'ready')}
                              disabled={order.status === 'ready'}
                            >
                              Marcar como listo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              disabled={order.status === 'delivered'}
                            >
                              Marcar como entregado
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => updateOrderStatus(order.id, 'cancelled')}
                              className="text-destructive"
                              disabled={order.status === 'cancelled'}
                            >
                              Cancelar orden
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
