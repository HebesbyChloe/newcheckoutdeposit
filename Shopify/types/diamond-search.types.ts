// Types for diamond search API response

export interface DiamondSearchHit {
  id: string;
  item_id: string;
  color: string;
  clarity: string;
  cut: string;
  fluorescence_intensity?: string;
  state_region?: string;
  country?: string;
  grading_lab?: string;
  certificate_number?: string;
  carat: number;
  price: number;
  price_per_carat: number;
  total_price: number;
  updated_at: number;
  image_available: boolean;
  video_available: boolean;
  certificate_available: boolean;
  raw: Record<string, any>;
}

export interface DiamondSearchResponse {
  feed?: string;
  total: number;
  page: number;
  per_page: number;
  hits: DiamondSearchHit[];
}

export interface DiamondSearchFilters {
  // String filters
  color?: string[];
  clarity?: string[];
  cut?: string[];
  grading_lab?: string[];
  country?: string[];
  state_region?: string[];
  
  // Numeric ranges
  carat?: { min?: number; max?: number };
  price?: { min?: number; max?: number };
  price_per_carat?: { min?: number; max?: number };
  
  // Boolean
  image_available?: boolean;
  video_available?: boolean;
  certificate_available?: boolean;
}

