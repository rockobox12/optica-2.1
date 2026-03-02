import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, UserPlus, MapPin, Phone, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Assignment {
  id: string;
  sale_id: string;
  patient_id: string;
  collector_id: string;
  priority: string;
  status: string;
  total_due: number;
  amount_collected: number;
  notes: string | null;
  assigned_at: string;
  due_date: string | null;
  patients?: {
    first_name: string;
    last_name: string;
    phone: string | null;
    mobile: string | null;
    address: string | null;
  };
  sales?: {
    sale_number: string;
  };
  collector_name?: string;
}

interface Collector {
  user_id: string;
  full_name: string;
}

interface DelinquentPatient {
  patient_id: string;
  patient_name: string;
  total_balance: number;
  sale_count: number;
  oldest_due_date: string | null;
  sales: { id: string; sale_number: string; balance: number; credit_due_date: string | null }[];
}

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'low': return <Badge variant="outline">Baja</Badge>;
    case 'medium': return <Badge className="bg-yellow-100 text-yellow-800">Media</Badge>;
    case 'high': return <Badge className="bg-orange-100 text-orange-800">Alta</Badge>;
    case 'urgent': return <Badge className="bg-red-100 text-red-800">Urgente</Badge>;
    default: return <Badge>{priority}</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'assigned': return <Badge variant="outline">Asignado</Badge>;
    case 'in_progress': return <Badge className="bg-blue-100 text-blue-800">En Proceso</Badge>;
    case 'collected': return <Badge className="bg-green-100 text-green-800">Cobrado</Badge>;
    case 'escalated': return <Badge className="bg-purple-100 text-purple-800">Escalado</Badge>;
    case 'cancelled': return <Badge className="bg-gray-100 text-gray-800">Cancelado</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

export function CollectionAssignments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<DelinquentPatient | null>(null);
  const [selectedCollector, setSelectedCollector] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['collection-assignments', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_assignments')
        .select(`
          *,
          patients (first_name, last_name, phone, mobile, address),
          sales (sale_number)
        `)
        .order('priority', { ascending: false })
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      
      // Fetch collector names separately
      const collectorIds = [...new Set((data || []).map(a => a.collector_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', collectorIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return (data || []).map(a => ({
        ...a,
        collector_name: profileMap.get(a.collector_id) || 'Sin asignar',
      })) as Assignment[];
    },
  });

  // Fetch collectors (users with seller or admin role)
  const { data: collectors = [] } = useQuery({
    queryKey: ['collectors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true);

      if (error) throw error;
      return data as Collector[];
    },
  });

  // Fetch delinquent patients (grouped by patient)
  const { data: delinquentPatients = [] } = useQuery({
    queryKey: ['delinquent-patients-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('id, sale_number, customer_name, patient_id, balance, credit_due_date')
        .eq('is_credit', true)
        .gt('balance', 0)
        .order('credit_due_date', { ascending: true });

      if (error) throw error;

      // Filter out already assigned sales
      const { data: existingAssignments } = await supabase
        .from('collection_assignments')
        .select('sale_id')
        .in('status', ['assigned', 'in_progress']);

      const assignedSaleIds = new Set(existingAssignments?.map(a => a.sale_id) || []);
      const unassignedSales = (data || []).filter(s => !assignedSaleIds.has(s.id) && s.patient_id);

      // Group by patient
      const patientMap = new Map<string, DelinquentPatient>();
      for (const sale of unassignedSales) {
        const pid = sale.patient_id!;
        if (!patientMap.has(pid)) {
          patientMap.set(pid, {
            patient_id: pid,
            patient_name: sale.customer_name || 'Sin nombre',
            total_balance: 0,
            sale_count: 0,
            oldest_due_date: null,
            sales: [],
          });
        }
        const p = patientMap.get(pid)!;
        p.total_balance += Number(sale.balance);
        p.sale_count += 1;
        p.sales.push({ id: sale.id, sale_number: sale.sale_number, balance: Number(sale.balance), credit_due_date: sale.credit_due_date });
        if (!p.oldest_due_date || (sale.credit_due_date && sale.credit_due_date < p.oldest_due_date)) {
          p.oldest_due_date = sale.credit_due_date;
        }
      }

      return Array.from(patientMap.values()).sort((a, b) => 
        (a.oldest_due_date || '').localeCompare(b.oldest_due_date || '')
      );
    },
    enabled: showAssignDialog,
  });

  // Create assignment mutation
  const createAssignment = useMutation({
    mutationFn: async () => {
      if (!selectedPatient || !selectedCollector) throw new Error('Datos incompletos');

      // Create one assignment per sale for this patient
      const inserts = selectedPatient.sales.map(sale => ({
        sale_id: sale.id,
        patient_id: selectedPatient.patient_id,
        collector_id: selectedCollector,
        assigned_by: profile?.userId,
        priority,
        total_due: sale.balance,
        notes: notes || null,
        due_date: sale.credit_due_date,
      }));

      const { error } = await supabase.from('collection_assignments').insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Asignación creada',
        description: `Se asignaron ${selectedPatient?.sale_count} cuenta(s) al cobrador`,
      });
      setShowAssignDialog(false);
      setSelectedPatient(null);
      setSelectedCollector('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['collection-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-patients-for-assignment'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'collected') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('collection_assignments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Estado actualizado' });
      queryClient.invalidateQueries({ queryKey: ['collection-assignments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Stats
  const totalPending = assignments.filter(a => a.status !== 'collected' && a.status !== 'cancelled')
    .reduce((sum, a) => sum + Number(a.total_due) - Number(a.amount_collected), 0);
  const activeCount = assignments.filter(a => a.status === 'in_progress').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Por Cobrar</p>
                <p className="text-xl font-bold text-orange-600">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Proceso</p>
                <p className="text-xl font-bold">{activeCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <UserPlus className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Asignaciones</p>
                <p className="text-xl font-bold">{assignments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar asignaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAssignDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nueva Asignación
        </Button>
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Asignaciones de Cobranza</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay asignaciones de cobranza
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Cobrador</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-mono text-sm">
                      {assignment.sales?.sale_number}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {assignment.patients?.first_name} {assignment.patients?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {assignment.patients?.mobile || assignment.patients?.phone || 'Sin teléfono'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{assignment.collector_name}</TableCell>
                    <TableCell>{getPriorityBadge(assignment.priority)}</TableCell>
                    <TableCell className="text-right">
                      <div>
                        <p className="font-bold text-orange-600">
                          ${(Number(assignment.total_due) - Number(assignment.amount_collected)).toFixed(2)}
                        </p>
                        {Number(assignment.amount_collected) > 0 && (
                          <p className="text-xs text-green-600">
                            Cobrado: ${Number(assignment.amount_collected).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={assignment.status}
                        onValueChange={(status) => updateStatus.mutate({ id: assignment.id, status })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assigned">Asignado</SelectItem>
                          <SelectItem value="in_progress">En Proceso</SelectItem>
                          <SelectItem value="collected">Cobrado</SelectItem>
                          <SelectItem value="escalated">Escalado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Asignación de Cobranza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Paciente con deuda</Label>
              <Select 
                value={selectedPatient?.patient_id || ''} 
                onValueChange={(v) => setSelectedPatient(delinquentPatients.find(p => p.patient_id === v) || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar paciente..." />
                </SelectTrigger>
                <SelectContent>
                  {delinquentPatients.map((patient) => (
                    <SelectItem key={patient.patient_id} value={patient.patient_id}>
                      {patient.patient_name} — {patient.sale_count} cuenta(s) — ${patient.total_balance.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPatient && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  {selectedPatient.sales.map(s => (
                    <div key={s.id} className="flex justify-between">
                      <span>Ticket {s.sale_number}</span>
                      <span className="font-medium">${s.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Cobrador</Label>
              <Select value={selectedCollector} onValueChange={setSelectedCollector}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cobrador..." />
                </SelectTrigger>
                <SelectContent>
                  {collectors.map((collector) => (
                    <SelectItem key={collector.user_id} value={collector.user_id}>
                      {collector.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridad</Label>
              <Select 
                value={priority} 
                onValueChange={(v: 'low' | 'medium' | 'high' | 'urgent') => setPriority(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones especiales para el cobrador..."
              />
            </div>

            <Button
              className="w-full"
              onClick={() => createAssignment.mutate()}
              disabled={!selectedPatient || !selectedCollector || createAssignment.isPending}
            >
              {createAssignment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Asignar Cobrador
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
