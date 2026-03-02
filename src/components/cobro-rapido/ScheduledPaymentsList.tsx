import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Banknote, 
  Phone, 
  AlertTriangle, 
  CalendarClock,
  MessageCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, addDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { QuickPaymentModal } from './QuickPaymentModal';

interface ScheduledPayment {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  balance: number;
  next_payment_date: string;
  next_payment_amount: number | null;
  next_payment_note: string | null;
  patient_id: string | null;
  branch_id?: string | null;
  amount_paid: number;
  credit_due_date: string | null;
  created_at: string;
  patients?: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    whatsapp: string | null;
  } | null;
  branches?: {
    name: string;
  } | null;
}

type FilterType = 'hoy' | 'manana' | 'semana' | 'atrasados';

export function ScheduledPaymentsList() {
  const [filter, setFilter] = useState<FilterType>('hoy');
  const [selectedSale, setSelectedSale] = useState<ScheduledPayment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ['scheduled-payments', filter],
    queryFn: async () => {
      const today = new Date();
      let query = supabase
        .from('sales')
        .select(`
          id, sale_number, customer_name, customer_phone, total, balance,
          next_payment_date, next_payment_amount, next_payment_note, patient_id,
          amount_paid, credit_due_date, created_at,
          patients (id, first_name, last_name, phone, whatsapp),
          branches (name)
        `)
        .eq('is_credit', true)
        .gt('balance', 0)
        .not('next_payment_date', 'is', null);

      switch (filter) {
        case 'hoy':
          query = query
            .gte('next_payment_date', format(startOfDay(today), 'yyyy-MM-dd'))
            .lte('next_payment_date', format(endOfDay(today), 'yyyy-MM-dd'));
          break;
        case 'manana':
          const tomorrow = addDays(today, 1);
          query = query
            .gte('next_payment_date', format(startOfDay(tomorrow), 'yyyy-MM-dd'))
            .lte('next_payment_date', format(endOfDay(tomorrow), 'yyyy-MM-dd'));
          break;
        case 'semana':
          const weekEnd = addDays(today, 7);
          query = query
            .gte('next_payment_date', format(startOfDay(today), 'yyyy-MM-dd'))
            .lte('next_payment_date', format(endOfDay(weekEnd), 'yyyy-MM-dd'));
          break;
        case 'atrasados':
          query = query
            .lt('next_payment_date', format(startOfDay(today), 'yyyy-MM-dd'));
          break;
      }

      const { data, error } = await query.order('next_payment_date', { ascending: true });

      if (error) throw error;
      return data as ScheduledPayment[];
    },
  });

  const getPatientName = (payment: ScheduledPayment) => {
    if (payment.patients) {
      return `${payment.patients.first_name} ${payment.patients.last_name}`;
    }
    return payment.customer_name || 'Cliente';
  };

  const getPatientPhone = (payment: ScheduledPayment) => {
    if (payment.patients) {
      return payment.patients.whatsapp || payment.patients.phone || payment.customer_phone;
    }
    return payment.customer_phone;
  };

  const getDateBadge = (date: string) => {
    const paymentDate = new Date(date);
    
    if (isPast(paymentDate) && !isToday(paymentDate)) {
      const daysLate = Math.ceil((new Date().getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysLate} días atrasado
        </Badge>
      );
    }
    
    if (isToday(paymentDate)) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Hoy
        </Badge>
      );
    }
    
    if (isTomorrow(paymentDate)) {
      return (
        <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Mañana
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {format(paymentDate, 'dd/MM/yyyy', { locale: es })}
      </Badge>
    );
  };

  const openWhatsApp = (phone: string | null, patientName: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hola ${patientName}, le recordamos que tiene un pago programado en Óptica Istmeña. ¿Le gustaría agendar su visita?`
    );
    window.open(`https://wa.me/52${cleanPhone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedSale(null);
    refetch();
  };

  const filterCounts = {
    hoy: payments.filter(p => isToday(new Date(p.next_payment_date))).length,
    atrasados: payments.filter(p => isPast(new Date(p.next_payment_date)) && !isToday(new Date(p.next_payment_date))).length,
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Cobros Programados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="hoy" className="relative">
                Hoy
                {filter !== 'hoy' && filterCounts.hoy > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-500 text-[10px] font-bold flex items-center justify-center text-white">
                    {filterCounts.hoy}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="manana">Mañana</TabsTrigger>
              <TabsTrigger value="semana">Semana</TabsTrigger>
              <TabsTrigger value="atrasados" className="relative">
                Atrasados
                {filter !== 'atrasados' && filterCounts.atrasados > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold flex items-center justify-center text-white">
                    {filterCounts.atrasados}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {filter === 'atrasados' 
                  ? 'No hay cobros atrasados'
                  : 'No hay cobros programados para este periodo'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Monto Esperado</TableHead>
                    <TableHead>Fecha Programada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getPatientName(payment)}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {payment.sale_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPatientPhone(payment) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-primary"
                            onClick={(e) => {
                              e.preventDefault();
                              openWhatsApp(getPatientPhone(payment), getPatientName(payment));
                            }}
                          >
                            <MessageCircle className="h-3 w-3" />
                            <span className="text-xs">{getPatientPhone(payment)}</span>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-orange-600">
                          ${Number(payment.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.next_payment_amount ? (
                          <span className="font-medium">
                            ${Number(payment.next_payment_amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getDateBadge(payment.next_payment_date)}
                        {payment.next_payment_note && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[150px] truncate">
                            {payment.next_payment_note}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedSale(payment);
                            setShowPaymentModal(true);
                          }}
                        >
                          <Banknote className="h-4 w-4 mr-1" />
                          Cobrar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {selectedSale && (
        <QuickPaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          sale={selectedSale}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
