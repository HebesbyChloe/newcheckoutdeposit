// Transform Typesense hits to Product format
import { Product } from '@/types/product';
import { TypesenseHit } from '@/types/typesense.types';

/**
 * Transform a single Typesense hit to Product format
 */
export function transformTypesenseHitToProduct(hit: TypesenseHit): Product {
  const itemId = hit.itemId || hit.id;
  const carat = typeof hit.carat === 'string' ? parseFloat(hit.carat) : hit.carat || 0;
  const totalPrice = hit.totalPrice || 0;
  const pricePerCarat = hit.pricePerCarat || (totalPrice && carat > 0 ? totalPrice / carat : 0);
  
  // Build title from diamond specs
  const title = `${carat}ct ${hit.cut || 'Round'} Diamond - ${hit.color || 'D'} ${hit.clarity || 'FL'}`;
  
  // Create handle from itemId
  const handle = `diamond-${itemId}`;
  
  // Create product ID
  const id = `external-diamond-${itemId}`;
  
  // Build description
  const description = `Premium ${carat}ct ${hit.cut || 'Round'} diamond. Color: ${hit.color || 'D'}, Clarity: ${hit.clarity || 'FL'}${hit.cutGrade ? `, Cut Grade: ${hit.cutGrade}` : ''}.`;
  
  // Create variant with price
  const variant = {
    id: `variant-${itemId}`,
    title: 'Default',
    price: {
      amount: String(totalPrice),
      currencyCode: 'USD',
    },
    availableForSale: true,
  };
  
  // Extract image URL from multiple possible locations
  // Try raw document first, then direct hit properties, then various field name variations
  // Common field names: image_url, imageUrl, Image URL, Image Path, image, Image, photo, Photo, picture, Picture
  const rawDoc = hit.raw || {};
  const imageUrl = 
    rawDoc.image_url || 
    rawDoc.imageUrl || 
    rawDoc['Image URL'] || 
    rawDoc['Image Path'] ||
    rawDoc.image ||
    rawDoc.Image ||
    rawDoc.photo ||
    rawDoc.Photo ||
    rawDoc.picture ||
    rawDoc.Picture ||
    rawDoc.still_image_url ||
    rawDoc.stillImageUrl ||
    rawDoc['Still Image URL'] ||
    (hit as any).image_url ||
    (hit as any).imageUrl ||
    (hit as any)['Image URL'] ||
    (hit as any)['Image Path'] ||
    (hit as any).image ||
    (hit as any).Image ||
    '';
  
  // Create product with metafields for external diamond data
  const product: Product = {
    id,
    title,
    handle,
    description,
    priceRange: {
      minVariantPrice: {
        amount: String(totalPrice),
        currencyCode: 'USD',
      },
    },
    images: imageUrl ? {
      edges: [{
        node: {
          url: imageUrl,
          altText: title,
        },
      }],
    } : {
      edges: [],
    },
    variants: {
      edges: [{
        node: variant,
      }],
    },
    metafields: {
      edges: [
        // Full raw document so detail pages can map ALL available fields,
        // mirroring the Figma DiamondDetail data mapping.
        {
          node: {
            namespace: 'external',
            key: '_raw_document',
            value: JSON.stringify(rawDoc),
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'item_id',
            value: String(itemId),
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'carat',
            value: String(carat),
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'color',
            value: hit.color || '',
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'clarity',
            value: hit.clarity || '',
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'cut',
            value: hit.cut || '',
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'cut_grade',
            value: hit.cutGrade || '',
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'price_per_carat',
            value: String(pricePerCarat),
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'total_price',
            value: String(totalPrice),
          },
        },
        {
          node: {
            namespace: 'external',
            key: 'updated_at',
            value: String(hit.updatedAt || Date.now()),
          },
        },
        // Add certificate URL if available
        ...(rawDoc.certificate_url ||
        rawDoc.certificateUrl ||
        rawDoc['Certificate URL'] ||
        rawDoc['Certificate Path']
          ? [
              {
                node: {
                  namespace: 'external',
                  key: 'certificate_url',
                  value:
                    rawDoc.certificate_url ||
                    rawDoc.certificateUrl ||
                    rawDoc['Certificate URL'] ||
                    rawDoc['Certificate Path'] ||
                    '',
                },
              },
            ]
          : []),
        // Add video URL if available
        ...(rawDoc.video_url || rawDoc.videoUrl || rawDoc['Video URL']
          ? [
              {
                node: {
                  namespace: 'external',
                  key: 'video_url',
                  value:
                    rawDoc.video_url ||
                    rawDoc.videoUrl ||
                    rawDoc['Video URL'] ||
                    '',
                },
              },
            ]
          : []),
      ],
    },
  };
  
  return product;
}

/**
 * Transform array of Typesense hits to Products
 */
export function transformTypesenseHitsToProducts(hits: TypesenseHit[]): Product[] {
  return hits.map(transformTypesenseHitToProduct);
}

