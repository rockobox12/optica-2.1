import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Phone, Mail, ShoppingBag, Plus, Clock, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SearchResult {
  id: string;
  type: 'customer' | 'product';
  name: string;
  subtitle?: string;
  phone?: string;
  email?: string;
  code?: string;
  imageUrl?: string;
  lastPurchase?: string;
  price?: number;
  stock?: number;
  metadata?: Record<string, any>;
}

interface EnhancedSearchProps {
  placeholder?: string;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelect: (result: SearchResult) => void;
  onCreateNew?: () => void;
  isLoading?: boolean;
  minChars?: number;
  maxResults?: number;
  debounceMs?: number;
  recentSearchesKey?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const RECENT_SEARCHES_COUNT = 5;

// Highlight matching text
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-warning/30 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function EnhancedSearch({
  placeholder = 'Buscar...',
  onSearch,
  onSelect,
  onCreateNew,
  isLoading: externalLoading,
  minChars = 2,
  maxResults = 10,
  debounceMs = 300,
  recentSearchesKey,
  className,
  disabled = false,
  autoFocus = false,
}: EnhancedSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const isLoading = externalLoading || isSearching;

  // Load recent searches from localStorage
  useEffect(() => {
    if (recentSearchesKey) {
      try {
        const stored = localStorage.getItem(`recent-search:${recentSearchesKey}`);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, [recentSearchesKey]);

  // Save recent search
  const saveRecentSearch = useCallback((result: SearchResult) => {
    if (!recentSearchesKey) return;
    
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.id !== result.id);
      const updated = [result, ...filtered].slice(0, RECENT_SEARCHES_COUNT);
      try {
        localStorage.setItem(`recent-search:${recentSearchesKey}`, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent search:', e);
      }
      return updated;
    });
  }, [recentSearchesKey]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    if (recentSearchesKey) {
      localStorage.removeItem(`recent-search:${recentSearchesKey}`);
      setRecentSearches([]);
    }
  }, [recentSearchesKey]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults.slice(0, maxResults));
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [onSearch, minChars, maxResults]);

  // Handle input change with debounce
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setIsOpen(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  // Handle selection
  const handleSelect = useCallback((result: SearchResult) => {
    saveRecentSearch(result);
    onSelect(result);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [onSelect, saveRecentSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = results.length > 0 ? results : (query.length < minChars ? recentSearches : []);
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          handleSelect(items[selectedIndex]);
        } else if (items.length > 0) {
          handleSelect(items[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  }, [results, recentSearches, selectedIndex, handleSelect, query.length, minChars]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Items to display
  const displayItems = useMemo(() => {
    if (query.length >= minChars) {
      return results;
    }
    return recentSearches;
  }, [query, minChars, results, recentSearches]);

  const showRecent = query.length < minChars && recentSearches.length > 0;
  const showEmpty = query.length >= minChars && !isLoading && results.length === 0;
  const showResults = displayItems.length > 0;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
        {!isLoading && query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (showResults || showEmpty || showRecent) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
          >
            {/* Recent searches header */}
            {showRecent && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Búsquedas recientes
                </span>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Limpiar
                </button>
              </div>
            )}

            {/* Results list */}
            {showResults && (
              <div className="max-h-[320px] overflow-y-auto">
                {displayItems.map((item, index) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleSelect(item)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 text-left transition-colors',
                      'hover:bg-muted/80 focus:bg-muted/80 focus:outline-none',
                      selectedIndex === index && 'bg-muted'
                    )}
                  >
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={item.imageUrl} />
                      <AvatarFallback className={cn(
                        'text-sm font-medium',
                        item.type === 'customer' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'
                      )}>
                        {item.type === 'customer' ? (
                          <User className="h-5 w-5" />
                        ) : (
                          item.name.slice(0, 2).toUpperCase()
                        )}
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        <HighlightText text={item.name} query={query} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        {item.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <HighlightText text={item.phone} query={query} />
                          </span>
                        )}
                        {item.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3" />
                            <HighlightText text={item.email} query={query} />
                          </span>
                        )}
                        {item.code && (
                          <span className="font-mono text-xs">
                            <HighlightText text={item.code} query={query} />
                          </span>
                        )}
                        {item.lastPurchase && (
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            {item.lastPurchase}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price / Stock for products */}
                    {item.type === 'product' && (
                      <div className="text-right shrink-0">
                        {item.price !== undefined && (
                          <div className="font-semibold text-primary">
                            ${item.price.toLocaleString('es-MX')}
                          </div>
                        )}
                        {item.stock !== undefined && (
                          <Badge variant={item.stock > 0 ? 'secondary' : 'destructive'} className="text-xs">
                            {item.stock > 0 ? `${item.stock} disp.` : 'Sin stock'}
                          </Badge>
                        )}
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {showEmpty && (
              <div className="p-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Sin resultados
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  No encontramos "{query}"
                </p>
                {onCreateNew && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onCreateNew();
                      setIsOpen(false);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Crear nuevo
                  </Button>
                )}
              </div>
            )}

            {/* Keyboard hints */}
            {showResults && (
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t text-[10px] text-muted-foreground">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd> navegar
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd> seleccionar
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd> cerrar
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
