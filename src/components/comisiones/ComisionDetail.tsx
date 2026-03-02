import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Megaphone, User, Calendar, DollarSign, Receipt, Building, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ComisionDetailProps {
  promotorId: string;
  periodo: string;
  onClose: () => void;
}

export function ComisionDetail({ promotorId, periodo, onClose }: ComisionDetailProps) {
  // Fetch promotor data
  const { data: promotor } = useQuery({
    queryKey: ['promotor-detail', promotorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotores')
        .select('*')
        .eq('id', promotorId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch commission details with sales
  const { data: comisiones = [] } = useQuery({
    queryKey: ['comision-detail', promotorId, periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotor_comisiones')
        .select(`
          *,
          sales(
            id,
            sale_number,
            total,
            created_at,
            branch_id,
            seller_id,
            branches(name),
            profiles!sales_seller_id_fkey(full_name)
          )
        `)
        .eq('promotor_id', promotorId)
        .eq('periodo', periodo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Calculate totals
  const totals = {
    ventas: comisiones.reduce((sum, c) => sum + (Number(c.monto_venta) || 0), 0),
    comision: comisiones.reduce((sum, c) => sum + (Number(c.monto_comision) || 0), 0),
    pendientes: comisiones.filter(c => c.status === 'PENDIENTE').length,
    pagadas: comisiones.filter(c => c.status === 'PAGADA').length,
  };

  const paidComision = comisiones.find(c => c.status === 'PAGADA' && c.paid_at);

  return (
    <div className="mt-6 space-y-6">
      {/* Promotor Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{promotor?.nombre_completo || 'Cargando...'}</h3>
              <p className="text-sm text-muted-foreground">
                Periodo: {format(parseISO(`${periodo}-01`), 'MMMM yyyy', { locale: es })}
              </p>
              {promotor?.telefono && (
                <p className="text-sm text-muted-foreground">Tel: {promotor.telefono}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto mb-1 text-primary opacity-75" />
            <p className="text-xs text-muted-foreground">Total Vendido</p>
            <p className="text-xl font-bold">
              ${totals.ventas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Receipt className="h-6 w-6 mx-auto mb-1 text-success opacity-75" />
            <p className="text-xs text-muted-foreground">Total Comisión</p>
            <p className="text-xl font-bold text-success">
              ${totals.comision.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary */}
      <div className="flex gap-4">
        <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
          <Clock className="h-3 w-3" />
          {totals.pendientes} Pendientes
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1 px-3 py-1 text-success border-success/30">
          <CheckCircle className="h-3 w-3" />
          {totals.pagadas} Pagadas
        </Badge>
      </div>

      {/* Payment Info (if paid) */}
      {paidComision && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-medium text-success">Pago Registrado</span>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Fecha: </span>
                {format(parseISO(paidComision.paid_at), 'dd/MM/yyyy HH:mm')}
              </p>
              {paidComision.payment_notes && (
                <p>
                  <span className="text-muted-foreground">Notas: </span>
                  {paidComision.payment_notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Sales Detail */}
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          Ventas Asociadas ({comisiones.length})
        </h4>
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Venta</TableHead>
                <TableHead>Comisión</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comisiones.map((comision) => (
                <TableRow key={comision.id}>
                  <TableCell className="font-mono text-xs">
                    {(comision.sales as any)?.sale_number || '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(comision.sales as any)?.created_at 
                      ? format(parseISO((comision.sales as any).created_at), 'dd/MM/yy')
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    ${Number(comision.monto_venta).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-sm font-medium text-primary">
                    ${Number(comision.monto_comision).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {comision.status === 'PAGADA' ? (
                      <Badge variant="outline" className="text-success border-success/30 text-xs">
                        Pagada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Additional Info per Sale */}
      <div className="text-xs text-muted-foreground space-y-2">
        {comisiones.slice(0, 3).map(comision => (
          <div key={comision.id} className="p-2 bg-muted/50 rounded">
            <span className="font-medium">{(comision.sales as any)?.sale_number}: </span>
            <span>Vendedor: {(comision.sales as any)?.profiles?.full_name || 'N/A'}</span>
            {(comision.sales as any)?.branches?.name && (
              <span> | Sucursal: {(comision.sales as any).branches.name}</span>
            )}
          </div>
        ))}
        {comisiones.length > 3 && (
          <p className="text-center text-muted-foreground">
            ... y {comisiones.length - 3} ventas más
          </p>
        )}
      </div>
    </div>
  );
}
