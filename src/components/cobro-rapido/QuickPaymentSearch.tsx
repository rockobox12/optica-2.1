import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { normalizeSearchQuery, tokenizeQuery, filterPatientByTokens, matchesAllTokens } from '@/lib/patient-search';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Phone, Banknote, AlertTriangle, Calendar, RefreshCw, Clock, Users, ArrowRightLeft } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { QuickPaymentModal } from './QuickPaymentModal';
import { useBranch } from '@/hooks/useBranchContext';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useAuth } from '@/hooks/useAuth';

interface CreditSale {
  id: string;
  sale_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  total: number;
  amount_paid: number;
  balance: number;
  credit_due_date: string | null;
  next_payment_date: string | null;
  next_payment_amount: number | null;
  created_at: string;
  patient_id: string | null;
  branch_id: string | null;
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

type ListFilter = 'pendientes' | 'morosos' | 'recientes';

const SALES_SELECT = `
  id, sale_number, customer_name, customer_phone, total, amount_paid, balance,
  credit_due_date, next_payment_date, next_payment_amount, created_at, patient_id, branch_id,
  patients!inner (id, first_name, last_name, phone, whatsapp, status),
  branches (name)
`;

export function QuickPaymentSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<CreditSale | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [listFilter, setListFilter] = useState<ListFilter>('pendientes');
  const { branchFilter, activeBranch, activeBranchId } = useBranch();
  const { settings } = useCompanySettings();
  const { isAdmin } = useAuth();
  
  const crossBranchEnabled = settings?.cross_branch_payments_enabled ?? false;
  // Show all branches if cross-branch is enabled OR user is admin
  const showAllBranches = crossBranchEnabled || isAdmin();

  // Search query (only when typing 2+ chars)
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['quick-payment-search', searchTerm, showAllBranches, branchFilter],
    queryFn: async () => {
      const normalized = normalizeSearchQuery(searchTerm);
      const tokens = tokenizeQuery(normalized);

      // Broader DB fetch: don't use .or() on sales columns only,
      // because patient name lives in the joined patients table.
      // We fetch all credit sales and filter precisely client-side.
      let query = supabase
        .from('sales')
        .select(SALES_SELECT)
        .eq('is_credit', true)
        .gt('balance', 0)
        .eq('patients.status', 'active')
        .order('created_at', { ascending: false })
        .limit(200);

      // If not showing all branches, filter by current branch
      if (!showAllBranches && branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Client-side multi-token filtering (accent-insensitive, AND logic)
      const results = (data as CreditSale[]).filter(sale => {
        const patientName = sale.patients
          ? `${sale.patients.first_name} ${sale.patients.last_name}`
          : sale.customer_name || '';
        const phone = sale.patients?.phone || sale.patients?.whatsapp || sale.customer_phone || '';
        return matchesAllTokens(tokens, [
          patientName,
          sale.customer_name,
          phone,
          sale.sale_number,
        ]);
      });

      return results;
    },
    enabled: searchTerm.length >= 2,
  });

  // Default list query (when NOT searching)
  const { data: defaultList = [], isLoading: isLoadingDefault, refetch: refetchDefault, isError: isDefaultError } = useQuery({
    queryKey: ['cobro-rapido-default', listFilter, showAllBranches, branchFilter],
    queryFn: async () => {
      let query = supabase
        .from('sales')
        .select(SALES_SELECT)
        .eq('is_credit', true)
        .gt('balance', 0)
        .eq('patients.status', 'active');

      // If not showing all branches, filter by current branch
      if (!showAllBranches && branchFilter) {
        query = query.eq('branch_id', branchFilter);
      }

      if (listFilter === 'morosos') {
        query = query.or(`next_payment_date.lt.${new Date().toISOString()},credit_due_date.lt.${new Date().toISOString()}`);
      }

      if (listFilter === 'recientes') {
        query = query.order('updated_at', { ascending: false });
      } else {
        query = query.order('next_payment_date', { ascending: true, nullsFirst: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      if (listFilter === 'pendientes') {
        return (data as CreditSale[]).sort((a, b) => {
          const aOverdue = isOverdue(a) ? 0 : 1;
          const bOverdue = isOverdue(b) ? 0 : 1;
          if (aOverdue !== bOverdue) return aOverdue - bOverdue;
          const aDate = a.next_payment_date || a.credit_due_date || '9999';
          const bDate = b.next_payment_date || b.credit_due_date || '9999';
          return aDate.localeCompare(bDate);
        });
      }

      return data as CreditSale[];
    },
    enabled: searchTerm.length < 2,
  });

  const isSearchMode = searchTerm.length >= 2;
  const displayData = isSearchMode ? searchResults : defaultList;
  const isLoading = isSearchMode ? isSearching : isLoadingDefault;

  function isOverdue(sale: CreditSale) {
    const dueDate = sale.next_payment_date || sale.credit_due_date;
    return dueDate ? isPast(new Date(dueDate)) && !isToday(new Date(dueDate)) : false;
  }

  function isCrossBranch(sale: CreditSale) {
    if (activeBranchId === 'all') return false;
    return sale.branch_id !== branchFilter && !!sale.branch_id && !!branchFilter;
  }

  const getStatusBadge = (sale: CreditSale) => {
    const dueDate = sale.next_payment_date || sale.credit_due_date;
    if (!dueDate) return <Badge variant="outline">Pendiente</Badge>;

    if (isPast(new Date(dueDate)) && !isToday(new Date(dueDate))) {
      return <Badge variant="destructive">Moroso</Badge>;
    }
    if (isToday(new Date(dueDate))) {
      return <Badge className="bg-warning/20 text-warning-foreground border-warning">Hoy</Badge>;
    }
    return <Badge className="bg-success/20 text-success-foreground border-success">Al día</Badge>;
  };

  const handleSelectSale = (sale: CreditSale) => {
    // Block cross-branch if not enabled and not admin
    if (isCrossBranch(sale) && !crossBranchEnabled && !isAdmin()) {
      return; // blocked
    }
    setSelectedSale(sale);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedSale(null);
    refetchDefault();
  };

  const getPatientName = (sale: CreditSale) => {
    if (sale.patients) {
      return `${sale.patients.first_name} ${sale.patients.last_name}`;
    }
    return sale.customer_name || 'Cliente';
  };

  const getPatientPhone = (sale: CreditSale) => {
    if (sale.patients) {
      return sale.patients.phone || sale.patients.whatsapp || sale.customer_phone;
    }
    return sale.customer_phone;
  };

  // Mobile card view for a single sale
  const renderMobileCard = (sale: CreditSale) => {
    const crossBranch = isCrossBranch(sale);
    const blocked = crossBranch && !crossBranchEnabled && !isAdmin();
    return (
      <div 
        key={sale.id}
        onClick={() => !blocked && handleSelectSale(sale)}
        className={`p-4 border-b border-border last:border-b-0 active:bg-muted/50 touch-manipulation ${blocked ? 'opacity-50' : 'cursor-pointer'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{getPatientName(sale)}</p>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">{sale.sale_number}</p>
            {crossBranch && (
              <Badge variant="outline" className="text-[10px] mt-1 gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
                <ArrowRightLeft className="h-3 w-3" />
                Pago cruzado
              </Badge>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-destructive text-base">
              ${Number(sale.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
            {getStatusBadge(sale)}
          </div>
        </div>
        {(sale.next_payment_date || getPatientPhone(sale)) && (
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            {getPatientPhone(sale) && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {getPatientPhone(sale)}
              </span>
            )}
            {sale.next_payment_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(sale.next_payment_date), 'dd/MM/yyyy', { locale: es })}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTable = (data: CreditSale[]) => (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Folio</TableHead>
              <TableHead>Sucursal Venta</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Próximo Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((sale) => {
              const crossBranch = isCrossBranch(sale);
              const blocked = crossBranch && !crossBranchEnabled && !isAdmin();
              return (
                <TableRow 
                  key={sale.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${blocked ? 'opacity-50' : ''}`} 
                  onClick={() => handleSelectSale(sale)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{getPatientName(sale)}</p>
                      {crossBranch && (
                        <Badge variant="outline" className="text-[10px] mt-0.5 gap-1 border-amber-300 text-amber-700 dark:text-amber-400">
                          <ArrowRightLeft className="h-3 w-3" />
                          Pago cruzado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPatientPhone(sale) && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getPatientPhone(sale)}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">{sale.sale_number}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{sale.branches?.name || '—'}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-destructive">
                      ${Number(sale.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                  <TableCell>
                    {sale.next_payment_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {format(new Date(sale.next_payment_date), 'dd/MM/yyyy', { locale: es })}
                        </span>
                        {sale.next_payment_amount && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (${Number(sale.next_payment_amount).toFixed(0)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin programar</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(sale)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={blocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSale(sale);
                      }}
                    >
                      <Banknote className="h-4 w-4 mr-1" />
                      Cobrar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-border">
        {data.map(renderMobileCard)}
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono o folio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          {showAllBranches && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" />
              Mostrando ventas de todas las sucursales {crossBranchEnabled ? '(pagos cruzados activos)' : '(solo admin)'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filter Tabs (only when not searching) */}
      {!isSearchMode && (
        <Tabs value={listFilter} onValueChange={(v) => setListFilter(v as ListFilter)}>
          <TabsList className="grid grid-cols-3 w-full max-w-sm">
            <TabsTrigger value="pendientes" className="gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="morosos" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Morosos
            </TabsTrigger>
            <TabsTrigger value="recientes" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Recientes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Results */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {isSearchMode
                ? `Resultados (${displayData.length})`
                : `${listFilter === 'pendientes' ? 'Créditos Pendientes' : listFilter === 'morosos' ? 'Créditos Morosos' : 'Actividad Reciente'} (${displayData.length})`
              }
            </CardTitle>
            {!isSearchMode && (
              <Button variant="ghost" size="icon" onClick={() => refetchDefault()} title="Actualizar">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="ml-3 text-muted-foreground">Buscando…</span>
            </div>
          ) : isDefaultError && !isSearchMode ? (
            <div className="text-center py-12 space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-muted-foreground">Error al cargar resultados</p>
              <Button variant="outline" size="sm" onClick={() => refetchDefault()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reintentar
              </Button>
            </div>
          ) : displayData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {isSearchMode
                ? 'No se encontraron créditos pendientes'
                : listFilter === 'morosos'
                  ? 'No hay créditos morosos — ¡todo al día!'
                  : 'No hay créditos pendientes'
              }
            </div>
          ) : (
            renderTable(displayData)
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
