import { useState, useEffect } from 'react';
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
import { Search, MapPin, Plus, Navigation, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';

interface Visit {
  id: string;
  assignment_id: string;
  collector_id: string;
  visit_date: string;
  latitude: number | null;
  longitude: number | null;
  address_visited: string | null;
  result: string;
  amount_collected: number | null;
  payment_method: string | null;
  promise_date: string | null;
  notes: string | null;
  collection_assignments?: {
    patients?: {
      first_name: string;
      last_name: string;
      address: string | null;
    };
    sales?: {
      sale_number: string;
    };
  };
}

interface Assignment {
  id: string;
  sale_id: string;
  total_due: number;
  amount_collected: number;
  patients?: {
    first_name: string;
    last_name: string;
    address: string | null;
  };
  sales?: {
    sale_number: string;
  };
}

const getResultBadge = (result: string) => {
  switch (result) {
    case 'payment_received': return <Badge className="bg-green-100 text-green-800">Pago Recibido</Badge>;
    case 'promise_to_pay': return <Badge className="bg-blue-100 text-blue-800">Promesa de Pago</Badge>;
    case 'not_home': return <Badge className="bg-gray-100 text-gray-800">No Encontrado</Badge>;
    case 'refused': return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
    case 'rescheduled': return <Badge className="bg-yellow-100 text-yellow-800">Reagendado</Badge>;
    case 'other': return <Badge variant="outline">Otro</Badge>;
    default: return <Badge>{result}</Badge>;
  }
};

export function CollectionVisits() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewVisitDialog, setShowNewVisitDialog] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [newVisit, setNewVisit] = useState({
    assignmentId: '',
    result: '' as 'payment_received' | 'promise_to_pay' | 'not_home' | 'refused' | 'rescheduled' | 'other',
    amountCollected: '',
    paymentMethod: '' as 'cash' | 'card' | 'transfer',
    promiseDate: '',
    notes: '',
    addressVisited: '',
  });
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Get current location
  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsGettingLocation(false);
          toast({ title: 'Ubicación obtenida' });
        },
        (error) => {
          setIsGettingLocation(false);
          toast({
            title: 'Error de ubicación',
            description: 'No se pudo obtener la ubicación',
            variant: 'destructive',
          });
        },
        { enableHighAccuracy: true }
      );
    } else {
      setIsGettingLocation(false);
      toast({
        title: 'Geolocalización no disponible',
        variant: 'destructive',
      });
    }
  };

  // Fetch visits
  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['collection-visits', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_visits')
        .select(`
          *,
          collection_assignments (
            patients (first_name, last_name, address),
            sales (sale_number)
          )
        `)
        .order('visit_date', { ascending: false });

      if (error) throw error;
      return data as Visit[];
    },
  });

  // Fetch active assignments for current collector
  const { data: myAssignments = [] } = useQuery({
    queryKey: ['my-assignments', profile?.userId],
    queryFn: async () => {
      if (!profile?.userId) return [];
      
      const { data, error } = await supabase
        .from('collection_assignments')
        .select(`
          id, sale_id, total_due, amount_collected,
          patients (first_name, last_name, address),
          sales (sale_number)
        `)
        .eq('collector_id', profile.userId)
        .in('status', ['assigned', 'in_progress']);

      if (error) throw error;
      return data as Assignment[];
    },
    enabled: showNewVisitDialog && !!profile?.userId,
  });

  // Create visit mutation
  const createVisit = useMutation({
    mutationFn: async () => {
      if (!newVisit.assignmentId || !newVisit.result) {
        throw new Error('Datos incompletos');
      }

      const { error } = await supabase.from('collection_visits').insert({
        assignment_id: newVisit.assignmentId,
        collector_id: profile?.userId,
        latitude: currentLocation?.lat || null,
        longitude: currentLocation?.lng || null,
        address_visited: newVisit.addressVisited || null,
        result: newVisit.result,
        amount_collected: newVisit.amountCollected ? parseFloat(newVisit.amountCollected) : null,
        payment_method: newVisit.paymentMethod || null,
        promise_date: newVisit.promiseDate || null,
        notes: newVisit.notes || null,
      });

      if (error) throw error;

      // Update assignment amount_collected if payment received
      if (newVisit.result === 'payment_received' && newVisit.amountCollected) {
        const assignment = myAssignments.find(a => a.id === newVisit.assignmentId);
        if (assignment) {
          const newTotal = Number(assignment.amount_collected) + parseFloat(newVisit.amountCollected);
          await supabase
            .from('collection_assignments')
            .update({ 
              amount_collected: newTotal,
              status: newTotal >= Number(assignment.total_due) ? 'collected' : 'in_progress',
            })
            .eq('id', newVisit.assignmentId);
        }
      }
    },
    onSuccess: () => {
      toast({
        title: 'Visita registrada',
        description: 'Se registró la visita exitosamente',
      });
      setShowNewVisitDialog(false);
      setNewVisit({
        assignmentId: '',
        result: '' as any,
        amountCollected: '',
        paymentMethod: '' as any,
        promiseDate: '',
        notes: '',
        addressVisited: '',
      });
      setCurrentLocation(null);
      queryClient.invalidateQueries({ queryKey: ['collection-visits'] });
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
  const todayVisits = visits.filter(v => 
    format(new Date(v.visit_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).length;
  const paymentsToday = visits.filter(v => 
    v.result === 'payment_received' &&
    format(new Date(v.visit_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  ).reduce((sum, v) => sum + Number(v.amount_collected || 0), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visitas Hoy</p>
                <p className="text-xl font-bold">{todayVisits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cobrado Hoy</p>
                <p className="text-xl font-bold text-green-600">${paymentsToday.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Visitas</p>
                <p className="text-xl font-bold">{visits.length}</p>
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
            placeholder="Buscar visitas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowNewVisitDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Visita
        </Button>
      </div>

      {/* Visits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Visitas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay visitas registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Cobrado</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((visit) => (
                  <TableRow key={visit.id}>
                    <TableCell className="text-sm">
                      {format(new Date(visit.visit_date), 'dd/MM/yy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {visit.collection_assignments?.sales?.sale_number}
                    </TableCell>
                    <TableCell>
                      {visit.collection_assignments?.patients?.first_name}{' '}
                      {visit.collection_assignments?.patients?.last_name}
                    </TableCell>
                    <TableCell>{getResultBadge(visit.result)}</TableCell>
                    <TableCell className="text-right">
                      {visit.amount_collected ? (
                        <span className="text-green-600 font-medium">
                          ${Number(visit.amount_collected).toFixed(2)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {visit.latitude && visit.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          Ver mapa
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin GPS</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {visit.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Visit Dialog */}
      <Dialog open={showNewVisitDialog} onOpenChange={setShowNewVisitDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Visita de Cobranza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Get Location Button */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ubicación GPS</p>
                  {currentLocation ? (
                    <p className="text-sm text-green-600">
                      ✓ Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No obtenida</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                >
                  {isGettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Navigation className="h-4 w-4 mr-1" />
                      Obtener
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label>Asignación</Label>
              <Select
                value={newVisit.assignmentId}
                onValueChange={(v) => setNewVisit({ ...newVisit, assignmentId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cuenta..." />
                </SelectTrigger>
                <SelectContent>
                  {myAssignments.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.sales?.sale_number} - {assignment.patients?.first_name}{' '}
                      {assignment.patients?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Resultado de la Visita</Label>
              <Select
                value={newVisit.result}
                onValueChange={(v: any) => setNewVisit({ ...newVisit, result: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment_received">Pago Recibido</SelectItem>
                  <SelectItem value="promise_to_pay">Promesa de Pago</SelectItem>
                  <SelectItem value="not_home">No Encontrado</SelectItem>
                  <SelectItem value="refused">Rechazado</SelectItem>
                  <SelectItem value="rescheduled">Reagendado</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newVisit.result === 'payment_received' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monto Cobrado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newVisit.amountCollected}
                    onChange={(e) => setNewVisit({ ...newVisit, amountCollected: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Método de Pago</Label>
                  <Select
                    value={newVisit.paymentMethod}
                    onValueChange={(v: any) => setNewVisit({ ...newVisit, paymentMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {newVisit.result === 'promise_to_pay' && (
              <MaskedDateInput
                value={newVisit.promiseDate}
                onChange={(val) => setNewVisit({ ...newVisit, promiseDate: val })}
                label="Fecha de Promesa"
                mode="payment"
              />
            )}

            <div>
              <Label>Dirección Visitada</Label>
              <Input
                placeholder="Dirección donde se realizó la visita"
                value={newVisit.addressVisited}
                onChange={(e) => setNewVisit({ ...newVisit, addressVisited: e.target.value })}
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                placeholder="Observaciones de la visita..."
                value={newVisit.notes}
                onChange={(e) => setNewVisit({ ...newVisit, notes: e.target.value })}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => createVisit.mutate()}
              disabled={!newVisit.assignmentId || !newVisit.result || createVisit.isPending}
            >
              {createVisit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Visita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
