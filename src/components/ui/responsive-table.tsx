import * as React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  mobileLabel?: string;
  hiddenOnMobile?: boolean;
  className?: string;
}

interface Action<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
  showOnSwipe?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  mobileCardRender?: (item: T, actions: Action<T>[]) => React.ReactNode;
}

function SwipeableCard<T>({
  item,
  actions,
  children,
  onRowClick,
}: {
  item: T;
  actions: Action<T>[];
  children: React.ReactNode;
  onRowClick?: (item: T) => void;
}) {
  const x = useMotionValue(0);
  const swipeActions = actions.filter((a) => a.showOnSwipe !== false);
  const actionWidth = swipeActions.length * 72;

  const background = useTransform(x, [-actionWidth, 0], ['#ef4444', '#ffffff']);
  const opacity = useTransform(x, [-actionWidth, -20, 0], [1, 0.5, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = actionWidth / 2;
    if (info.offset.x < -threshold) {
      // Keep swiped
    } else {
      x.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-3">
      {/* Actions revealed on swipe */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center"
        style={{ opacity }}
      >
        {swipeActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
            size="sm"
            className="h-full rounded-none w-[72px] flex flex-col gap-1"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick(item);
              x.set(0);
            }}
          >
            {action.icon && <action.icon className="h-4 w-4" />}
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </motion.div>

      {/* Card content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -actionWidth, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-card touch-pan-y"
        onClick={() => onRowClick?.(item)}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function ResponsiveTable<T>({
  data,
  columns,
  actions = [],
  keyExtractor,
  onRowClick,
  emptyState,
  loading,
  mobileCardRender,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-muted/50 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        {emptyState || <p>No hay datos para mostrar</p>}
      </div>
    );
  }

  // Mobile: Card layout
  if (isMobile) {
    return (
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {data.map((item, index) => (
            <motion.div
              key={keyExtractor(item)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03 }}
            >
              <SwipeableCard item={item} actions={actions} onRowClick={onRowClick}>
                {mobileCardRender ? (
                  mobileCardRender(item, actions)
                ) : (
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {columns
                            .filter((col) => !col.hiddenOnMobile)
                            .slice(0, 4)
                            .map((col, colIndex) => {
                              const value = col.render
                                ? col.render(item)
                                : String((item as any)[col.key] ?? '');
                              
                              return (
                                <div key={String(col.key)} className={cn(
                                  colIndex === 0 ? 'font-medium text-foreground' : 'text-sm text-muted-foreground',
                                  col.className
                                )}>
                                  {colIndex > 0 && col.mobileLabel && (
                                    <span className="text-xs text-muted-foreground/70 mr-1">
                                      {col.mobileLabel}:
                                    </span>
                                  )}
                                  {value}
                                </div>
                              );
                            })}
                        </div>

                        <div className="flex items-center gap-1">
                          {actions.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {actions.map((action, actionIndex) => (
                                  <DropdownMenuItem
                                    key={actionIndex}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      action.onClick(item);
                                    }}
                                    className={action.variant === 'destructive' ? 'text-destructive' : ''}
                                  >
                                    {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          {onRowClick && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </SwipeableCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop: Table layout
  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cn(
                  'text-left px-4 py-3 text-sm font-medium text-muted-foreground',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
            {actions.length > 0 && (
              <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-20">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <motion.tr
              key={keyExtractor(item)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className={cn(
                'border-t transition-colors',
                onRowClick && 'cursor-pointer hover:bg-muted/50'
              )}
              onClick={() => onRowClick?.(item)}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={cn('px-4 py-3 text-sm', col.className)}
                >
                  {col.render
                    ? col.render(item)
                    : String((item as any)[col.key] ?? '')}
                </td>
              ))}
              {actions.length > 0 && (
                <td className="px-4 py-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map((action, actionIndex) => (
                        <DropdownMenuItem
                          key={actionIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(item);
                          }}
                          className={action.variant === 'destructive' ? 'text-destructive' : ''}
                        >
                          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
