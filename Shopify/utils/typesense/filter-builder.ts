// Filter builder for Typesense filter_by syntax
import { DiamondFilters } from '@/types/filter.types';

// Grade arrays matching the diamond filter structure
const cutGrades = ['Fair', 'Good', 'Very Good', 'Ideal', 'Super Ideal'];
const colorGrades = ['J', 'I', 'H', 'G', 'F', 'E', 'D'];
const clarityGrades = ['SI2', 'SI1', 'VS2', 'VS1', 'VVS2', 'VVS1', 'IF', 'FL'];

/**
 * Build Typesense filter_by string from DiamondFilters
 * Converts filter state to Typesense-compatible filter expressions
 */
export function buildTypesenseFilter(filters: DiamondFilters): string | undefined {
  const filterExpressions: string[] = [];

  // Carat range filter
  // Only apply if not at defaults (0.25 to 18.06)
  if (filters.minCarat !== undefined && filters.maxCarat !== undefined) {
    const defaultMin = 0.25;
    const defaultMax = 18.06;
    
    if (filters.minCarat !== defaultMin || filters.maxCarat !== defaultMax) {
      // Typesense numeric range: carat:>X && carat:<Y
      if (filters.minCarat > defaultMin) {
        filterExpressions.push(`carat:>${filters.minCarat}`);
      }
      if (filters.maxCarat < defaultMax) {
        filterExpressions.push(`carat:<${filters.maxCarat}`);
      }
    }
  }

  // Price range filter (uses total_price field in Typesense)
  // Only apply if not at defaults (0 to 10000000)
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    const defaultMin = 0;
    const defaultMax = 10000000;
    
    if (filters.minPrice !== defaultMin || filters.maxPrice !== defaultMax) {
      if (filters.minPrice > defaultMin) {
        filterExpressions.push(`total_price:>${filters.minPrice}`);
      }
      if (filters.maxPrice < defaultMax) {
        filterExpressions.push(`total_price:<${filters.maxPrice}`);
      }
    }
  }

  // Color range filter
  // Convert index range to array of color grades
  if (filters.minColor !== undefined && filters.maxColor !== undefined) {
    const defaultMin = 0;
    const defaultMax = colorGrades.length - 1;
    
    if (filters.minColor !== defaultMin || filters.maxColor !== defaultMax) {
      // Get selected colors in range (inclusive)
      const selectedColors = colorGrades.slice(
        filters.minColor,
        filters.maxColor + 1
      );
      
      if (selectedColors.length > 0) {
        // Typesense array filter: color:=['D','E','F']
        const colorArray = selectedColors.map(c => `'${c}'`).join(',');
        filterExpressions.push(`color:=[${colorArray}]`);
      }
    }
  }

  // Clarity range filter
  // Convert index range to array of clarity grades
  if (filters.minClarity !== undefined && filters.maxClarity !== undefined) {
    const defaultMin = 0;
    const defaultMax = clarityGrades.length - 1;
    
    if (filters.minClarity !== defaultMin || filters.maxClarity !== defaultMax) {
      // Get selected clarities in range (inclusive)
      // Note: clarityGrades is ordered from lowest to highest (SI2 to FL)
      const selectedClarities = clarityGrades.slice(
        filters.minClarity,
        filters.maxClarity + 1
      );
      
      if (selectedClarities.length > 0) {
        // Typesense array filter: clarity:=['FL','IF','VVS1']
        const clarityArray = selectedClarities.map(c => `'${c}'`).join(',');
        filterExpressions.push(`clarity:=[${clarityArray}]`);
      }
    }
  }

  // Cut range filter
  // Convert index range to array of cut grades
  if (filters.minCut !== undefined && filters.maxCut !== undefined) {
    const defaultMin = 0;
    const defaultMax = cutGrades.length - 1;
    
    if (filters.minCut !== defaultMin || filters.maxCut !== defaultMax) {
      // Get selected cut grades in range (inclusive)
      const selectedCuts = cutGrades.slice(
        filters.minCut,
        filters.maxCut + 1
      );
      
      if (selectedCuts.length > 0) {
        // Typesense array filter: cut_grade:=['Super Ideal','Ideal']
        // Note: Typesense field might be 'cut' or 'cut_grade', adjust as needed
        const cutArray = selectedCuts.map(c => `'${c}'`).join(',');
        filterExpressions.push(`cut_grade:=[${cutArray}]`);
      }
    }
  }

  // Shape filter
  // Map shape to cut field in Typesense (if available)
  if (filters.shape) {
    // Typesense single value filter: cut:='Round'
    // Escape single quotes in shape name if needed
    const escapedShape = filters.shape.replace(/'/g, "\\'");
    filterExpressions.push(`cut:='${escapedShape}'`);
  }

  // Combine all filter expressions with &&
  if (filterExpressions.length === 0) {
    return undefined;
  }

  return filterExpressions.join(' && ');
}

/**
 * URL encode filter_by string for use in query parameters
 * This ensures special characters are properly encoded
 */
export function encodeFilterBy(filterBy: string | undefined): string | undefined {
  if (!filterBy) return undefined;
  
  // Typesense filter_by expressions may contain special characters
  // that need to be URL encoded when used in query strings
  return encodeURIComponent(filterBy);
}
