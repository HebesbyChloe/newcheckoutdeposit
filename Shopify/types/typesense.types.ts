// Typesense API response types

/**
 * Raw document structure from Typesense external_feed collection
 */
export interface TypesenseDiamondDocument {
    id: string;
    'Item ID #': string;
    Carat: string | number;
    Color: string;
    Clarity: string;
    Cut?: string;
    'Price Per Carat'?: number;
    'Total Price': number;
    updated_at: number;
    [key: string]: any; // Allow additional fields from raw document
  }
  
  /**
   * Single hit from Typesense search response
   */
  export interface TypesenseHit {
    id: string;
    itemId: string;
    carat: string | number;
    color: string;
    clarity: string;
    cut?: string; // Shape (Round, Oval, etc.)
    cutGrade?: string; // Cut grade/quality (Fair, Good, Ideal, etc.)
    pricePerCarat?: number;
    totalPrice: number;
    updatedAt: number;
    raw: TypesenseDiamondDocument;
  }
  
  /**
   * Typesense search response structure
   */
  export interface TypesenseSearchResponse {
    total: number;
    page: number;
    per_page: number;
    hits: TypesenseHit[];
  }
  
  /**
   * Search parameters for Typesense API
   */
  export interface TypesenseSearchParams {
    q?: string;
    query_by?: string;
    per_page?: number;
    page?: number;
    sort_by?: string;
    filter_by?: string;
  }
  