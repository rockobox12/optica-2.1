import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { MaskedDateInput } from '@/components/ui/MaskedDateInput';
import { Calendar, Filter, RefreshCw, Search, Building2, User, Tag, CheckCircle } from 'lucide-react';
import { ReportFilters, DatePreset, datePresetLabels } from '@/hooks/useReportFilters';

interface ReportFiltersPanelProps {
  filters: ReportFilters;
  onFilterChange: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  onPresetChange: (preset: DatePreset) => void;
  onReset: () => void;
  showBranch?: boolean;
  showCategory?: boolean;
  showSeller?: boolean;
  showStatus?: boolean;
  showSearch?: boolean;
  statusOptions?: { value: string; label: string }[];
  searchPlaceholder?: string;
}

export function ReportFiltersPanel({
  filters,
  onFilterChange,
  onPresetChange,
  onReset,
  showBranch = true,
  showCategory = false,
  showSeller = false,
  showStatus = true,
  showSearch = true,
  statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'completed', label: 'Completadas' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'cancelled', label: 'Canceladas' },
  ],
  searchPlaceholder = 'Buscar...',
}: ReportFiltersPanelProps) {
  // Fetch branches
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: showBranch,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_categories')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: showCategory,
  });

  // Fetch sellers
  const { data: sellers = [] } = useQuery({
    queryKey: ['sellers-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true)
        .order('full_name');
      return data || [];
    },
    enabled: showSeller,
  });

  const presets: DatePreset[] = ['today', 'week', 'month', 'year', 'last7', 'last30', 'last90'];

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date Presets */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Período
          </Label>
          <div className="flex flex-wrap gap-1">
            {presets.map(preset => (
              <Button
                key={preset}
                variant={filters.datePreset === preset ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => onPresetChange(preset)}
              >
                {datePresetLabels[preset]}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <MaskedDateInput
              value={filters.dateFrom}
              onChange={(val) => {
                onFilterChange('dateFrom', val);
                onFilterChange('datePreset', 'custom');
              }}
              label="Desde"
              mode="general"
            />
          </div>
          <div>
            <MaskedDateInput
              value={filters.dateTo}
              onChange={(val) => {
                onFilterChange('dateTo', val);
                onFilterChange('datePreset', 'custom');
              }}
              label="Hasta"
              mode="general"
            />
          </div>
        </div>

        <Separator />

        {/* Branch Filter */}
        {showBranch && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Sucursal
            </Label>
            <Select value={filters.branchId} onValueChange={(v) => onFilterChange('branchId', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Category Filter */}
        {showCategory && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Categoría
            </Label>
            <Select value={filters.categoryId} onValueChange={(v) => onFilterChange('categoryId', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Seller Filter */}
        {showSeller && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Vendedor
            </Label>
            <Select value={filters.sellerId} onValueChange={(v) => onFilterChange('sellerId', v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sellers.map(seller => (
                  <SelectItem key={seller.user_id} value={seller.user_id}>
                    {seller.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Filter */}
        {showStatus && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Estado
            </Label>
            <Select value={filters.status} onValueChange={(v) => onFilterChange('status', v)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Separator />

        {/* Search */}
        {showSearch && (
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={filters.searchTerm}
                onChange={(e) => onFilterChange('searchTerm', e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Reset Button */}
        <Button variant="ghost" size="sm" onClick={onReset} className="w-full">
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Limpiar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}
