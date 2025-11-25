import { NextRequest, NextResponse } from 'next/server';
import { adminProductService } from '@/services/shopify/admin/product.service';
import { metafieldService } from '@/services/shopify/admin/metafield.service';

/**
 * Utility endpoint to add missing metafields to existing dummy products
 * Can be called with productId or will find products by title pattern
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, sourceType, fixAll } = body;

    // If fixAll is true, find and fix all dummy products
    if (fixAll) {
      const results = [];
      
      // Fix labgrown dummy product
      const labgrownResult = await findAndFixDummyProduct('labgrown');
      results.push({
        sourceType: 'labgrown',
        ...labgrownResult,
      });

      // Fix natural dummy product
      const naturalResult = await findAndFixDummyProduct('natural');
      results.push({
        sourceType: 'natural',
        ...naturalResult,
      });

      return NextResponse.json({
        success: true,
        results,
      });
    }

    // If productId is provided, fix that specific product
    if (productId && sourceType) {
      const result = await addMetafieldsToProduct(productId, sourceType);
      return NextResponse.json(result);
    }

    // If only sourceType is provided, find the product by title
    if (sourceType) {
      const result = await findAndFixDummyProduct(sourceType);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Missing required parameters. Provide productId+sourceType, sourceType, or fixAll=true' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Find dummy product by title pattern and add metafields
 */
async function findAndFixDummyProduct(sourceType: 'labgrown' | 'natural') {
  try {
    // Search for product by title
    const searchQuery = `title:"External Dummy - ${sourceType}"`;
    const query = `
      query findDummyProduct($query: String!) {
        products(first: 1, query: $query) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    `;

    const { adminClient } = await import('@/lib/shopify/admin/client');
    const response = await adminClient.request<{
      products: {
        edges: Array<{
          node: {
            id: string;
            title: string;
            handle: string;
          };
        }>;
      };
    }>(query, { query: searchQuery });

    if (response.products.edges.length === 0) {
      return {
        success: false,
        error: `No product found with title "External Dummy - ${sourceType}"`,
      };
    }

    const product = response.products.edges[0].node;
    return await addMetafieldsToProduct(product.id, sourceType);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add metafields to a specific product
 */
async function addMetafieldsToProduct(productId: string, sourceType: 'labgrown' | 'natural') {
  try {
    const metafieldsToAdd = [
      {
        namespace: 'custom',
        key: 'source_type',
        value: sourceType,
        type: 'single_line_text_field',
        ownerId: productId,
      },
      {
        namespace: 'custom',
        key: 'payload_template',
        value: JSON.stringify({}),
        type: 'json',
        ownerId: productId,
      },
    ];

    const results = [];
    const errors = [];

    for (const mf of metafieldsToAdd) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Setting metafield ${mf.namespace}.${mf.key} on product ${productId}`);
      }
      
      const result = await metafieldService.setMetafield(mf);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Metafield result for ${mf.namespace}.${mf.key}:`, {
          success: !result.error,
          error: result.error,
          metafield: result.metafield,
        });
      }
      
      if (result.error) {
        errors.push(`${mf.namespace}.${mf.key}: ${result.error}`);
      } else {
        results.push({
          namespace: mf.namespace,
          key: mf.key,
          value: mf.value,
        });
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        productId,
        sourceType,
        errors,
        metafieldsAdded: results,
      };
    }

    return {
      success: true,
      productId,
      sourceType,
      metafieldsAdded: results,
    };
  } catch (error) {
    return {
      success: false,
      productId,
      sourceType,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

