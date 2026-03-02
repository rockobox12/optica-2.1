import { useState, useMemo } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from 'date-fns';

export type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom' | 'last7' | 'last30' | 'last90';

export interface ReportFilters {
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  branchId: string;
  categoryId: string;
  sellerId: string;
  status: string;
  searchTerm: string;
}

export interface UseReportFiltersReturn {
  filters: ReportFilters;
  setFilter: <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => void;
  resetFilters: () => void;
  applyDatePreset: (preset: DatePreset) => void;
  dateRange: { from: Date; to: Date };
}

const defaultFilters: ReportFilters = {
  datePreset: 'month',
  dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  branchId: 'all',
  categoryId: 'all',
  sellerId: 'all',
  status: 'all',
  searchTerm: '',
};

export function useReportFilters(initialFilters?: Partial<ReportFilters>): UseReportFiltersReturn {
  const [filters, setFilters] = useState<ReportFilters>({
    ...defaultFilters,
    ...initialFilters,
  });

  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const applyDatePreset = (preset: DatePreset) => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to = from;
        break;
      case 'week':
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'year':
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      case 'last7':
        from = subDays(now, 7);
        break;
      case 'last30':
        from = subDays(now, 30);
        break;
      case 'last90':
        from = subDays(now, 90);
        break;
      case 'custom':
      default:
        return;
    }

    setFilters(prev => ({
      ...prev,
      datePreset: preset,
      dateFrom: format(from, 'yyyy-MM-dd'),
      dateTo: format(to, 'yyyy-MM-dd'),
    }));
  };

  const dateRange = useMemo(() => ({
    from: new Date(filters.dateFrom),
    to: new Date(filters.dateTo),
  }), [filters.dateFrom, filters.dateTo]);

  return {
    filters,
    setFilter,
    resetFilters,
    applyDatePreset,
    dateRange,
  };
}

export const datePresetLabels: Record<DatePreset, string> = {
  today: 'Hoy',
  week: 'Esta Semana',
  month: 'Este Mes',
  year: 'Este Año',
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  last90: 'Últimos 90 días',
  custom: 'Personalizado',
};
