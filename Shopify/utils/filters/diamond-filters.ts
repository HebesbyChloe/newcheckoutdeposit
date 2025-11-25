// Diamond-specific filtering utilities
import { Product } from '@/types/product';
import { DiamondFilters } from '@/types/filter.types';
import { getDiamondSpecs } from '@/types/product';
import { filterByCollection, filterByPriceRange } from './product-filters';

const cutGrades = ['Fair', 'Good', 'Very Good', 'Ideal', 'Super Ideal'];
const colorGrades = ['J', 'I', 'H', 'G', 'F', 'E', 'D'];
const clarityGrades = ['SI2', 'SI1', 'VS2', 'VS1', 'VVS2', 'VVS1', 'IF', 'FL'];

/**
 * Filter diamonds by shape
 */
export function filterByShape(products: Product[], shape: string): Product[] {
  if (!shape) return products;

  return products.filter((product) => {
    const specs = getDiamondSpecs(product);
    return specs.shape.toLowerCase() === shape.toLowerCase();
  });
}

/**
 * Filter diamonds by carat range
 */
export function filterByCaratRange(
  products: Product[],
  minCarat: number,
  maxCarat: number,
  defaultMin: number = 0.25,
  defaultMax: number = 18.06
): Product[] {
  // Only apply filter if user has changed from defaults
  if (minCarat === defaultMin && maxCarat === defaultMax) {
    return products;
  }

  return products.filter((product) => {
    const specs = getDiamondSpecs(product);
    if (specs.carat === 0) return true; // Include if no carat info
    return specs.carat >= minCarat && specs.carat <= maxCarat;
  });
}

/**
 * Filter diamonds by cut grade range
 */
export function filterByCutRange(
  products: Product[],
  minCut: number,
  maxCut: number
): Product[] {
  if (minCut === 0 && maxCut === cutGrades.length - 1) {
    return products;
  }

  return products.filter((product) => {
    const specs = getDiamondSpecs(product);
    if (!specs.cut) return true; // Include if no cut info
    const productCutIndex = cutGrades.indexOf(specs.cut);
    return productCutIndex >= minCut && productCutIndex <= maxCut;
  });
}

/**
 * Filter diamonds by color grade range
 */
export function filterByColorRange(
  products: Product[],
  minColor: number,
  maxColor: number
): Product[] {
  if (minColor === 0 && maxColor === colorGrades.length - 1) {
    return products;
  }

  return products.filter((product) => {
    const specs = getDiamondSpecs(product);
    if (!specs.color) return true; // Include if no color info
    const productColorIndex = colorGrades.indexOf(specs.color);
    return productColorIndex >= minColor && productColorIndex <= maxColor;
  });
}

/**
 * Filter diamonds by clarity grade range
 */
export function filterByClarityRange(
  products: Product[],
  minClarity: number,
  maxClarity: number
): Product[] {
  if (minClarity === 0 && maxClarity === clarityGrades.length - 1) {
    return products;
  }

  return products.filter((product) => {
    const specs = getDiamondSpecs(product);
    if (!specs.clarity) return true; // Include if no clarity info
    const productClarityIndex = clarityGrades.indexOf(specs.clarity);
    return productClarityIndex >= minClarity && productClarityIndex <= maxClarity;
  });
}

/**
 * Apply all diamond filters
 */
export function applyDiamondFilters(
  products: Product[],
  filters: DiamondFilters
): Product[] {
  let filtered = [...products];

  // Apply filters in order
  if (filters.collection) {
    filtered = filterByCollection(filtered, filters.collection);
  }

  if (filters.shape) {
    filtered = filterByShape(filtered, filters.shape);
  }

  if (filters.minPrice !== 0 || filters.maxPrice !== 10000000) {
    filtered = filterByPriceRange(
      filtered,
      filters.minPrice,
      filters.maxPrice
    );
  }

  if (filters.minCarat !== 0.25 || filters.maxCarat !== 18.06) {
    filtered = filterByCaratRange(
      filtered,
      filters.minCarat,
      filters.maxCarat
    );
  }

  if (filters.minCut !== undefined && filters.maxCut !== undefined) {
    filtered = filterByCutRange(filtered, filters.minCut, filters.maxCut);
  }

  if (filters.minColor !== undefined && filters.maxColor !== undefined) {
    filtered = filterByColorRange(filtered, filters.minColor, filters.maxColor);
  }

  if (filters.minClarity !== undefined && filters.maxClarity !== undefined) {
    filtered = filterByClarityRange(
      filtered,
      filters.minClarity,
      filters.maxClarity
    );
  }

  return filtered;
}


