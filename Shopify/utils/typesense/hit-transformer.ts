/**
 * Hit Transformation Utilities
 * Standardize transformation of Typesense hits for matching and processing
 */

/**
 * Normalized hit structure for matching
 */
export interface TransformedHit {
    id: string;
    itemId: string;
    carat: number;
    color: string;
    clarity: string;
    cut: string;
    pricePerCarat: number;
    totalPrice: number;
    updatedAt: number;
    raw: Record<string, unknown>;
  }
  
  /**
   * Extract itemId from various possible field locations in a hit
   * Handles different field name formats (with/without spaces, camelCase, snake_case)
   * 
   * @param hit - Raw hit object from Typesense
   * @returns Normalized itemId string
   */
  export function normalizeHitItemId(hit: {
    id?: string;
    itemId?: string;
    item_id?: string;
    raw?: Record<string, unknown>;
    [key: string]: unknown;
  }): string {
    // Check normalized fields first
    const hitItemId = String(hit.itemId || hit.item_id || hit.id || '').trim();
    
    if (hitItemId) {
      return hitItemId;
    }
    
    // Check raw document for various field name formats
    if (hit.raw) {
      const rawItemId = String(
        hit.raw['Item ID #'] || 
        hit.raw.itemId || 
        hit.raw.id || 
        hit.raw['item_id'] ||
        hit.raw['﻿Item ID'] || // Check for BOM character
        ''
      ).trim();
      
      if (rawItemId) {
        return rawItemId;
      }
    }
    
    // Fallback to top-level id
    return String(hit.id || '').trim();
  }
  
  /**
   * Transform a raw hit to standardized structure
   * 
   * @param hit - Raw hit object from Typesense gateway
   * @returns Transformed hit with normalized fields
   */
  export function transformHitToSearchResult(hit: {
    id?: string;
    itemId?: string;
    item_id?: string;
    carat?: number | string;
    color?: string;
    clarity?: string;
    cut?: string;
    shape?: string;
    pricePerCarat?: number;
    price_per_carat?: number;
    totalPrice?: number;
    total_price?: number;
    updatedAt?: number;
    updated_at?: number;
    raw?: Record<string, unknown>;
    [key: string]: unknown;
  }): TransformedHit {
    const raw = hit.raw || hit;
    
    return {
      id: String(hit.id || hit.itemId || hit.item_id || hit.raw?.['Item ID #'] || hit.raw?.id || ''),
      itemId: normalizeHitItemId(hit),
      carat: typeof hit.carat === 'number' ? hit.carat : parseFloat(String(hit.carat || raw.Carat || 0)),
      color: String(hit.color || raw.Color || ''),
      clarity: String(hit.clarity || raw.Clarity || ''),
      cut: String(hit.cut || raw.Cut || raw.Shape || ''),
      pricePerCarat: typeof hit.pricePerCarat === 'number' 
        ? hit.pricePerCarat 
        : (typeof hit.price_per_carat === 'number' 
          ? hit.price_per_carat 
          : parseFloat(String(hit.price_per_carat || raw['Price Per Carat'] || 0))),
      totalPrice: typeof hit.totalPrice === 'number' 
        ? hit.totalPrice 
        : (typeof hit.total_price === 'number' 
          ? hit.total_price 
          : parseFloat(String(hit.total_price || raw['Total Price'] || 0))),
      updatedAt: typeof hit.updatedAt === 'number' 
        ? hit.updatedAt 
        : (typeof hit.updated_at === 'number' 
          ? hit.updated_at 
          : (typeof raw.updated_at === 'number' ? raw.updated_at : Date.now())),
      raw: raw as Record<string, unknown>,
    };
  }
  
  /**
   * Find exact match for itemId in array of transformed hits
   * 
   * @param hits - Array of transformed hits
   * @param itemId - Item ID to match
   * @returns Matching hit or null
   */
  export function findExactMatch(hits: TransformedHit[], itemId: string): TransformedHit | null {
    const requestedItemId = String(itemId).trim();
    
    if (!requestedItemId) {
      return null;
    }
    
    return hits.find((hit) => {
      // Primary check: use normalized itemId (should be correct from transformHitToSearchResult)
      const hitItemId = String(hit.itemId || '').trim();
      if (hitItemId === requestedItemId) return true;
      
      // Fallback check: also check id field
      const hitId = String(hit.id || '').trim();
      if (hitId === requestedItemId) return true;
      
      // Defense in depth: if normalization somehow failed, check raw document directly
      // This handles edge cases where the gateway returns unexpected structures
      if (hit.raw) {
        const rawItemId = String(
          hit.raw['Item ID #'] || 
          hit.raw.itemId || 
          hit.raw.id || 
          hit.raw['item_id'] ||
          ''
        ).trim();
        
        if (rawItemId === requestedItemId) return true;
      }
      
      return false;
    }) || null;
  }
  