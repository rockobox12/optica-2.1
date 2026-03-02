import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, UserPlus, Star, Wallet, Gift, Award, Medal, Crown, Gem, History } from 'lucide-react';

const TIER_ICONS: Record<string, React.ElementType> = {
  Bronce: Award,
  Plata: Medal,
  Oro: Crown,
  Platino: Gem,
};

export function CustomerLoyalty() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch loyalty program
  const { data: program } = useQuery({
    queryKey: ['loyalty-program'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch tiers
  const { data: tiers = [] } = useQuery({
    queryKey: ['loyalty-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch enrolled customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['loyalty-customers', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('customer_loyalty')
        .select(`
          *,
          patients(id, first_name, last_name, email, phone),
          loyalty_tiers(name, color, multiplier),
          loyalty_programs(name, peso_per_point)
        `)
        .eq('is_active', true)
        .order('lifetime_points', { ascending: false });

      if (searchTerm) {
        // Filter after fetch since we can't filter on joined table
      }

      const { data, error } = await query;
      if (error) throw error;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return data.filter(c => 
          (c.patients as any)?.first_name?.toLowerCase().includes(search) ||
          (c.patients as any)?.last_name?.toLowerCase().includes(search) ||
          (c.patients as any)?.phone?.includes(search)
        );
      }
      return data;
    },
  });

  // Fetch non-enrolled patients
  const { data: availablePatients = [] } = useQuery({
    queryKey: ['available-patients-for-loyalty'],
    queryFn: async () => {
      const { data: enrolled } = await supabase
        .from('customer_loyalty')
        .select('patient_id');

      const enrolledIds = enrolled?.map(e => e.patient_id) || [];

      let query = supabase
        .from('patients')
        .select('id, first_name, last_name, phone, email')
        .eq('is_active', true)
        .order('first_name');

      if (enrolledIds.length > 0) {
        query = query.not('id', 'in', `(${enrolledIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: showEnroll,
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: async (patientId: string) => {
      if (!program) throw new Error('No hay programa de lealtad activo');

      const bronzeTier = tiers.find(t => t.name === 'Bronce');
      const referralCode = `OI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { error } = await supabase.from('customer_loyalty').insert({
        patient_id: patientId,
        program_id: program.id,
        tier_id: bronzeTier?.id,
        referral_code: referralCode,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] });
      queryClient.invalidateQueries({ queryKey: ['available-patients-for-loyalty'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-stats'] });
      setShowEnroll(false);
      toast({ title: 'Cliente inscrito en el programa de lealtad' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Redeem points mutation
  const redeemMutation = useMutation({
    mutationFn: async ({ customerLoyaltyId, points }: { customerLoyaltyId: string; points: number }) => {
      const { data, error } = await supabase.rpc('redeem_loyalty_points', {
        p_customer_loyalty_id: customerLoyaltyId,
        p_points: points,
        p_description: 'Canje de puntos manual',
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (value) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-customers'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-stats'] });
      setShowRedeem(false);
      setRedeemPoints('');
      toast({ 
        title: 'Puntos canjeados', 
        description: `Valor: $${value?.toFixed(2) || 0} MXN` 
      });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleRedeem = () => {
    if (!selectedCustomer || !redeemPoints) return;
    redeemMutation.mutate({
      customerLoyaltyId: selectedCustomer.id,
      points: parseInt(redeemPoints),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Inscribir Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Inscribir al Programa de Lealtad</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {availablePatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => enrollMutation.mutate(patient.id)}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                    <p className="text-sm text-muted-foreground">{patient.phone || patient.email}</p>
                  </button>
                ))}
                {availablePatients.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Todos los pacientes ya están inscritos
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Miembros del Programa ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead className="text-right">Puntos</TableHead>
                  <TableHead className="text-right">Wallet</TableHead>
                  <TableHead className="text-right">Histórico</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => {
                  const tierName = (customer.loyalty_tiers as any)?.name || 'Bronce';
                  const TierIcon = TIER_ICONS[tierName] || Star;
                  const tierColor = (customer.loyalty_tiers as any)?.color || '#6b7280';
                  const pesoPerPoint = (customer.loyalty_programs as any)?.peso_per_point || 0.10;
                  const walletEquivalent = (customer.current_points || 0) * pesoPerPoint;

                  return (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {(customer.patients as any)?.first_name} {(customer.patients as any)?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(customer.patients as any)?.phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="gap-1"
                          style={{ borderColor: tierColor, color: tierColor }}
                        >
                          <TierIcon className="h-3 w-3" />
                          {tierName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold">{customer.current_points?.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          ≈ ${walletEquivalent.toFixed(2)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-green-600">
                          ${customer.wallet_balance?.toFixed(2) || '0.00'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {customer.lifetime_points?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {customer.referral_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowRedeem(true);
                            }}
                            disabled={!customer.current_points}
                          >
                            <Gift className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Redeem Dialog */}
      <Dialog open={showRedeem} onOpenChange={setShowRedeem}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Canjear Puntos</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">
                  {(selectedCustomer.patients as any)?.first_name} {(selectedCustomer.patients as any)?.last_name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-2xl font-bold">{selectedCustomer.current_points?.toLocaleString()}</span>
                  <span className="text-muted-foreground">puntos disponibles</span>
                </div>
              </div>

              <div>
                <Label>Puntos a canjear</Label>
                <Input
                  type="number"
                  min="1"
                  max={selectedCustomer.current_points}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.value)}
                  placeholder={`Mín: ${program?.min_redemption_points || 100}`}
                />
                {redeemPoints && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor: ${(parseInt(redeemPoints) * (program?.peso_per_point || 0.10)).toFixed(2)} MXN
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowRedeem(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleRedeem}
                  disabled={!redeemPoints || parseInt(redeemPoints) < (program?.min_redemption_points || 100) || redeemMutation.isPending}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Canjear
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
