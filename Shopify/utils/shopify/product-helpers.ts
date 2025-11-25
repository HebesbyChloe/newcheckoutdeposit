// Helper functions for working with Shopify Product data
import type { Product, Metafield } from '@/types/product';

// Helper function to parse metafield value (handles JSON strings like "[\"D\"]" or "[\"Round\"]")
function parseMetafieldValue(value: string | null): string {
  if (!value) return '';
  
  // Trim whitespace
  const trimmed = value.trim();
  if (!trimmed) return '';
  
  // Try to parse as JSON (handles cases like "[\"D\"]" or "[\"Round\"]")
  try {
    const parsed = JSON.parse(trimmed);
    // If it's an array, get the first element
    if (Array.isArray(parsed)) {
      if (parsed.length > 0) {
        return String(parsed[0]).trim();
      }
      return ''; // Empty array
    }
    // If it's already a string or number, return it
    return String(parsed).trim();
  } catch {
    // If parsing fails, check if it looks like a JSON array string (e.g., '["Round"]')
    // Try removing outer brackets if present
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        // Remove brackets and try to parse the content
        const inner = trimmed.slice(1, -1).trim();
        if (inner.startsWith('"') && inner.endsWith('"')) {
          // Remove quotes
          return inner.slice(1, -1).trim();
        }
        // Try parsing the inner content
        const parsed = JSON.parse(inner);
        return String(parsed).trim();
      } catch {
        // Fall through to return original value
      }
    }
    // If parsing fails, it's already a plain string, return as-is
    return trimmed;
  }
}

/**
 * Get metafield value from product
 */
export function getMetafield(product: Product, namespace: string, key: string): string | null {
  if (!product.metafields) {
    return null;
  }
  
  // Handle both response structures: direct array (identifiers) or edges/node (first: N)
  let metafieldsArray: Metafield[] = [];
  
  if (Array.isArray(product.metafields)) {
    // Direct array structure (from identifiers query)
    // Filter out null values (Shopify returns null for missing identifiers)
    metafieldsArray = product.metafields.filter((m): m is Metafield => m !== null && m !== undefined);
  } else if (product.metafields.edges) {
    // Edges/node structure (from first: N query)
    // Filter out null nodes (Shopify returns null for missing identifiers)
    metafieldsArray = product.metafields.edges
      .map(edge => edge.node)
      .filter((m): m is Metafield => m !== null && m !== undefined);
  } else {
    return null;
  }
  
  const metafield = metafieldsArray.find(
    (m) => m.namespace === namespace && m.key === key
  );
  
  if (!metafield?.value) return null;

  // Special case: _raw_document should return the raw JSON string,
  // not a parsed/flattened value, so downstream code can JSON.parse it.
  if (key === '_raw_document') {
    return metafield.value;
  }
  
  // Parse the value to handle JSON strings
  return parseMetafieldValue(metafield.value);
}

/**
 * Get product origin from collections
 * Checks both collection handles and titles for maximum compatibility
 */
export function getProductOrigin(product: Product): 'natural' | 'lab' | null {
  if (!product.collections?.edges || product.collections.edges.length === 0) return null;
  
  // Check all collections for matches
  for (const edge of product.collections.edges) {
    const title = edge.node.title.toLowerCase().trim();
    const handle = edge.node.handle.toLowerCase().trim();
    
    // Check for natural diamonds (by handle)
    if (handle.includes('natural') && (handle.includes('diamond') || handle.includes('diamonds'))) {
      return 'natural';
    }
    
    // Check for lab grown diamonds (by handle)
    if ((handle.includes('lab') || handle.includes('lab-grown') || handle.includes('labgrown')) && 
        (handle.includes('diamond') || handle.includes('diamonds'))) {
      return 'lab';
    }
    
    // Check for natural diamonds (by title)
    if (title.includes('natural') && (title.includes('diamond') || title.includes('diamonds'))) {
      return 'natural';
    }
    
    // Check for lab grown diamonds (by title)
    if ((title.includes('lab') || title.includes('lab-grown') || title.includes('lab grown') || title.includes('labgrown')) && 
        (title.includes('diamond') || title.includes('diamonds'))) {
      return 'lab';
    }
  }
  
  return null;
}

// Helper function to get all metafields for debugging
export function getAllMetafields(product: Product): Array<{namespace: string, key: string, value: string}> {
  if (!product.metafields) return [];
  
  // Handle both response structures: direct array (identifiers) or edges/node (first: N)
  if (Array.isArray(product.metafields)) {
    // Direct array structure (from identifiers query)
    // Filter out null values
    return product.metafields
      .filter((m): m is Metafield => m !== null && m !== undefined)
      .map(m => ({
        namespace: m.namespace,
        key: m.key,
        value: m.value
      }));
  } else if ('edges' in product.metafields && product.metafields.edges) {
    // Edges/node structure (from first: N query)
    // Filter out null nodes
    return product.metafields.edges
      .map((edge: { node: Metafield | null }) => edge.node)
      .filter((m): m is Metafield => m !== null && m !== undefined)
      .map(m => ({
        namespace: m.namespace,
        key: m.key,
        value: m.value
      }));
  }
  
  return [];
}

// Helper function to find metafield by partial key match (case-insensitive)
function findMetafieldByKey(product: Product, namespace: string, possibleKeys: string[]): string | null {
  if (!product.metafields) return null;
  
  // Handle both response structures
  let metafieldsArray: Metafield[] = [];
  if (Array.isArray(product.metafields)) {
    // Filter out null values
    metafieldsArray = product.metafields.filter((m): m is Metafield => m !== null && m !== undefined);
  } else if ('edges' in product.metafields && product.metafields.edges) {
    // Filter out null nodes
    metafieldsArray = product.metafields.edges
      .map((edge: { node: Metafield | null }) => edge.node)
      .filter((m): m is Metafield => m !== null && m !== undefined);
  } else {
    return null;
  }
  
  const lowerKeys = possibleKeys.map(k => k.toLowerCase());
  const metafield = metafieldsArray.find(m => {
    if (m.namespace !== namespace) return false;
    const keyLower = m.key.toLowerCase();
    return lowerKeys.some(lk => keyLower === lk || keyLower.includes(lk) || lk.includes(keyLower));
  });
  
  return metafield?.value || null;
}

/**
 * Get diamond specifications from product metafields
 */
export function getDiamondSpecs(product: Product) {
  // Support both Shopify (custom) and external feed (external) namespaces
  // Format: custom.key or external.key (e.g., custom.shape, external.shape)
  
  // Helper to try both namespaces
  const getField = (key: string, altKey?: string): string => {
    return getMetafield(product, 'external', key) || 
           getMetafield(product, 'custom', key) ||
           (altKey ? (getMetafield(product, 'external', altKey) || getMetafield(product, 'custom', altKey)) : '') ||
           '';
  };
  
  // Shape - try external first, then custom
  const shapeRaw = getField('shape');
  const shape = shapeRaw || '';
  
  // Carat - try external first, then custom, with fallbacks
  const caratValue = getField('carat', 'diamond_carat') || '0';
  const carat = parseFloat(caratValue) || 0;
  
  // Cut Grade - try external first, then custom
  const cut = getField('cut_grade');
  
  // Color - try external first, then custom, with fallbacks
  const color = getField('color', 'diamond_color');
  
  // Clarity - try external first, then custom
  const clarity = getField('clarity');
  
  // Grading Lab - try external first, then custom, with multiple fallbacks
  const gradingLab = getMetafield(product, 'external', 'grading_lab') || 
                     getMetafield(product, 'custom', 'grading_lab') ||
                     getMetafield(product, 'external', 'grading-lab') ||
                     getMetafield(product, 'custom', 'grading-lab') ||
                     getMetafield(product, 'external', 'gradingLab') ||
                     getMetafield(product, 'custom', 'gradingLab') ||
                     getMetafield(product, 'external', 'certification') ||
                     getMetafield(product, 'custom', 'certification') ||
                     '';
  
  const specs = {
    shape,
    carat,
    cut,
    color,
    clarity,
    gradingLab,
    origin: getProductOrigin(product) || 'natural',
  };
  
  return specs;
}
