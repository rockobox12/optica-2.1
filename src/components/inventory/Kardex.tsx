import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  RefreshCw,
  Package,
  Undo2,
} from 'lucide-react';

const movementTypes = {
  entrada: { label: 'Entrada', icon: TrendingUp, color: 'text-green-600' },
  salida: { label: 'Salida', icon: TrendingDown, color: 'text-red-600' },
  ajuste: { label: 'Ajuste', icon: RefreshCw, color: 'text-blue-600' },
  transferencia: { label: 'Transferencia', icon: ArrowRightLeft, color: 'text-purple-600' },
  venta: { label: 'Venta', icon: Package, color: 'text-orange-600' },
  devolucion: { label: 'Devolución', icon: Undo2, color: 'text-yellow-600' },
};

export function Kardex() {
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { profile } = useAuth();

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ['inventory-movements', search, branchFilter, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('inventory_movements')
        .select(`
          *,
          products(name, sku),
          branches(name),
          transfer_branch:transfer_branch_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      const activeBranchId = branchFilter !== 'all' ? branchFilter : profile?.defaultBranchId;
      if (activeBranchId) {
        query = query.eq('branch_id', activeBranchId);
      }

      if (typeFilter !== 'all') {
        query = query.eq('movement_type', typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        return data?.filter(
          (m: any) =>
            m.products?.name?.toLowerCase().includes(searchLower) ||
            m.products?.sku?.toLowerCase().includes(searchLower)
        );
      }

      return data;
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Kardex de Movimientos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sucursal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las sucursales</SelectItem>
              {branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(movementTypes).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : movements && movements.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-center">Cantidad</TableHead>
                  <TableHead className="text-center">Stock Anterior</TableHead>
                  <TableHead className="text-center">Stock Nuevo</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement: any) => {
                  const typeInfo = movementTypes[movement.movement_type as keyof typeof movementTypes];
                  const TypeIcon = typeInfo?.icon || FileText;

                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(movement.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movement.products?.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {movement.products?.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${typeInfo?.color}`}>
                          <TypeIcon className="h-3 w-3" />
                          {typeInfo?.label || movement.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{movement.branches?.name}</p>
                          {movement.transfer_branch && (
                            <p className="text-sm text-muted-foreground">
                              → {movement.transfer_branch.name}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`font-medium ${
                            movement.movement_type === 'entrada' || movement.movement_type === 'devolucion'
                              ? 'text-green-600'
                              : movement.movement_type === 'salida' || movement.movement_type === 'venta'
                              ? 'text-red-600'
                              : ''
                          }`}
                        >
                          {movement.movement_type === 'entrada' || movement.movement_type === 'devolucion'
                            ? '+'
                            : movement.movement_type === 'salida' ||
                              movement.movement_type === 'venta' ||
                              movement.movement_type === 'transferencia'
                            ? '-'
                            : ''}
                          {Math.abs(movement.quantity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {movement.previous_stock}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {movement.new_stock}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {movement.notes || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay movimientos registrados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
