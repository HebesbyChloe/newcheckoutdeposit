// Hook for managing view mode (grid/table)
import { useState, useCallback } from 'react';
import { UseViewModeReturn } from '@/types/hook.types';

export function useViewMode(initialMode: 'grid' | 'table' = 'grid'): UseViewModeReturn {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(initialMode);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'grid' ? 'table' : 'grid'));
  }, []);

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
  };
}

