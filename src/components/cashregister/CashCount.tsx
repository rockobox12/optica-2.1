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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calculator,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Denomination {
  key: string;
  label: string;
  value: number;
}

const BILLS: Denomination[] = [
  { key: 'bills_1000', label: '$1,000', value: 1000 },
  { key: 'bills_500', label: '$500', value: 500 },
  { key: 'bills_200', label: '$200', value: 200 },
  { key: 'bills_100', label: '$100', value: 100 },
  { key: 'bills_50', label: '$50', value: 50 },
  { key: 'bills_20', label: '$20', value: 20 },
];

const COINS: Denomination[] = [
  { key: 'coins_20', label: '$20', value: 20 },
  { key: 'coins_10', label: '$10', value: 10 },
  { key: 'coins_5', label: '$5', value: 5 },
  { key: 'coins_2', label: '$2', value: 2 },
  { key: 'coins_1', label: '$1', value: 1 },
  { key: 'coins_50c', label: '$0.50', value: 0.5 },
];

interface CashCount {
  id: string;
  count_type: string;
  count_date: string;
  total_counted: number;
  expected_amount: number;
  difference: number;
  notes: string | null;
}

export function CashCount() {
  const [currentRegister, setCurrentRegister] = useState<any>(null);
  const [counts, setCounts] = useState<CashCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [denominations, setDenominations] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current open register
      const { data: register } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .maybeSingle();

      setCurrentRegister(register);

      if (register) {
        // Get counts for this register
        const { data: countData } = await supabase
          .from('cash_counts')
          .select('*')
          .eq('cash_register_id', register.id)
          .order('count_date', { ascending: false });

        setCounts(countData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDenominationChange = (key: string, value: string) => {
    setDenominations((prev) => ({
      ...prev,
      [key]: parseInt(value) || 0,
    }));
  };

  const calculateTotal = (): number => {
    let total = 0;
    [...BILLS, ...COINS].forEach((d) => {
      total += (denominations[d.key] || 0) * d.value;
    });
    return total;
  };

  const calculateExpectedAmount = async (): Promise<number> => {
    if (!currentRegister) return 0;

    const { data: movements } = await supabase
      .from('cash_movements')
      .select('movement_type, amount')
      .eq('cash_register_id', currentRegister.id);

    let expected = currentRegister.opening_amount || 0;
    movements?.forEach((mov) => {
      if (mov.movement_type === 'sale') {
        expected += mov.amount;
      } else if (mov.movement_type === 'expense' || mov.movement_type === 'deposit') {
        expected -= mov.amount;
      }
    });

    return expected;
  };

  const handleSubmit = async () => {
    if (!currentRegister) {
      toast({
        title: 'Error',
        description: 'No hay caja abierta',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const totalCounted = calculateTotal();
      const expectedAmount = await calculateExpectedAmount();
      const difference = totalCounted - expectedAmount;

      const { error } = await supabase.from('cash_counts').insert({
        cash_register_id: currentRegister.id,
        counted_by: user?.id,
        count_type: 'partial',
        total_counted: totalCounted,
        expected_amount: expectedAmount,
        difference,
        notes,
        ...denominations,
      });

      if (error) throw error;

      toast({
        title: 'Arqueo registrado',
        description: `Diferencia: $${difference.toFixed(2)}`,
        variant: difference === 0 ? 'default' : 'destructive',
      });

      setDenominations({});
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentRegister) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No hay caja abierta</p>
          <p className="text-muted-foreground">Abra una caja para realizar arqueos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Count Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Nuevo Arqueo
          </CardTitle>
          <CardDescription>
            Cuente las denominaciones en caja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Bills */}
            <div>
              <h3 className="font-medium mb-4">Billetes</h3>
              <div className="space-y-3">
                {BILLS.map((bill) => (
                  <div key={bill.key} className="flex items-center gap-4">
                    <Label className="w-20">{bill.label}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations[bill.key] || ''}
                      onChange={(e) => handleDenominationChange(bill.key, e.target.value)}
                      className="w-24"
                      placeholder="0"
                    />
                    <span className="text-muted-foreground w-24 text-right">
                      ${((denominations[bill.key] || 0) * bill.value).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coins */}
            <div>
              <h3 className="font-medium mb-4">Monedas</h3>
              <div className="space-y-3">
                {COINS.map((coin) => (
                  <div key={coin.key} className="flex items-center gap-4">
                    <Label className="w-20">{coin.label}</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations[coin.key] || ''}
                      onChange={(e) => handleDenominationChange(coin.key, e.target.value)}
                      className="w-24"
                      placeholder="0"
                    />
                    <span className="text-muted-foreground w-24 text-right">
                      ${((denominations[coin.key] || 0) * coin.value).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Total Contado</span>
              <span className="text-3xl font-bold text-primary">
                ${calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4 space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones del arqueo..."
            />
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting || calculateTotal() === 0}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar Arqueo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {counts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Arqueos del Turno</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Contado</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Diferencia</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell>
                      {format(new Date(count.count_date), 'HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell>
                      {count.count_type === 'partial' ? 'Parcial' : 'Cierre'}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${count.total_counted.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${count.expected_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${
                      count.difference === 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${count.difference.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {count.difference === 0 ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Diferencia
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
