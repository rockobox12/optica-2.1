import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { formatDistanceToNow, format, isToday, isPast, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  AlertTriangle,
  Clock,
  Eye,
  MessageCircle,
  Package,
  CheckCircle,
  Truck,
  Building2,
  Calendar,
  RefreshCw,
  User,
  Filter,
  Glasses,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
  branch_id: string | null;
  notes?: string | null;
  patients: {
    first_name: string;
    last_name: string;
  };
  branches?: {
    name: string;
  } | null;
}

interface KanbanColumn {
  id: string;
  title: string;
  statuses: string[];
  bgColor: string;
  headerColor: string;
  icon: React.ElementType;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'pending',
    title: 'Pendiente',
    statuses: ['pending', 'RECIBIDA'],
    bgColor: 'bg-slate-50',
    headerColor: 'bg-slate-500',
    icon: Clock,
  },
  {
    id: 'in_progress',
    title: 'En Proceso',
    statuses: ['sent', 'in_production', 'EN_LABORATORIO', 'quality_check'],
    bgColor: 'bg-blue-50',
    headerColor: 'bg-primary',
    icon: Package,
  },
  {
    id: 'ready',
    title: 'Listo para Entrega',
    statuses: ['ready', 'LISTO_PARA_ENTREGA', 'EN_OPTICA'],
    bgColor: 'bg-emerald-50',
    headerColor: 'bg-success',
    icon: CheckCircle,
  },
  {
    id: 'delivered',
    title: 'Entregado',
    statuses: ['delivered', 'ENTREGADO'],
    bgColor: 'bg-green-100',
    headerColor: 'bg-green-700',
    icon: Truck,
  },
];

const STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  in_progress: 'in_production',
  ready: 'LISTO_PARA_ENTREGA',
  delivered: 'ENTREGADO',
};

interface LabOrderKanbanProps {
  onViewOrder?: (orderId: string) => void;
}

export function LabOrderKanban({ onViewOrder }: LabOrderKanbanProps) {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('pending');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersRes, branchesRes] = await Promise.all([
        supabase
          .from('lab_orders')
          .select(`
            *,
            patients!inner (first_name, last_name),
            branches (name)
          `)
          .not('status', 'eq', 'cancelled')
          .order('created_at', { ascending: false }),
        supabase
          .from('branches')
          .select('id, name')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      setOrders(ordersRes.data || []);
      setBranches(branchesRes.data || []);
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
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      // Also update location if moving to ready/delivered
      const updates: { status: string; location?: string } = { status: newStatus };
      if (['LISTO_PARA_ENTREGA', 'ENTREGADO'].includes(newStatus)) {
        updates.location = 'EN_OPTICA';
      }

      const { error } = await supabase
        .from('lab_orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      // Optimistic update
      setOrders(prev => prev.map(o => 
        o.id === orderId 
          ? { ...o, status: newStatus, location: updates.location || o.location } 
          : o
      ));

      toast({
        title: 'Estado actualizado',
        description: 'La orden ha sido movida correctamente',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
      fetchOrders(); // Revert on error
    }
  };

  const handleDragEnd = (result: DropResult) => {
    const { draggableId, destination, source } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const newStatus = STATUS_MAP[destination.droppableId];
    if (newStatus) {
      updateOrderStatus(draggableId, newStatus);
    }
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      if (search.length >= 2) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          order.order_number.toLowerCase().includes(searchLower) ||
          order.patients.first_name.toLowerCase().includes(searchLower) ||
          order.patients.last_name.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Branch filter
      if (branchFilter !== 'all' && order.branch_id !== branchFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all' && order.estimated_delivery_date) {
        const deliveryDate = new Date(order.estimated_delivery_date);
        if (dateFilter === 'today' && !isToday(deliveryDate)) return false;
        if (dateFilter === 'overdue' && !isPast(deliveryDate)) return false;
        if (dateFilter === 'tomorrow' && !isTomorrow(deliveryDate)) return false;
      }

      return true;
    });
  }, [orders, search, branchFilter, dateFilter]);

  // Group by column
  const ordersByColumn = useMemo(() => {
    const grouped: Record<string, LabOrder[]> = {};
    KANBAN_COLUMNS.forEach(col => {
      grouped[col.id] = filteredOrders.filter(o => col.statuses.includes(o.status));
    });
    return grouped;
  }, [filteredOrders]);

  const getDeliveryStatus = (order: LabOrder): 'overdue' | 'today' | 'upcoming' | 'none' => {
    if (!order.estimated_delivery_date) return 'none';
    const date = new Date(order.estimated_delivery_date);
    if (isPast(date) && !isToday(date)) return 'overdue';
    if (isToday(date)) return 'today';
    return 'upcoming';
  };

  const OrderCard = ({ order, index }: { order: LabOrder; index: number }) => {
    const deliveryStatus = getDeliveryStatus(order);
    const isOverdue = deliveryStatus === 'overdue';
    const isDueToday = deliveryStatus === 'today';

    return (
      <Draggable draggableId={order.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "bg-card rounded-lg border shadow-sm p-3 mb-2 cursor-grab active:cursor-grabbing transition-all",
              snapshot.isDragging && "shadow-lg scale-[1.02] rotate-1",
              isOverdue && "border-destructive border-2 animate-pulse",
              isDueToday && "border-warning border-2",
              !isOverdue && !isDueToday && "border-border hover:border-primary/30"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {order.patients.first_name} {order.patients.last_name}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  #{order.order_number}
                </p>
              </div>
              {isOverdue && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-destructive animate-pulse">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Orden atrasada</TooltipContent>
                </Tooltip>
              )}
              {isDueToday && !isOverdue && (
                <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                  Hoy
                </Badge>
              )}
            </div>

            {/* Product info */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Glasses className="h-3 w-3" />
              <span className="truncate">
                {order.order_type || 'Lentes graduados'}
              </span>
            </div>

            {/* Delivery date */}
            {order.estimated_delivery_date && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs mb-2",
                isOverdue ? "text-destructive" : isDueToday ? "text-warning" : "text-muted-foreground"
              )}>
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(order.estimated_delivery_date), "dd MMM", { locale: es })}
                  {' · '}
                  {formatDistanceToNow(new Date(order.estimated_delivery_date), { 
                    addSuffix: true, 
                    locale: es 
                  })}
                </span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                {order.laboratory_name && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-secondary text-[10px]">
                          {order.laboratory_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{order.laboratory_name}</TooltipContent>
                  </Tooltip>
                )}
                {order.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-[10px] h-5">
                    Urgente
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewOrder?.(order.id);
                      }}
                    >
                      <Eye className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver detalles</TooltipContent>
                </Tooltip>

                {order.patient_phone && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          const phone = order.patient_phone?.replace(/\D/g, '');
                          window.open(`https://wa.me/52${phone}`, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-success" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>WhatsApp</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  const KanbanColumnComponent = ({ column }: { column: KanbanColumn }) => {
    const columnOrders = ordersByColumn[column.id] || [];
    const Icon = column.icon;

    return (
      <div className={cn(
        "flex flex-col rounded-xl min-w-[280px] w-[280px] flex-shrink-0",
        column.bgColor
      )}>
        {/* Column Header */}
        <div className={cn(
          "px-3 py-2.5 rounded-t-xl flex items-center justify-between",
          column.headerColor
        )}>
          <div className="flex items-center gap-2 text-white">
            <Icon className="h-4 w-4" />
            <span className="font-semibold text-sm">{column.title}</span>
          </div>
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {columnOrders.length}
          </Badge>
        </div>

        {/* Column Content */}
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "flex-1 p-2 overflow-y-auto min-h-[200px] transition-colors",
                snapshot.isDraggingOver && "bg-primary/5"
              )}
              style={{ maxHeight: 'calc(100vh - 280px)' }}
            >
              {columnOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Icon className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">Sin órdenes</p>
                </div>
              ) : (
                columnOrders.map((order, index) => (
                  <OrderCard key={order.id} order={order} index={index} />
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1 max-w-md" />
          <Skeleton className="h-11 w-32" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-[280px] flex-shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Mobile view - Tabs
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Search & Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar orden o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="icon" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            {KANBAN_COLUMNS.map(col => (
              <TabsTrigger key={col.id} value={col.id} className="text-xs gap-1">
                <col.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{col.title.split(' ')[0]}</span>
                <Badge variant="secondary" className="h-5 text-[10px] ml-1">
                  {ordersByColumn[col.id]?.length || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {KANBAN_COLUMNS.map(col => (
            <TabsContent key={col.id} value={col.id} className="mt-4">
              <div className="space-y-2">
                {(ordersByColumn[col.id] || []).length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <col.icon className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Sin órdenes en esta columna</p>
                    </CardContent>
                  </Card>
                ) : (
                  (ordersByColumn[col.id] || []).map((order, index) => {
                    const deliveryStatus = getDeliveryStatus(order);
                    const isOverdue = deliveryStatus === 'overdue';
                    const isDueToday = deliveryStatus === 'today';

                    return (
                      <Card 
                        key={order.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          isOverdue && "border-destructive border-2",
                          isDueToday && "border-warning border-2"
                        )}
                        onClick={() => onViewOrder?.(order.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold">
                                {order.patients.first_name} {order.patients.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">
                                #{order.order_number}
                              </p>
                            </div>
                            {isOverdue && (
                              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {order.estimated_delivery_date 
                                ? format(new Date(order.estimated_delivery_date), "dd MMM", { locale: es })
                                : 'Sin fecha'
                              }
                            </div>
                            {order.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">Urgente</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Desktop view - Kanban
  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número de orden o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-[160px]">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {branches.map(branch => (
              <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Fecha entrega
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-1">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'overdue', label: 'Atrasadas' },
                { value: 'today', label: 'Hoy' },
                { value: 'tomorrow', label: 'Mañana' },
              ].map(option => (
                <Button
                  key={option.value}
                  variant={dateFilter === option.value ? 'secondary' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    setDateFilter(option.value);
                    setFiltersOpen(false);
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" onClick={fetchOrders} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="flex gap-2 text-sm">
        <Badge variant="outline" className="gap-1">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold">{filteredOrders.length}</span>
        </Badge>
        {filteredOrders.filter(o => getDeliveryStatus(o) === 'overdue').length > 0 && (
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <AlertTriangle className="h-3 w-3" />
            {filteredOrders.filter(o => getDeliveryStatus(o) === 'overdue').length} atrasadas
          </Badge>
        )}
        {filteredOrders.filter(o => getDeliveryStatus(o) === 'today').length > 0 && (
          <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
            <Clock className="h-3 w-3" />
            {filteredOrders.filter(o => getDeliveryStatus(o) === 'today').length} para hoy
          </Badge>
        )}
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          {KANBAN_COLUMNS.map(column => (
            <KanbanColumnComponent key={column.id} column={column} />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
