import { useState, useMemo } from 'react';
import { normalizeSearchQuery, tokenizeQuery, filterPatientByTokens } from '@/lib/patient-search';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Stethoscope,
  Download,
  MessageCircle,
  Tag,
  Users,
  Crown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  MoreHorizontal,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

export interface PatientTableItem {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  mobile: string | null;
  whatsapp: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  avatar_url?: string | null;
  status?: string;
  // Extended data
  is_vip?: boolean;
  is_moroso?: boolean;
  has_saldo_pendiente?: boolean;
  saldo_pendiente?: number;
  last_purchase_date?: string | null;
  total_spent?: number;
  branch_name?: string | null;
  // Corporate fields
  branch_id?: string | null;
  home_branch_id?: string | null;
  is_corporate_patient?: boolean;
  current_branch_id?: string | null;
}

interface PatientTableProps {
  patients: PatientTableItem[];
  loading: boolean;
  branches?: { id: string; name: string }[];
  onView: (patient: PatientTableItem) => void;
  onEdit?: (patient: PatientTableItem) => void;
  onDelete?: (patient: PatientTableItem) => void;
  onAttend?: (patient: PatientTableItem) => void;
  onBulkExport?: (patients: PatientTableItem[]) => void;
  onBulkMessage?: (patients: PatientTableItem[]) => void;
  onBulkTag?: (patients: PatientTableItem[]) => void;
  showAttendButton?: boolean;
}

type SortField = 'name' | 'last_purchase' | 'total_spent' | 'created_at';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'vip' | 'moroso' | 'saldo_pendiente' | 'activo';

export function PatientTable({
  patients,
  loading,
  branches = [],
  onView,
  onEdit,
  onDelete,
  onAttend,
  onBulkExport,
  onBulkMessage,
  onBulkTag,
  showAttendButton = true,
}: PatientTableProps) {
  const isMobile = useIsMobile();
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Helpers
  const getAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatRelativeDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Nunca';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  const getPhone = (patient: PatientTableItem): string | null => {
    return patient.whatsapp || patient.mobile || patient.phone || null;
  };

  // Filter and sort logic
  const filteredAndSortedPatients = useMemo(() => {
    let result = [...patients];

    // Search filter (multi-token: "estefania aquino" matches first_name + last_name)
    if (searchTerm.length >= 2) {
      const normalized = normalizeSearchQuery(searchTerm);
      const tokens = tokenizeQuery(normalized);
      result = result.filter(p => filterPatientByTokens(p, tokens));
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => {
        if (statusFilter === 'vip') return p.is_vip;
        if (statusFilter === 'moroso') return p.is_moroso;
        if (statusFilter === 'saldo_pendiente') return p.has_saldo_pendiente && !p.is_moroso;
        if (statusFilter === 'activo') return p.is_active && !p.is_moroso && !p.has_saldo_pendiente;
        return true;
      });
    }

    // Branch filter
    if (branchFilter !== 'all') {
      result = result.filter(p => p.branch_name === branchFilter);
    }

    // Date range filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (dateRangeFilter) {
        case 'today':
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          cutoffDate = new Date(0);
      }

      result = result.filter(p => {
        const purchaseDate = p.last_purchase_date ? new Date(p.last_purchase_date) : null;
        return purchaseDate && purchaseDate >= cutoffDate;
      });
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
          break;
        case 'last_purchase':
          const dateA = a.last_purchase_date ? new Date(a.last_purchase_date).getTime() : 0;
          const dateB = b.last_purchase_date ? new Date(b.last_purchase_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'total_spent':
          comparison = (a.total_spent || 0) - (b.total_spent || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [patients, searchTerm, statusFilter, branchFilter, dateRangeFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedPatients.length / pageSize);
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedPatients.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedPatients, currentPage, pageSize]);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, branchFilter, dateRangeFilter, pageSize]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedPatients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPatients.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectedPatients = patients.filter(p => selectedIds.has(p.id));

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  // Status badge component
  const StatusBadge = ({ patient }: { patient: PatientTableItem }) => {
    if (patient.is_vip) {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
          <Crown className="h-3 w-3" />
          VIP
        </Badge>
      );
    }
    if (patient.is_moroso) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Moroso
        </Badge>
      );
    }
    if (patient.has_saldo_pendiente) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Saldo pendiente
        </Badge>
      );
    }
    if (patient.is_active) {
      return (
        <Badge className="bg-success/10 text-success border-success/20 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Activo
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="opacity-60">
        Inactivo
      </Badge>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1 max-w-md" />
          <Skeleton className="h-11 w-32" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (patients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Sin clientes registrados</h3>
          <p className="text-muted-foreground text-center max-w-sm mb-4">
            Aún no hay clientes en el sistema. Comienza registrando tu primer cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No results after filtering
  if (filteredAndSortedPatients.length === 0) {
    return (
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
            setBranchFilter('all');
            setDateRangeFilter('all');
          }}>
            Limpiar filtros
          </Button>
        </div>
        
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              No se encontraron clientes con los filtros actuales. Intenta modificar la búsqueda.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, teléfono, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="moroso">Moroso</SelectItem>
              <SelectItem value="saldo_pendiente">Saldo pendiente</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
            </SelectContent>
          </Select>

          {/* Branch Filter */}
          {branches.length > 0 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[150px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date Range Filter */}
          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Última compra</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end">
              <div className="space-y-1">
                {[
                  { value: 'all', label: 'Cualquier fecha' },
                  { value: 'today', label: 'Hoy' },
                  { value: 'week', label: 'Esta semana' },
                  { value: 'month', label: 'Este mes' },
                  { value: 'year', label: 'Este año' },
                ].map(option => (
                  <Button
                    key={option.value}
                    variant={dateRangeFilter === option.value ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setDateRangeFilter(option.value);
                      setFiltersOpen(false);
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg animate-in slide-in-from-top-2">
          <span className="text-sm font-medium">
            {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2 ml-auto">
            {onBulkExport && (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => onBulkExport(selectedPatients)}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            )}
            {onBulkMessage && (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => onBulkMessage(selectedPatients)}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Mensaje</span>
              </Button>
            )}
            {onBulkTag && (
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => onBulkTag(selectedPatients)}
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Etiquetar</span>
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Card View */}
      {isMobile ? (
        <div className="space-y-3">
          {paginatedPatients.map(patient => (
            <Card 
              key={patient.id} 
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedIds.has(patient.id) && "ring-2 ring-primary"
              )}
              onClick={() => onView(patient)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative" onClick={(e) => { e.stopPropagation(); toggleSelect(patient.id); }}>
                    <Avatar className="h-12 w-12 border-2 border-border">
                      {patient.avatar_url ? (
                        <AvatarImage src={patient.avatar_url} alt={patient.first_name} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(patient.first_name, patient.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    {selectedIds.has(patient.id) && (
                      <div className="absolute -top-1 -right-1 bg-primary rounded-full p-0.5">
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold truncate">
                          {patient.first_name} {patient.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getPhone(patient) || 'Sin teléfono'}
                        </p>
                      </div>
                      <StatusBadge patient={patient} />
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {patient.last_purchase_date && (
                        <span>Compra: {formatRelativeDate(patient.last_purchase_date)}</span>
                      )}
                      {patient.total_spent !== undefined && patient.total_spent > 0 && (
                        <span className="font-medium text-foreground">
                          {formatCurrency(patient.total_spent)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1 gap-1.5"
                    onClick={(e) => { e.stopPropagation(); onView(patient); }}
                  >
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    Ver
                  </Button>
                  {onEdit && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 gap-1.5"
                      onClick={(e) => { e.stopPropagation(); onEdit(patient); }}
                    >
                      <Edit className="h-3.5 w-3.5 text-success" />
                      Editar
                    </Button>
                  )}
                  {showAttendButton && onAttend && (
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1.5"
                      onClick={(e) => { e.stopPropagation(); onAttend(patient); }}
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
                      Atender
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="rounded-xl border border-border/60 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent text-accent-foreground sticky top-0 z-10">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={selectedIds.size === paginatedPatients.length && paginatedPatients.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button 
                      className="flex items-center gap-1 font-semibold hover:text-accent-foreground/80"
                      onClick={() => handleSort('name')}
                    >
                      Cliente
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-28">Estado</th>
                  <th className="px-4 py-3 text-left w-36 hidden lg:table-cell">
                    <button 
                      className="flex items-center gap-1 font-semibold hover:text-accent-foreground/80"
                      onClick={() => handleSort('last_purchase')}
                    >
                      Última compra
                      <SortIcon field="last_purchase" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right w-32 hidden md:table-cell">
                    <button 
                      className="flex items-center gap-1 font-semibold hover:text-accent-foreground/80 ml-auto"
                      onClick={() => handleSort('total_spent')}
                    >
                      Total gastado
                      <SortIcon field="total_spent" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-center w-36">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginatedPatients.map((patient, idx) => (
                  <tr 
                    key={patient.id}
                    className={cn(
                      "transition-colors hover:bg-secondary/50 cursor-pointer",
                      idx % 2 === 1 && "bg-muted/30",
                      selectedIds.has(patient.id) && "bg-primary/5 hover:bg-primary/10"
                    )}
                    onClick={() => onView(patient)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(patient.id)}
                        onCheckedChange={() => toggleSelect(patient.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-border">
                          {patient.avatar_url ? (
                            <AvatarImage src={patient.avatar_url} alt={patient.first_name} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                            {getInitials(patient.first_name, patient.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {patient.first_name} {patient.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {getPhone(patient) || patient.email || 'Sin contacto'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge patient={patient} />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                      {formatRelativeDate(patient.last_purchase_date)}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="font-semibold text-foreground">
                        {patient.total_spent !== undefined ? formatCurrency(patient.total_spent) : '$0.00'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => onView(patient)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {onEdit && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                            onClick={() => onEdit(patient)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => onDelete(patient)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {showAttendButton && onAttend && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1.5 ml-1"
                            onClick={() => onAttend(patient)}
                          >
                            <Stethoscope className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Atender</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Mostrar</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>de {filteredAndSortedPatients.length} registros</span>
        </div>

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setCurrentPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
