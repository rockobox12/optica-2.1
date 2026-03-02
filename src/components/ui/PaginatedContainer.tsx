import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadMoreButtonProps {
  onClick: () => void;
  loading: boolean;
  hasMore: boolean;
  loadedCount: number;
  totalCount: number;
  className?: string;
}

export function LoadMoreButton({
  onClick,
  loading,
  hasMore,
  loadedCount,
  totalCount,
  className,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <div className={cn(
        "text-center py-4 text-sm text-muted-foreground",
        className
      )}>
        Mostrando {loadedCount} de {totalCount} registros
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-2 py-4", className)}>
      <button
        onClick={onClick}
        disabled={loading}
        className={cn(
          "px-6 py-2 rounded-lg border bg-card text-sm font-medium",
          "hover:bg-muted transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center gap-2"
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </>
        ) : (
          `Cargar más (${totalCount - loadedCount} restantes)`
        )}
      </button>
      <span className="text-xs text-muted-foreground">
        {loadedCount} de {totalCount} registros
      </span>
    </div>
  );
}

// Sentinel component for infinite scroll
interface InfiniteScrollSentinelProps {
  loading: boolean;
  hasMore: boolean;
  sentinelRef: (node: HTMLDivElement | null) => void;
}

export function InfiniteScrollSentinel({
  loading,
  hasMore,
  sentinelRef,
}: InfiniteScrollSentinelProps) {
  if (!hasMore) return null;

  return (
    <div ref={sentinelRef} className="flex justify-center py-4">
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando más...
        </motion.div>
      )}
    </div>
  );
}

// Wrapper for paginated tables
interface PaginatedContainerProps {
  children: React.ReactNode;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadedCount: number;
  totalCount: number;
  onLoadMore: () => void;
  mode?: 'button' | 'infinite';
  sentinelRef?: (node: HTMLDivElement | null) => void;
}

export function PaginatedContainer({
  children,
  loading,
  loadingMore,
  hasMore,
  loadedCount,
  totalCount,
  onLoadMore,
  mode = 'button',
  sentinelRef,
}: PaginatedContainerProps) {
  return (
    <div className="space-y-4">
      {children}
      
      {mode === 'button' ? (
        <LoadMoreButton
          onClick={onLoadMore}
          loading={loadingMore}
          hasMore={hasMore}
          loadedCount={loadedCount}
          totalCount={totalCount}
        />
      ) : (
        sentinelRef && (
          <InfiniteScrollSentinel
            loading={loadingMore}
            hasMore={hasMore}
            sentinelRef={sentinelRef}
          />
        )
      )}
    </div>
  );
}
