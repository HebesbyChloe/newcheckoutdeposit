// Utility functions for external products
import { Product } from '@/types/product';
import { getMetafield } from '@/types/product';
import type { DiamondDetailData, DiamondDetailSpecs } from '@/types/external-cart.types';

/**
 * Check if a product is an external product (from Typesense)
 */
export function isExternalProduct(product: Product): boolean {
  // External products have IDs starting with "external-"
  if (product.id?.startsWith('external-')) {
    return true;
  }
  
  // Or check for external metafields
  const hasExternalMetafield = getMetafield(product, 'external', '_raw_document');
  if (hasExternalMetafield) {
    return true;
  }
  
  return false;
}

/**
 * Extract itemId from external product
 */
export function getExternalItemId(product: Product): string | null {
  if (!isExternalProduct(product)) {
    return null;
  }
  
  // Extract from ID: "external-diamond-{itemId}"
  if (product.id?.startsWith('external-diamond-')) {
    return product.id.replace('external-diamond-', '');
  }
  
  // Extract from handle: "diamond-{itemId}"
  if (product.handle?.startsWith('diamond-')) {
    return product.handle.replace('diamond-', '');
  }
  
  // Try to get from metafields
  const rawDoc = getMetafield(product, 'external', '_raw_document');
  if (rawDoc) {
    try {
      const parsed = typeof rawDoc === 'string' ? JSON.parse(rawDoc) : rawDoc;
      return parsed.itemId || parsed['Item ID #'] || parsed.item_id || null;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Get source type from product or default to labgrown
 */
export function getExternalSourceType(product: Product, defaultCollection: 'natural' | 'labgrown' = 'labgrown'): 'labgrown' | 'natural' | 'moissanite' | 'coloredstone' | 'custom' {
  // Check metafield first
  const sourceType = getMetafield(product, 'external', 'source_type');
  if (sourceType && typeof sourceType === 'string') {
    const validTypes: Array<'labgrown' | 'natural' | 'moissanite' | 'coloredstone' | 'custom'> = 
      ['labgrown', 'natural', 'moissanite', 'coloredstone', 'custom'];
    if (validTypes.includes(sourceType as any)) {
      return sourceType as any;
    }
  }
  
  // Check raw document
  const rawDoc = getMetafield(product, 'external', '_raw_document');
  if (rawDoc) {
    try {
      const parsed = typeof rawDoc === 'string' ? JSON.parse(rawDoc) : rawDoc;
      if (parsed.source_type) {
        return parsed.source_type;
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  // Default based on collection (natural vs labgrown)
  return defaultCollection;
}

/**
 * Get external product payload from metafields
 * Tries both 'external' and 'custom' namespaces for compatibility
 * Constructs payload from individual metafields if _raw_document doesn't exist
 */
export function getExternalProductPayload(product: Product): Record<string, any> | undefined {
  // Try 'external' namespace first (original)
  let rawDoc = getMetafield(product, 'external', '_raw_document');
  
  // If not found, try 'custom' namespace (new)
  if (!rawDoc) {
    rawDoc = getMetafield(product, 'custom', '_raw_document');
  }
  
  // If raw document exists, parse and return it
  if (rawDoc) {
    try {
      return typeof rawDoc === 'string' ? JSON.parse(rawDoc) : rawDoc;
    } catch {
      // If parsing fails, fall through to construct from individual metafields
    }
  }
  
  // If no raw document, construct payload from individual metafields and product data
  if (product.metafields) {
    const payload: Record<string, any> = {};
    
    // Get diamond specs from product
    if (product.title) payload.title = product.title;
    if (product.priceRange?.minVariantPrice?.amount) {
      payload.price = product.priceRange.minVariantPrice.amount;
    }
    
    // Get image URL from product images if available
    const productImage = product.images?.edges?.[0]?.node?.url;
    if (productImage) {
      payload.image_url = productImage;
      payload.imageUrl = productImage;
    }
    
    // Extract from metafields (both 'external' and 'custom' namespaces)
    const metafields = Array.isArray(product.metafields) 
      ? product.metafields 
      : product.metafields.edges?.map((e: any) => e.node) || [];
    
    for (const mf of metafields) {
      if (mf.namespace === 'custom' || mf.namespace === 'external') {
        // Map metafield keys to payload keys
        const key = mf.key;
        const value = mf.value;
        
        // Include all relevant diamond fields
        if (key === 'carat' || key === 'Carat') {
          payload.carat = value;
        } else if (key === 'color' || key === 'Color') {
          payload.color = value;
        } else if (key === 'clarity' || key === 'Clarity') {
          payload.clarity = value;
        } else if (key === 'cut_grade' || key === 'cutGrade' || key === 'Cut Grade' || key === 'Cut_Grade') {
          payload.cut_grade = value;
          payload.cutGrade = value; // Also include camelCase version
        } else if (key === 'cut' || key === 'Cut') {
          payload.cut = value;
        } else if (key === 'certificate_type' || key === 'certificateType' || key === 'Certificate Type' || key === 'grading_lab' || key === 'Grading Lab') {
          payload.certificate_type = value;
          payload.certificateType = value;
        } else if (key === 'certificate_number' || key === 'certificateNumber' || key === 'Certificate Number' || key === 'certificate_no') {
          payload.certificate_number = value;
          payload.certificateNumber = value;
        } else if (key === 'item_id' || key === 'itemId' || key === 'Item ID #') {
          payload.item_id = value;
          payload.itemId = value;
        } else if (key === 'price_per_carat' || key === 'pricePerCarat') {
          payload.price_per_carat = value;
        } else if (key === 'total_price' || key === 'totalPrice') {
          payload.total_price = value;
        } else if (key === 'image_url' || key === 'imageUrl' || key === 'Image URL' || key === 'Image_Path' || key === 'image' || key === 'Image') {
          payload.image_url = value;
          payload.imageUrl = value;
        } else if (key === 'grading_lab' || key === 'Grading Lab' || key === 'Grading_Lab' || key === 'gradingLab') {
          payload.grading_lab = value;
          payload.gradingLab = value;
        }
      }
    }
    
    // If we have any data, return it
    if (Object.keys(payload).length > 0) {
      return payload;
    }
  }
  
  return undefined;
}

/**
 * Helper to safely read a field from a payload or its nested `raw` document,
 * trying common variations of the key (spaces, case, underscores).
 */
function getDiamondField(
  payload: Record<string, any> | undefined,
  keys: string[],
): string | undefined {
  if (!payload) return undefined;

  const raw = (payload as any).raw && typeof (payload as any).raw === 'object'
    ? (payload as any).raw
    : undefined;

  const candidates = [payload, raw].filter(Boolean) as Record<string, any>[];

  for (const source of candidates) {
    for (const key of keys) {
      const variants = [key, key.toLowerCase(), key.toUpperCase(), key.replace(/\s+/g, '_')];
      for (const variant of variants) {
        const value = source[variant];
        if (value !== undefined && value !== null && value !== '') {
          return String(value);
        }
      }
    }
  }

  return undefined;
}

/**
 * Map external diamond payload (Typesense/raw feed document) into UI-friendly
 * data for the DiamondDetail component.
 */
export function mapExternalDiamondToDetailProps(
  product: Product,
  payload?: Record<string, any>,
): DiamondDetailData {
  const safePayload = payload || getExternalProductPayload(product) || {};

  const id =
    getDiamondField(safePayload, ['id', 'item_id', 'Item ID #']) ||
    product.id ||
    '';

  const caratStr =
    getDiamondField(safePayload, ['carat', 'Carat']) || '';
  const carat = caratStr ? parseFloat(caratStr) : undefined;

  const shape =
    getDiamondField(safePayload, ['Shape', 'shape', 'Cut', 'cut']) || undefined;

  const color =
    getDiamondField(safePayload, [
      'Natural Fancy Color',
      'natural_fancy_color',
      'Color',
      'color',
    ]) || undefined;

  const intensity =
    getDiamondField(safePayload, [
      'Natural Fancy Color Intensity',
      'natural_fancy_color_intensity',
    ]) || undefined;

  const clarity =
    getDiamondField(safePayload, ['clarity', 'Clarity']) || undefined;

  const cut =
    getDiamondField(safePayload, ['cut', 'Cut']) || undefined;

  const totalPriceStr =
    getDiamondField(safePayload, [
      'price',
      'Price',
      'Total Price',
      'Total_Price',
      'total_price',
    ]) || product.priceRange?.minVariantPrice?.amount;

  const price = totalPriceStr ? parseFloat(totalPriceStr) : 0;

  // Prefer the image already chosen for the Product (works in cards/grid),
  // then fall back to raw document fields.
  const imageUrl =
    product.images?.edges?.[0]?.node?.url ||
    getDiamondField(safePayload, [
      'Image URL',
      'image_url',
      'imageUrl',
      'Image_Path',
      'Still Image URL',
    ]) ||
    '';

  const videoUrl =
    getDiamondField(safePayload, ['Video URL', 'video_url', 'videoUrl']) || undefined;

  const certificateNumber =
    getDiamondField(safePayload, [
      'certificate_number',
      'Certificate Number',
      'certificate_no',
      'Cert Number',
    ]) || undefined;

  const certificateUrl =
    getDiamondField(safePayload, [
      'Certificate URL',
      'certificate_url',
      'certificateUrl',
      'Certificate_Path',
      'Online Report URL',
    ]) || undefined;

  const lab =
    getDiamondField(safePayload, [
      'grading_lab',
      'Grading Lab',
      'Grading_Lab',
      'Lab',
      'certification',
    ]) || undefined;

  const countryCode =
    getDiamondField(safePayload, ['Country Code', 'country_code']) || undefined;

  const countryName =
    getDiamondField(safePayload, ['Country Name', 'Country', 'country']) || undefined;

  const measurementsCombined =
    getDiamondField(safePayload, ['Measurements']) || undefined;

  const measurementsLength =
    getDiamondField(safePayload, ['Measurements Length', 'Length']) || undefined;
  const measurementsWidth =
    getDiamondField(safePayload, ['Measurements Width', 'Width']) || undefined;
  const measurementsHeight =
    getDiamondField(safePayload, ['Measurements Height', 'Height']) || undefined;

  let measurements: string | undefined = measurementsCombined;
  if (!measurements && measurementsLength && measurementsWidth && measurementsHeight) {
    measurements = `${measurementsLength} x ${measurementsWidth} x ${measurementsHeight} mm`;
  }

  const depth =
    getDiamondField(safePayload, ['Depth %', 'Depth', 'depth']) || undefined;

  const table =
    getDiamondField(safePayload, ['Table %', 'Table', 'table']) || undefined;

  const polish =
    getDiamondField(safePayload, ['Polish', 'polish']) || undefined;

  const symmetry =
    getDiamondField(safePayload, ['Symmetry', 'symmetry']) || undefined;

  const fluorescence =
    getDiamondField(safePayload, ['Fluorescence', 'fluorescence_intensity']) ||
    undefined;

  const culet =
    getDiamondField(safePayload, ['Culet Condition', 'Culet']) || undefined;

  const crownAngle =
    getDiamondField(safePayload, ['Crown Angle']) || undefined;

  const crownHeight =
    getDiamondField(safePayload, ['Crown Height']) || undefined;

  const pavilionAngle =
    getDiamondField(safePayload, ['Pavilion Angle']) || undefined;

  const pavilionDepth =
    getDiamondField(safePayload, ['Pavilion Depth']) || undefined;

  const eyeClean =
    getDiamondField(safePayload, ['Eye Clean']) || undefined;

  const specs: DiamondDetailSpecs = {
    depth: depth ? `${depth}${depth.includes('%') ? '' : '%'}` : undefined,
    table: table ? `${table}${table.includes('%') ? '' : '%'}` : undefined,
    polish,
    symmetry,
    fluorescence,
    measurements,
    culet,
    crownAngle: crownAngle ? `${crownAngle}${crownAngle.includes('°') ? '' : '°'}` : undefined,
    crownHeight: crownHeight
      ? `${crownHeight}${crownHeight.includes('%') ? '' : '%'}`
      : undefined,
    pavilionAngle: pavilionAngle
      ? `${pavilionAngle}${pavilionAngle.includes('°') ? '' : '°'}`
      : undefined,
    pavilionDepth: pavilionDepth
      ? `${pavilionDepth}${pavilionDepth.includes('%') ? '' : '%'}`
      : undefined,
    eyeClean,
  };

  const shippingDate = (() => {
    const daysAhead = 5;
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  })();

  const titleParts: string[] = [];
  if (carat) titleParts.push(`${carat.toFixed(2)} Carat`);
  if (intensity) titleParts.push(intensity);
  if (color) titleParts.push(color);
  if (shape) titleParts.push(shape);
  titleParts.push('Diamond');

  const title = titleParts.join(' ');

  const diamondData: DiamondDetailData = {
    id,
    sku: id,
    title: title || product.title || 'Diamond',
    shape: shape || undefined,
    carat,
    color,
    intensity,
    clarity,
    cut,
    price,
    images: imageUrl ? [imageUrl] : [],
    video: videoUrl,
    certificateNumber,
    certificateUrl,
    lab,
    shippingDate,
    countryCode,
    countryName,
    specs,
  };

  return diamondData;
}

