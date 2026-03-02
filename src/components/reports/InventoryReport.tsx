import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Package, AlertTriangle, TrendingUp, FileSpreadsheet, Search, ArrowDownUp } from 'lucide-react';

const COLORS = ['#1a365d', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

export function InventoryReport() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'value'>('name');

  // Fetch inventory with products
  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory-report'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          products!inner(id, name, sku, category, unit_price, min_stock, is_active),
          branches(name)
        `)
        .eq('products.is_active', true);

      if (error) throw error;
      return data;
    },
  });

  // Calculate summary
  const summary = {
    totalProducts: new Set(inventory.map((i: any) => i.products?.id)).size,
    totalUnits: inventory.reduce((sum, i: any) => sum + (i.quantity || 0), 0),
    totalValue: inventory.reduce((sum, i: any) => 
      sum + ((i.quantity || 0) * (i.products?.unit_price || 0)), 0),
    lowStock: inventory.filter((i: any) => 
      i.quantity <= (i.products?.min_stock || 5)).length,
    outOfStock: inventory.filter((i: any) => i.quantity === 0).length,
  };

  // Stock by category
  const stockByCategory = inventory.reduce((acc: Record<string, { count: number; value: number }>, item: any) => {
    const category = item.products?.category || 'Otros';
    if (!acc[category]) acc[category] = { count: 0, value: 0 };
    acc[category].count += item.quantity || 0;
    acc[category].value += (item.quantity || 0) * (item.products?.unit_price || 0);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    frames: 'Armazones',
    lenses: 'Lentes',
    contact_lenses: 'Lentes de Contacto',
    accessories: 'Accesorios',
    solutions: 'Soluciones',
    other: 'Otros',
  };

  const categoryChartData = Object.entries(stockByCategory).map(([key, data]) => ({
    name: categoryLabels[key] || key,
    value: data.value,
    count: data.count,
  }));

  // Filter and sort inventory
  const filteredInventory = inventory
    .filter((item: any) => {
      if (categoryFilter !== 'all' && item.products?.category !== categoryFilter) return false;
      if (stockFilter === 'low' && item.quantity > (item.products?.min_stock || 5)) return false;
      if (stockFilter === 'out' && item.quantity > 0) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          item.products?.name?.toLowerCase().includes(search) ||
          item.products?.sku?.toLowerCase().includes(search)
        );
      }
      return true;
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'name') return (a.products?.name || '').localeCompare(b.products?.name || '');
      if (sortBy === 'stock') return (a.quantity || 0) - (b.quantity || 0);
      if (sortBy === 'value') {
        const valueA = (a.quantity || 0) * (a.products?.unit_price || 0);
        const valueB = (b.quantity || 0) * (b.products?.unit_price || 0);
        return valueB - valueA;
      }
      return 0;
    });

  // Top products by value
  const topProducts = [...inventory]
    .map((item: any) => ({
      name: item.products?.name?.substring(0, 20) || 'N/A',
      value: (item.quantity || 0) * (item.products?.unit_price || 0),
      quantity: item.quantity || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const exportToCSV = () => {
    const headers = ['SKU', 'Producto', 'Categoría', 'Sucursal', 'Stock', 'Mínimo', 'Precio', 'Valor'];
    const rows = filteredInventory.map((item: any) => [
      item.products?.sku || 'N/A',
      item.products?.name || 'N/A',
      categoryLabels[item.products?.category] || item.products?.category,
      (item.branches as any)?.name || 'N/A',
      item.quantity,
      item.products?.min_stock || 5,
      item.products?.unit_price?.toFixed(2),
      ((item.quantity || 0) * (item.products?.unit_price || 0)).toFixed(2),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: 'Agotado', color: 'bg-red-100 text-red-800' };
    if (quantity <= minStock) return { label: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800' };
    if (quantity <= minStock * 2) return { label: 'Normal', color: 'bg-blue-100 text-blue-800' };
    return { label: 'Óptimo', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Package className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-sm text-muted-foreground">Productos</p>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Unidades</p>
            <p className="text-2xl font-bold">{summary.totalUnits.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-bold text-green-600">
              ${summary.totalValue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-sm text-muted-foreground">Stock Bajo</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.lowStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Agotados</p>
            <p className="text-2xl font-bold text-red-600">{summary.outOfStock}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valor por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Valor']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Productos por Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString('es-MX')}`, 'Valor']} />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="frames">Armazones</SelectItem>
                  <SelectItem value="lenses">Lentes</SelectItem>
                  <SelectItem value="contact_lenses">Lentes de Contacto</SelectItem>
                  <SelectItem value="accessories">Accesorios</SelectItem>
                  <SelectItem value="solutions">Soluciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el stock</SelectItem>
                  <SelectItem value="low">Stock bajo</SelectItem>
                  <SelectItem value="out">Agotados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex-1 min-w-[150px]">
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger>
                  <ArrowDownUp className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Por nombre</SelectItem>
                  <SelectItem value="stock">Por stock (menor)</SelectItem>
                  <SelectItem value="value">Por valor (mayor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportToCSV} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle de Inventario ({filteredInventory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Sucursal</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item: any) => {
                  const status = getStockStatus(item.quantity, item.products?.min_stock || 5);
                  const value = (item.quantity || 0) * (item.products?.unit_price || 0);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.products?.sku || 'N/A'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.products?.name}</TableCell>
                      <TableCell>{categoryLabels[item.products?.category] || item.products?.category}</TableCell>
                      <TableCell>{(item.branches as any)?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium w-8 text-center">{item.quantity}</span>
                          <Progress 
                            value={Math.min(100, (item.quantity / (item.products?.min_stock * 3 || 15)) * 100)} 
                            className="w-16 h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.products?.unit_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${value.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
