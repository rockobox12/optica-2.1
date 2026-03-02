import { useState, useCallback, useRef } from 'react';
import { showSuccess, showError } from '@/lib/toast-utils';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollback: () => void) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook for optimistic updates - updates UI immediately before server confirmation
 */
export function useOptimisticUpdate<T>() {
  const [isUpdating, setIsUpdating] = useState(false);
  const rollbackRef = useRef<(() => void) | null>(null);

  const update = useCallback(async <R,>(
    // The optimistic update to apply immediately
    optimisticUpdate: () => void,
    // The actual async operation
    asyncOperation: () => Promise<R>,
    // Function to rollback if operation fails
    rollback: () => void,
    // Options
    options?: OptimisticUpdateOptions<R>
  ): Promise<R | null> => {
    setIsUpdating(true);
    rollbackRef.current = rollback;

    // Apply optimistic update immediately
    optimisticUpdate();

    try {
      const result = await asyncOperation();
      
      if (options?.successMessage) {
        showSuccess(options.successMessage);
      }
      
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      // Rollback on failure
      rollback();
      
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      
      if (options?.errorMessage) {
        showError(options.errorMessage, {
          description: errorMsg,
          onRetry: () => update(optimisticUpdate, asyncOperation, rollback, options),
        });
      }
      
      options?.onError?.(error instanceof Error ? error : new Error(errorMsg), rollback);
      return null;
    } finally {
      setIsUpdating(false);
      rollbackRef.current = null;
    }
  }, []);

  return { update, isUpdating };
}

/**
 * Hook for optimistic list operations (add, update, delete)
 */
export function useOptimisticList<T extends { id: string }>(initialItems: T[] = []) {
  const [items, setItems] = useState<T[]>(initialItems);
  const [isUpdating, setIsUpdating] = useState(false);
  const previousItemsRef = useRef<T[]>([]);

  const setItemsExternal = useCallback((newItems: T[]) => {
    setItems(newItems);
  }, []);

  const addOptimistic = useCallback(async (
    newItem: T,
    asyncAdd: () => Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    setIsUpdating(true);
    previousItemsRef.current = [...items];

    // Optimistically add
    setItems(prev => [newItem, ...prev]);

    try {
      const result = await asyncAdd();
      // Replace temp item with real one
      setItems(prev => prev.map(item => item.id === newItem.id ? result : item));
      
      if (options?.successMessage) {
        showSuccess(options.successMessage);
      }
      return result;
    } catch (error) {
      // Rollback
      setItems(previousItemsRef.current);
      showError(options?.errorMessage || 'Error al agregar', {
        onRetry: () => addOptimistic(newItem, asyncAdd, options),
      });
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [items]);

  const updateOptimistic = useCallback(async (
    itemId: string,
    updates: Partial<T>,
    asyncUpdate: () => Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    setIsUpdating(true);
    previousItemsRef.current = [...items];

    // Optimistically update
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    ));

    try {
      const result = await asyncUpdate();
      setItems(prev => prev.map(item => item.id === itemId ? result : item));
      
      if (options?.successMessage) {
        showSuccess(options.successMessage);
      }
      return result;
    } catch (error) {
      // Rollback
      setItems(previousItemsRef.current);
      showError(options?.errorMessage || 'Error al actualizar', {
        onRetry: () => updateOptimistic(itemId, updates, asyncUpdate, options),
      });
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [items]);

  const deleteOptimistic = useCallback(async (
    itemId: string,
    asyncDelete: () => Promise<void>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => {
    setIsUpdating(true);
    previousItemsRef.current = [...items];

    // Optimistically remove
    setItems(prev => prev.filter(item => item.id !== itemId));

    try {
      await asyncDelete();
      
      if (options?.successMessage) {
        showSuccess(options.successMessage);
      }
      return true;
    } catch (error) {
      // Rollback
      setItems(previousItemsRef.current);
      showError(options?.errorMessage || 'Error al eliminar', {
        onRetry: () => deleteOptimistic(itemId, asyncDelete, options),
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [items]);

  return {
    items,
    setItems: setItemsExternal,
    isUpdating,
    addOptimistic,
    updateOptimistic,
    deleteOptimistic,
  };
}
