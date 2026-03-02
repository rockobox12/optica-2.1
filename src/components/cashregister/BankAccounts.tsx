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
  Building,
  Plus,
  Loader2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  clabe: string | null;
  current_balance: number;
  is_active: boolean;
}

interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_type: string;
  transaction_date: string;
  amount: number;
  reference: string | null;
  description: string | null;
  reconciled: boolean;
}

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [currentRegister, setCurrentRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accountForm, setAccountForm] = useState({
    bank_name: '',
    account_number: '',
    account_type: 'checking',
    clabe: '',
    notes: '',
  });
  const [depositForm, setDepositForm] = useState({
    amount: '',
    reference: '',
    description: '',
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current register
      const { data: register } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('status', 'open')
        .maybeSingle();
      setCurrentRegister(register);

      // Fetch bank accounts
      const { data: accountData } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('bank_name');
      setAccounts(accountData || []);

      // Fetch recent transactions
      const { data: transactionData } = await supabase
        .from('bank_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(50);
      setTransactions(transactionData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!accountForm.bank_name || !accountForm.account_number) {
      toast({
        title: 'Error',
        description: 'Complete los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('bank_accounts').insert({
        bank_name: accountForm.bank_name,
        account_number: accountForm.account_number,
        account_type: accountForm.account_type,
        clabe: accountForm.clabe || null,
        notes: accountForm.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Cuenta creada',
        description: 'La cuenta bancaria ha sido registrada',
      });

      setShowAccountDialog(false);
      setAccountForm({
        bank_name: '',
        account_number: '',
        account_type: 'checking',
        clabe: '',
        notes: '',
      });
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

  const handleDeposit = async () => {
    if (!selectedAccount || !depositForm.amount) {
      toast({
        title: 'Error',
        description: 'Seleccione cuenta y monto',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const amount = parseFloat(depositForm.amount);

      // Create bank transaction
      const { error: transError } = await supabase.from('bank_transactions').insert({
        bank_account_id: selectedAccount,
        transaction_type: 'deposit',
        amount,
        reference: depositForm.reference || null,
        description: depositForm.description || 'Depósito de caja',
        cash_register_id: currentRegister?.id,
        created_by: user?.id,
      });

      if (transError) throw transError;

      // Update bank balance
      const account = accounts.find(a => a.id === selectedAccount);
      if (account) {
        await supabase
          .from('bank_accounts')
          .update({ current_balance: account.current_balance + amount })
          .eq('id', selectedAccount);
      }

      // If register is open, create cash movement
      if (currentRegister) {
        await supabase.from('cash_movements').insert({
          cash_register_id: currentRegister.id,
          movement_type: 'deposit',
          amount,
          reference_type: 'bank_deposit',
          description: `Depósito a ${account?.bank_name} - ${depositForm.reference || ''}`,
          created_by: user?.id,
        });
      }

      toast({
        title: 'Depósito registrado',
        description: `$${amount.toFixed(2)} depositado a ${account?.bank_name}`,
      });

      setShowDepositDialog(false);
      setSelectedAccount('');
      setDepositForm({ amount: '', reference: '', description: '' });
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

  const getTransactionIcon = (type: string) => {
    if (type === 'deposit' || type === 'transfer_in' || type === 'interest') {
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    }
    return <ArrowDownRight className="h-4 w-4 text-red-500" />;
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: 'Depósito',
      withdrawal: 'Retiro',
      transfer_in: 'Transferencia entrada',
      transfer_out: 'Transferencia salida',
      fee: 'Comisión',
      interest: 'Intereses',
      adjustment: 'Ajuste',
    };
    return labels[type] || type;
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Cuentas Bancarias
              </CardTitle>
              <CardDescription>Saldo total: ${totalBalance.toFixed(2)}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAccountDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cuenta
              </Button>
              <Button onClick={() => setShowDepositDialog(true)} disabled={accounts.length === 0}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Registrar Depósito
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay cuentas bancarias registradas
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map((account) => (
                <Card key={account.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{account.bank_name}</p>
                        <p className="text-sm text-muted-foreground">
                          ****{account.account_number.slice(-4)}
                        </p>
                        <Badge variant="secondary" className="mt-2">
                          {account.account_type === 'checking' ? 'Cuenta corriente' :
                            account.account_type === 'savings' ? 'Ahorro' : 'Crédito'}
                        </Badge>
                      </div>
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Saldo actual</p>
                      <p className="text-2xl font-bold text-primary">
                        ${account.current_balance.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Movimientos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Conciliado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((trans) => {
                  const account = accounts.find(a => a.id === trans.bank_account_id);
                  return (
                    <TableRow key={trans.id}>
                      <TableCell>
                        {format(new Date(trans.transaction_date), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{account?.bank_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(trans.transaction_type)}
                          {getTransactionLabel(trans.transaction_type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {trans.reference || '-'}
                      </TableCell>
                      <TableCell>{trans.description || '-'}</TableCell>
                      <TableCell className={`text-right font-mono font-medium ${
                        trans.transaction_type === 'deposit' || trans.transaction_type === 'transfer_in'
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trans.transaction_type === 'deposit' || trans.transaction_type === 'transfer_in' ? '+' : '-'}
                        ${trans.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={trans.reconciled ? 'secondary' : 'outline'}>
                          {trans.reconciled ? 'Sí' : 'No'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Cuenta Bancaria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Banco *</Label>
              <Input
                value={accountForm.bank_name}
                onChange={(e) => setAccountForm({ ...accountForm, bank_name: e.target.value })}
                placeholder="Ej: BBVA, Banamex, Santander"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número de Cuenta *</Label>
                <Input
                  value={accountForm.account_number}
                  onChange={(e) => setAccountForm({ ...accountForm, account_number: e.target.value })}
                  placeholder="Número de cuenta"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Cuenta</Label>
                <Select
                  value={accountForm.account_type}
                  onValueChange={(v) => setAccountForm({ ...accountForm, account_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Cuenta Corriente</SelectItem>
                    <SelectItem value="savings">Ahorro</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>CLABE (opcional)</Label>
              <Input
                value={accountForm.clabe}
                onChange={(e) => setAccountForm({ ...accountForm, clabe: e.target.value })}
                placeholder="18 dígitos"
                maxLength={18}
              />
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={accountForm.notes}
                onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                placeholder="Observaciones"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateAccount} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Crear Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Depósito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cuenta Destino *</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bank_name} - ****{acc.account_number.slice(-4)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Referencia / Folio (opcional)</Label>
              <Input
                value={depositForm.reference}
                onChange={(e) => setDepositForm({ ...depositForm, reference: e.target.value })}
                placeholder="Número de ficha o referencia"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={depositForm.description}
                onChange={(e) => setDepositForm({ ...depositForm, description: e.target.value })}
                placeholder="Notas del depósito"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDeposit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar Depósito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
