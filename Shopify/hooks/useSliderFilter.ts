// Unified slider filter hook for range sliders (price, carat, etc.)
import { useCallback } from 'react';

export interface UseSliderFilterOptions {
  min: number;
  max: number;
  step: number;
  onValueChange: (min: number, max: number) => void;
}

export interface UseSliderFilterReturn {
  handleValueChange: (values: [number, number]) => void;
  getSortedValues: (values: [number, number]) => [number, number];
}

/**
 * Hook for handling range slider updates with atomic state updates
 * Prevents the double-update issue that breaks slider dragging
 */
export function useSliderFilter({
  min,
  max,
  step,
  onValueChange,
}: UseSliderFilterOptions): UseSliderFilterReturn {
  const getSortedValues = useCallback(
    (values: [number, number]): [number, number] => {
      const sortedMin = Math.min(values[0], values[1]);
      const sortedMax = Math.max(values[0], values[1]);
      return [
        Math.max(min, Math.min(sortedMin, max)),
        Math.min(max, Math.max(sortedMin, sortedMax)),
      ];
    },
    [min, max]
  );

  const handleValueChange = useCallback(
    (values: [number, number]) => {
      const [sortedMin, sortedMax] = getSortedValues(values);
      // Single atomic update - prevents slider breaking
      onValueChange(sortedMin, sortedMax);
    },
    [getSortedValues, onValueChange]
  );

  return {
    handleValueChange,
    getSortedValues,
  };
}

