import { useState, useCallback, useEffect, useRef } from 'react';

interface UsePaginatedDataOptions<T> {
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>;
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginatedDataReturn<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadPage: (page: number) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function usePaginatedData<T>({
  fetchFn,
  pageSize = 20,
  initialPage = 1,
}: UsePaginatedDataOptions<T>): UsePaginatedDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasMore = page < totalPages;

  const fetchData = useCallback(async (targetPage: number, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const result = await fetchFn(targetPage, pageSize);
      
      setData(prev => append ? [...prev, ...result.data] : result.data);
      setTotalItems(result.total);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchFn, pageSize]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    await fetchData(page + 1, true);
  }, [fetchData, page, hasMore, loadingMore]);

  const loadPage = useCallback(async (targetPage: number) => {
    await fetchData(targetPage, false);
  }, [fetchData]);

  const refresh = useCallback(async () => {
    setData([]);
    await fetchData(1, false);
  }, [fetchData]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setTotalItems(0);
    setError(null);
    setLoading(true);
  }, []);

  // Initial load
  useEffect(() => {
    fetchData(initialPage, false);
  }, []);

  return {
    data,
    loading,
    loadingMore,
    error,
    page,
    totalPages,
    totalItems,
    hasMore,
    loadMore,
    loadPage,
    refresh,
    reset,
  };
}

// Hook for infinite scroll
interface UseInfiniteScrollOptions {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  threshold?: number;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
  threshold = 200,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const setSentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node && hasMore && !loading) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            onLoadMore();
          }
        },
        { rootMargin: `${threshold}px` }
      );
      observerRef.current.observe(node);
    }

    sentinelRef.current = node;
  }, [hasMore, loading, onLoadMore, threshold]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { sentinelRef: setSentinelRef };
}
