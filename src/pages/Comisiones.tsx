import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ComisionesWidget } from '@/components/comisiones/ComisionesWidget';
import { ComisionDetail } from '@/components/comisiones/ComisionDetail';
import { 
  Megaphone, 
  Search, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  DollarSign,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { format, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const DEFAULT_PROMOTOR_ID = '00000000-0000-0000-0000-000000000001';

interface ComisionAgrupada {
  promotor_id: string;
  promotor_nombre: string;
  periodo: string;
  total_ventas: number;
  total_comision: number;
  status: 'PENDIENTE' | 'PAGADA' | 'MIXTO';
  cantidad_registros: number;
  comision_ids: string[];
  paid_at?: string;
}

export default function Comisiones() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedPromotor, setSelectedPromotor] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedComisiones, setSelectedComisiones] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<ComisionAgrupada | null>(null);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentNotes, setPaymentNotes] = useState('');

  const { toast } = useToast();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch promotores for filter
  const { data: promotores = [] } = useQuery({
    queryKey: ['promotores-comisiones-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotores')
        .select('id, nombre_completo')
        .neq('id', DEFAULT_PROMOTOR_ID)
        .order('nombre_completo');
      if (error) throw error;
      return data;
    },
  });

  // Fetch comisiones with aggregation
  const { data: comisiones = [], isLoading } = useQuery({
    queryKey: ['comisiones-list', selectedPeriod, selectedPromotor, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('promotor_comisiones')
        .select(`
          id,
          promotor_id,
          sale_id,
          monto_venta,
          monto_comision,
          tipo_comision,
          valor_aplicado,
          status,
          periodo,
          paid_at,
          paid_by,
          payment_notes,
          created_at,
          promotores(nombre_completo)
        `)
        .eq('periodo', selectedPeriod)
        .order('created_at', { ascending: false });

      if (selectedPromotor !== 'all') {
        query = query.eq('promotor_id', selectedPromotor);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by promotor and period
      const aggregated: Record<string, ComisionAgrupada> = {};
      
      data.forEach(comision => {
        const key = `${comision.promotor_id}-${comision.periodo}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            promotor_id: comision.promotor_id,
            promotor_nombre: (comision.promotores as any)?.nombre_completo || 'Desconocido',
            periodo: comision.periodo,
            total_ventas: 0,
            total_comision: 0,
            status: comision.status as 'PENDIENTE' | 'PAGADA',
            cantidad_registros: 0,
            comision_ids: [],
            paid_at: comision.paid_at || undefined,
          };
        }
        aggregated[key].total_ventas += Number(comision.monto_venta) || 0;
        aggregated[key].total_comision += Number(comision.monto_comision) || 0;
        aggregated[key].cantidad_registros += 1;
        aggregated[key].comision_ids.push(comision.id);
        
        // Determine mixed status
        if (aggregated[key].status !== comision.status) {
          aggregated[key].status = 'MIXTO';
        }
      });

      return Object.values(aggregated);
    },
  });

  // Filter by search term
  const filteredComisiones = comisiones.filter(c => 
    !searchTerm || c.promotor_nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate summary
  const summary = {
    totalPendiente: comisiones
      .filter(c => c.status === 'PENDIENTE' || c.status === 'MIXTO')
      .reduce((sum, c) => sum + c.total_comision, 0),
    totalPagado: comisiones
      .filter(c => c.status === 'PAGADA')
      .reduce((sum, c) => sum + c.total_comision, 0),
    countPendiente: comisiones.filter(c => c.status === 'PENDIENTE' || c.status === 'MIXTO').length,
    countPagado: comisiones.filter(c => c.status === 'PAGADA').length,
  };

  // Mark as paid mutation
  const markAsPaid = useMutation({
    mutationFn: async (comisionIds: string[]) => {
      const { error } = await supabase
        .from('promotor_comisiones')
        .update({
          status: 'PAGADA',
          paid_at: new Date().toISOString(),
          paid_by: profile?.userId,
          payment_notes: paymentNotes || null,
        })
        .in('id', comisionIds);

      if (error) throw error;

      // Log to audit - using console for now as access_logs has limited event types
      console.log('Commission payment audit:', {
        user: user?.email,
        user_id: profile?.userId,
        action: 'mark_commissions_paid',
        comision_ids: comisionIds,
        payment_notes: paymentNotes,
        count: comisionIds.length,
        timestamp: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comisiones-list'] });
      queryClient.invalidateQueries({ queryKey: ['comisiones-summary'] });
      setSelectedComisiones([]);
      setPayDialogOpen(false);
      setPaymentNotes('');
      toast({
        title: 'Comisiones marcadas como pagadas',
        description: `Se marcaron ${selectedComisiones.length} registros como pagados`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al procesar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: es }),
    };
  });

  // Toggle selection
  const toggleSelection = (comisionIds: string[]) => {
    const allSelected = comisionIds.every(id => selectedComisiones.includes(id));
    if (allSelected) {
      setSelectedComisiones(prev => prev.filter(id => !comisionIds.includes(id)));
    } else {
      setSelectedComisiones(prev => [...new Set([...prev, ...comisionIds])]);
    }
  };

  // Select all pending
  const selectAllPending = () => {
    const pendingIds = filteredComisiones
      .filter(c => c.status === 'PENDIENTE' || c.status === 'MIXTO')
      .flatMap(c => c.comision_ids);
    setSelectedComisiones(pendingIds);
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ['Promotor', 'Periodo', 'Ventas', 'Comisión', 'Estado', 'Fecha Pago'];
    const rows = filteredComisiones.map(c => [
      c.promotor_nombre,
      c.periodo,
      c.total_ventas.toFixed(2),
      c.total_comision.toFixed(2),
      c.status,
      c.paid_at ? format(parseISO(c.paid_at), 'dd/MM/yyyy') : '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comisiones-${selectedPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToXLSX = () => {
    // For XLSX we'll use CSV format with .xlsx extension
    // A proper XLSX would require a library like xlsx
    toast({
      title: 'Exportando...',
      description: 'El archivo se descargará en formato CSV compatible con Excel',
    });
    exportToCSV();
  };

  const handleViewDetail = (comision: ComisionAgrupada) => {
    setSelectedDetail(comision);
    setDetailOpen(true);
  };

  const handleMarkPaid = () => {
    if (selectedComisiones.length === 0) {
      toast({
        title: 'Seleccione comisiones',
        description: 'Debe seleccionar al menos una comisión pendiente',
        variant: 'destructive',
      });
      return;
    }
    setPayDialogOpen(true);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PAGADA':
        return <Badge className="bg-success/10 text-success border-success/20">Pagada</Badge>;
      case 'MIXTO':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Parcial</Badge>;
      default:
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Pendiente</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <DollarSign className="h-8 w-8 text-primary" />
              Comisiones de Promotores
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestión y pago de comisiones generadas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportToXLSX}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Dashboard Widgets */}
        <ComisionesWidget />

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[180px]">
                <Label className="text-xs">Periodo</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[200px]">
                <Label className="text-xs">Promotor</Label>
                <Select value={selectedPromotor} onValueChange={setSelectedPromotor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los promotores</SelectItem>
                    {promotores.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]">
                <Label className="text-xs">Estado</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                    <SelectItem value="PAGADA">Pagada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar promotor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Bar */}
        {selectedComisiones.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {selectedComisiones.length} comisión(es) seleccionada(s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedComisiones([])}>
                    Deseleccionar
                  </Button>
                  <Button onClick={handleMarkPaid}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Pagadas
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500 opacity-75" />
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">
                ${summary.totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">{summary.countPendiente} registros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success opacity-75" />
              <p className="text-sm text-muted-foreground">Pagadas</p>
              <p className="text-2xl font-bold text-success">
                ${summary.totalPagado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">{summary.countPagado} registros</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Megaphone className="h-8 w-8 mx-auto mb-2 text-primary opacity-75" />
              <p className="text-sm text-muted-foreground">Promotores</p>
              <p className="text-2xl font-bold">{filteredComisiones.length}</p>
              <p className="text-xs text-muted-foreground">con comisiones</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-8 w-8 mx-auto mb-2 text-accent opacity-75" />
              <p className="text-sm text-muted-foreground">Total Periodo</p>
              <p className="text-2xl font-bold text-accent">
                ${(summary.totalPendiente + summary.totalPagado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">comisiones generadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Comisiones del Periodo</CardTitle>
              {summary.countPendiente > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAllPending}>
                  Seleccionar todas las pendientes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredComisiones.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No hay comisiones en este periodo</p>
                <p className="text-sm">Las comisiones se generan automáticamente al cerrar ventas con promotores externos</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            filteredComisiones.length > 0 &&
                            filteredComisiones
                              .filter(c => c.status !== 'PAGADA')
                              .every(c => c.comision_ids.every(id => selectedComisiones.includes(id)))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllPending();
                            } else {
                              setSelectedComisiones([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Promotor</TableHead>
                      <TableHead>Periodo</TableHead>
                      <TableHead className="text-right">Ventas</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Pago</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComisiones.map((comision) => {
                      const isSelected = comision.comision_ids.every(id => selectedComisiones.includes(id));
                      const isPaid = comision.status === 'PAGADA';
                      
                      return (
                        <TableRow 
                          key={`${comision.promotor_id}-${comision.periodo}`}
                          className={isSelected ? 'bg-primary/5' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              disabled={isPaid}
                              onCheckedChange={() => toggleSelection(comision.comision_ids)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{comision.promotor_nombre}</TableCell>
                          <TableCell>
                            {format(parseISO(`${comision.periodo}-01`), 'MMMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            ${comision.total_ventas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({comision.cantidad_registros})
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            ${comision.total_comision.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{statusBadge(comision.status)}</TableCell>
                          <TableCell>
                            {comision.paid_at ? (
                              <span className="text-sm">
                                {format(parseISO(comision.paid_at), 'dd/MM/yyyy')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(comision)}
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="center" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Detalle de Comisión
            </SheetTitle>
          </SheetHeader>
          {selectedDetail && (
            <ComisionDetail
              promotorId={selectedDetail.promotor_id}
              periodo={selectedDetail.periodo}
              onClose={() => setDetailOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Confirmar Pago de Comisiones
            </DialogTitle>
            <DialogDescription>
              Esta acción marcará {selectedComisiones.length} comisión(es) como pagadas y no podrá revertirse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Comentario (opcional)</Label>
              <Textarea
                placeholder="Agregar notas sobre el pago..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Se registrará:</p>
              <ul className="text-sm mt-2 space-y-1">
                <li>• Fecha: {format(new Date(), 'dd/MM/yyyy HH:mm')}</li>
                <li>• Usuario: {profile?.fullName || user?.email}</li>
                <li>• Cantidad: {selectedComisiones.length} comisión(es)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => markAsPaid.mutate(selectedComisiones)}
              disabled={markAsPaid.isPending}
            >
              {markAsPaid.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar Pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
