import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StockMovementForm } from './StockMovementForm';
import { useAuth } from '@/hooks/useAuth';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Search, Package, ArrowUpDown, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export function StockOverview() {
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
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

  const activeBranchId = branchFilter !== 'all' ? branchFilter : profile?.defaultBranchId;

  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ['inventory-overview', search, activeBranchId, stockFilter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          product_categories(name),
          inventory!inner(quantity, reserved_quantity, branch_id, branches(name))
        `)
        .eq('is_active', true)
        .eq('product_type', 'product');

      if (activeBranchId) {
        query = query.eq('inventory.branch_id', activeBranchId);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;

      // Filter by stock level
      let filtered = data || [];
      if (stockFilter === 'low') {
        filtered = filtered.filter((p: any) => {
          const inv = p.inventory?.[0];
          return inv && inv.quantity <= p.reorder_point && inv.quantity > 0;
        });
      } else if (stockFilter === 'out') {
        filtered = filtered.filter((p: any) => {
          const inv = p.inventory?.[0];
          return !inv || inv.quantity === 0;
        });
      } else if (stockFilter === 'ok') {
        filtered = filtered.filter((p: any) => {
          const inv = p.inventory?.[0];
          return inv && inv.quantity > p.reorder_point;
        });
      }

      return filtered;
    },
  });

  const handleMovement = (product: any, type: 'entrada' | 'salida' | 'ajuste') => {
    setSelectedProduct({ ...product, movementType: type });
    setIsMovementOpen(true);
  };

  const getStockStatus = (quantity: number, reorderPoint: number) => {
    if (quantity === 0) {
      return { label: 'Sin stock', variant: 'destructive' as const, icon: AlertTriangle };
    }
    if (quantity <= reorderPoint) {
      return { label: 'Stock bajo', variant: 'secondary' as const, icon: TrendingDown };
    }
    return { label: 'OK', variant: 'default' as const, icon: TrendingUp };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Stock por Sucursal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar producto..."
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
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ok">Stock OK</SelectItem>
              <SelectItem value="low">Stock bajo</SelectItem>
              <SelectItem value="out">Sin stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : inventory && inventory.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">Reservado</TableHead>
                  <TableHead className="text-center">Disponible</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((product: any) => {
                  const inv = product.inventory?.[0];
                  const quantity = inv?.quantity || 0;
                  const reserved = inv?.reserved_quantity || 0;
                  const available = quantity - reserved;
                  const status = getStockStatus(quantity, product.reorder_point);
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {product.sku}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {product.product_categories?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {inv?.branches?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {quantity}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {reserved}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {available}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <RoleGuard allowedRoles={['admin']} showAccessDenied={false}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMovement(product, 'entrada')}
                              className="text-green-600 hover:text-green-700"
                            >
                              <TrendingUp className="h-4 w-4 mr-1" />
                              Entrada
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMovement(product, 'salida')}
                              className="text-red-600 hover:text-red-700"
                            >
                              <TrendingDown className="h-4 w-4 mr-1" />
                              Salida
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMovement(product, 'ajuste')}
                            >
                              <ArrowUpDown className="h-4 w-4 mr-1" />
                              Ajuste
                            </Button>
                          </div>
                        </RoleGuard>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No hay productos en inventario</p>
          </div>
        )}
      </CardContent>

      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.movementType === 'entrada' && 'Entrada de Stock'}
              {selectedProduct?.movementType === 'salida' && 'Salida de Stock'}
              {selectedProduct?.movementType === 'ajuste' && 'Ajuste de Inventario'}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <StockMovementForm
              product={selectedProduct}
              movementType={selectedProduct.movementType}
              branches={branches || []}
              onSuccess={() => {
                setIsMovementOpen(false);
                refetch();
              }}
              onCancel={() => setIsMovementOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
