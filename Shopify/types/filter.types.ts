// Filter-related types

export interface BaseProductFilters {
  collection: string;
  minPrice: number;
  maxPrice: number;
}

export interface DiamondFilters extends BaseProductFilters {
  shape: string;
  minCarat: number;
  maxCarat: number;
  minCut: number;
  maxCut: number;
  minColor: number;
  maxColor: number;
  minClarity: number;
  maxClarity: number;
}

export interface JewelryFilters extends BaseProductFilters {
  category: string;
  material: string;
  style: string;
}

