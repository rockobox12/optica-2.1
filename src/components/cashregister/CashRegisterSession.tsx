import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Lock,
  Unlock,
  Calculator,
  TrendingUp,
  TrendingDown,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CashRegister {
  id: string;
  branch_id: string | null;
  opened_by: string;
  closed_by: string | null;
  opening_date: string;
  closing_date: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: string;
  notes: string | null;
  branches?: { name: string } | null;
  opener?: { full_name: string } | null;
  closer?: { full_name: string } | null;
}

interface CashMovement {
  id: string;
  movement_type: string;
  payment_method: string | null;
  amount: number;
  description: string | null;
  created_at: string;
  reference_type: string | null;
  sale_id: string | null;
}

export function CashRegisterSession() {
  const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null);
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch branches
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setBranches(branchData || []);

      // Check for open register — filter by branch if selected, otherwise get any open
      let openQuery = supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .order('opening_date', { ascending: false })
        .limit(1);

      if (selectedBranch) {
        openQuery = openQuery.eq('branch_id', selectedBranch);
      }

      const { data: openRegister } = await openQuery.maybeSingle();

      setCurrentRegister(openRegister);

      if (openRegister) {
        // Fetch movements for current register
        const { data: movementData } = await supabase
          .from('cash_movements')
          .select('*')
          .eq('cash_register_id', openRegister.id)
          .order('created_at', { ascending: false });
        setMovements(movementData || []);
      } else {
        setMovements([]);
      }

      // Fetch recent registers
      const { data: recentRegisters } = await supabase
        .from('cash_registers')
        .select('*')
        .order('opening_date', { ascending: false })
        .limit(10);
      setRegisters(recentRegisters || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegister = async () => {
    if (!selectedBranch) {
      toast({
        title: 'Error',
        description: 'Seleccione una sucursal',
        variant: 'destructive',
      });
      return;
    }

    const parsedAmount = parseFloat(openingAmount) || 0;

    setSubmitting(true);
    try {
      // Check for existing open register on this branch
      const { data: existing } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .eq('branch_id', selectedBranch)
        .order('opening_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        toast({
          title: 'Caja ya abierta',
          description: 'Ya existe una caja abierta para esta sucursal.',
        });
        setShowOpenDialog(false);
        setCurrentRegister(existing);
        fetchData();
        return;
      }

      const { data, error } = await supabase
        .from('cash_registers')
        .insert({
          branch_id: selectedBranch,
          opened_by: user?.id,
          opening_amount: parsedAmount,
          notes,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Create opening movement
      await supabase.from('cash_movements').insert({
        cash_register_id: data.id,
        movement_type: 'opening',
        amount: parsedAmount,
        payment_method: 'cash',
        description: 'Apertura de caja',
        created_by: user?.id,
      });

      toast({
        title: 'Caja abierta',
        description: `Caja abierta con $${parsedAmount.toFixed(2)}`,
      });

      setShowOpenDialog(false);
      setSelectedBranch('');
      setOpeningAmount('');
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseRegister = async () => {
    if (!currentRegister || !closingAmount) {
      toast({
        title: 'Error',
        description: 'Ingrese el monto de cierre',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Calculate expected amount
      const expectedAmount = await calculateExpectedAmount(currentRegister.id);
      const difference = parseFloat(closingAmount) - expectedAmount;

      const { error } = await supabase
        .from('cash_registers')
        .update({
          closed_by: user?.id,
          closing_date: new Date().toISOString(),
          closing_amount: parseFloat(closingAmount),
          expected_amount: expectedAmount,
          difference,
          status: 'closed',
          notes: notes || currentRegister.notes,
        })
        .eq('id', currentRegister.id);

      if (error) throw error;

      // Create closing movement
      await supabase.from('cash_movements').insert({
        cash_register_id: currentRegister.id,
        movement_type: 'closing',
        amount: parseFloat(closingAmount),
        description: 'Cierre de caja',
        created_by: user?.id,
      });

      toast({
        title: 'Caja cerrada',
        description: `Diferencia: $${difference.toFixed(2)}`,
        variant: difference === 0 ? 'default' : 'destructive',
      });

      setShowCloseDialog(false);
      setClosingAmount('');
      setNotes('');
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateExpectedAmount = async (registerId: string): Promise<number> => {
    const { data: register } = await supabase
      .from('cash_registers')
      .select('opening_amount')
      .eq('id', registerId)
      .single();

    const { data: movs } = await supabase
      .from('cash_movements')
      .select('movement_type, amount, payment_method')
      .eq('cash_register_id', registerId);

    let expected = register?.opening_amount || 0;
    movs?.forEach((mov) => {
      // Only count CASH movements for expected cash in register
      if (mov.movement_type === 'sale' && (mov.payment_method === 'cash' || !mov.payment_method)) {
        expected += mov.amount;
      } else if (mov.movement_type === 'expense' || mov.movement_type === 'deposit') {
        expected -= mov.amount;
      }
    });

    return expected;
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'expense':
      case 'deposit':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMovementLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: 'Venta',
      expense: 'Gasto',
      deposit: 'Depósito a banco',
      withdrawal: 'Retiro',
      adjustment: 'Ajuste',
      opening: 'Apertura',
      closing: 'Cierre',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Session Status */}
      <Card className={currentRegister ? 'border-green-500/50' : 'border-orange-500/50'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentRegister ? (
                <Unlock className="h-6 w-6 text-green-500" />
              ) : (
                <Lock className="h-6 w-6 text-orange-500" />
              )}
              <div>
                <CardTitle>
                  {currentRegister ? 'Caja Abierta' : 'Caja Cerrada'}
                </CardTitle>
                <CardDescription>
                  {currentRegister
                    ? `Abierta el ${format(new Date(currentRegister.opening_date), "dd MMM yyyy HH:mm", { locale: es })}`
                    : 'No hay caja abierta actualmente'}
                </CardDescription>
              </div>
            </div>
            {currentRegister ? (
              <Button variant="destructive" onClick={() => setShowCloseDialog(true)}>
                <Lock className="h-4 w-4 mr-2" />
                Cerrar Caja
              </Button>
            ) : (
              <Button onClick={() => setShowOpenDialog(true)}>
                <Unlock className="h-4 w-4 mr-2" />
                Abrir Caja
              </Button>
            )}
          </div>
        </CardHeader>
        {currentRegister && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Monto Inicial</p>
                <p className="text-2xl font-bold text-primary">
                  ${currentRegister.opening_amount.toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Ventas (Efectivo)</p>
                <p className="text-2xl font-bold text-green-600">
                  ${movements.filter(m => m.movement_type === 'sale' && (m.payment_method === 'cash' || !m.payment_method)).reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Ventas (Otros)</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${movements.filter(m => m.movement_type === 'sale' && m.payment_method && m.payment_method !== 'cash').reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  ${movements.filter(m => m.movement_type === 'expense').reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Efectivo Esperado</p>
                <p className="text-2xl font-bold">
                  ${(currentRegister.opening_amount + 
                    movements.filter(m => m.movement_type === 'sale' && (m.payment_method === 'cash' || !m.payment_method)).reduce((sum, m) => sum + m.amount, 0) -
                    movements.filter(m => m.movement_type === 'expense' || m.movement_type === 'deposit').reduce((sum, m) => sum + m.amount, 0)
                  ).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Summary by payment method */}
            {movements.filter(m => m.movement_type === 'sale').length > 0 && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Resumen por Método de Pago</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['cash', 'card', 'transfer', 'check'].map(method => {
                    const total = movements
                      .filter(m => m.movement_type === 'sale' && m.payment_method === method)
                      .reduce((sum, m) => sum + m.amount, 0);
                    const count = movements
                      .filter(m => m.movement_type === 'sale' && m.payment_method === method)
                      .length;
                    if (total === 0) return null;
                    const label = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', check: 'Cheque' }[method];
                    return (
                      <div key={method} className="text-center">
                        <p className="text-xs text-muted-foreground">{label} ({count})</p>
                        <p className="font-bold">${total.toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Movements */}
      {currentRegister && movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Movimientos del Día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      {format(new Date(mov.created_at), 'HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(mov.movement_type)}
                        {getMovementLabel(mov.movement_type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {{ cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', check: 'Cheque' }[mov.payment_method || 'cash'] || mov.payment_method || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{mov.description || '-'}</TableCell>
                    <TableCell className={`text-right font-mono ${
                      mov.movement_type === 'sale' ? 'text-green-600' :
                      mov.movement_type === 'expense' || mov.movement_type === 'deposit' ? 'text-red-600' : ''
                    }`}>
                      {mov.movement_type === 'sale' ? '+' : mov.movement_type === 'expense' || mov.movement_type === 'deposit' ? '-' : ''}
                      ${mov.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Sesiones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Apertura</TableHead>
                <TableHead>Cierre</TableHead>
                <TableHead>Diferencia</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registers.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell>
                    {format(new Date(reg.opening_date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>${reg.opening_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    {reg.closing_amount ? `$${reg.closing_amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {reg.difference !== null ? (
                      <span className={reg.difference === 0 ? 'text-green-600' : 'text-red-600'}>
                        ${reg.difference.toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reg.status === 'open' ? 'default' : 'secondary'}>
                      {reg.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Open Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sucursal</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto Inicial</Label>
              <Input
                type="number"
                step="0.01"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenRegister} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Closing summary */}
            {currentRegister && (() => {
              const salesCash = movements.filter(m => m.movement_type === 'sale' && (m.payment_method === 'cash' || !m.payment_method)).reduce((sum, m) => sum + m.amount, 0);
              const salesCard = movements.filter(m => m.movement_type === 'sale' && m.payment_method === 'card').reduce((sum, m) => sum + m.amount, 0);
              const salesTransfer = movements.filter(m => m.movement_type === 'sale' && m.payment_method === 'transfer').reduce((sum, m) => sum + m.amount, 0);
              const salesCheck = movements.filter(m => m.movement_type === 'sale' && m.payment_method === 'check').reduce((sum, m) => sum + m.amount, 0);
              const totalSales = salesCash + salesCard + salesTransfer + salesCheck;
              const totalExpenses = movements.filter(m => m.movement_type === 'expense').reduce((sum, m) => sum + m.amount, 0);
              const totalDeposits = movements.filter(m => m.movement_type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
              const salesCount = movements.filter(m => m.movement_type === 'sale').length;
              const expectedCash = currentRegister.opening_amount + salesCash - totalExpenses - totalDeposits;

              return (
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm font-medium">Resumen del Turno</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Movimientos:</span>
                      <span className="text-right font-medium">{salesCount}</span>
                      <span className="text-muted-foreground">Total Ingresos:</span>
                      <span className="text-right font-medium text-green-600">${totalSales.toFixed(2)}</span>
                      {salesCash > 0 && <>
                        <span className="text-muted-foreground pl-3">• Efectivo:</span>
                        <span className="text-right">${salesCash.toFixed(2)}</span>
                      </>}
                      {salesCard > 0 && <>
                        <span className="text-muted-foreground pl-3">• Tarjeta:</span>
                        <span className="text-right">${salesCard.toFixed(2)}</span>
                      </>}
                      {salesTransfer > 0 && <>
                        <span className="text-muted-foreground pl-3">• Transferencia:</span>
                        <span className="text-right">${salesTransfer.toFixed(2)}</span>
                      </>}
                      {salesCheck > 0 && <>
                        <span className="text-muted-foreground pl-3">• Cheque:</span>
                        <span className="text-right">${salesCheck.toFixed(2)}</span>
                      </>}
                      {totalExpenses > 0 && <>
                        <span className="text-muted-foreground">Total Gastos:</span>
                        <span className="text-right font-medium text-red-600">-${totalExpenses.toFixed(2)}</span>
                      </>}
                      {totalDeposits > 0 && <>
                        <span className="text-muted-foreground">Depósitos:</span>
                        <span className="text-right font-medium text-red-600">-${totalDeposits.toFixed(2)}</span>
                      </>}
                    </div>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Efectivo Esperado en Caja</p>
                    <p className="text-2xl font-bold">${expectedCash.toFixed(2)}</p>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <Label>Monto de Efectivo Contado</Label>
              <Input
                type="number"
                step="0.01"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {closingAmount && currentRegister && (() => {
              const expectedCash = currentRegister.opening_amount + 
                movements.filter(m => m.movement_type === 'sale' && (m.payment_method === 'cash' || !m.payment_method)).reduce((sum, m) => sum + m.amount, 0) -
                movements.filter(m => m.movement_type === 'expense' || m.movement_type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
              const diff = parseFloat(closingAmount) - expectedCash;
              return (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  Math.abs(diff) < 0.01 ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300'
                }`}>
                  <AlertCircle className="h-4 w-4" />
                  Diferencia: ${diff.toFixed(2)}
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones del cierre..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleCloseRegister} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
