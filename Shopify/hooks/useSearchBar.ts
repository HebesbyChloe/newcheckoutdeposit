'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/product';
import { apiClient } from '@/services/api-client';

export interface UseSearchBarReturn {
  query: string;
  results: Product[];
  loading: boolean;
  isOpen: boolean;
  selectedIndex: number;
  inputRef: React.RefObject<HTMLInputElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  setQuery: (query: string) => void;
  setIsOpen: (open: boolean) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleFocus: () => void;
  handleClear: () => void;
  handleSelect: () => void;
}

export function useSearchBar(): UseSearchBarReturn {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get<{ products: Product[] }>(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );
      
      if (response.error) {
        setResults([]);
      } else {
        setResults(response.data?.products || []);
      }
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle input change with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setLoading(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < results.length - 1 ? prev + 1 : prev
      );
      setIsOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        router.push(`/products/${results[selectedIndex].handle}`);
        setIsOpen(false);
      } else if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query)}`);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  }, [results, selectedIndex, query, router]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  const handleSelect = useCallback(() => {
    setIsOpen(false);
    setSelectedIndex(-1);
  }, []);

  return {
    query,
    results,
    loading,
    isOpen,
    selectedIndex,
    inputRef,
    containerRef,
    setQuery,
    setIsOpen,
    handleKeyDown,
    handleFocus,
    handleClear,
    handleSelect,
  };
}

