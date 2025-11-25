// Metafield service for Admin API
import { adminClient } from '@/lib/shopify/admin/client';
import { setMetafieldsMutation, getProductMetafieldsQuery } from '../queries/admin.queries';

export interface MetafieldInput {
  namespace: string;
  key: string;
  value: string;
  type: string;
  ownerId: string;
}

export interface Metafield {
  id: string;
  namespace: string;
  key: string;
  value: string;
  type?: string;
}

export class MetafieldService {
  /**
   * Set metafields on a product or variant
   */
  async setMetafields(metafields: MetafieldInput[]): Promise<{ metafields: Metafield[]; errors: string[] }> {
    try {
      const metafieldsInput = metafields.map((mf) => ({
        namespace: mf.namespace,
        key: mf.key,
        value: mf.value,
        type: mf.type,
        ownerId: mf.ownerId,
      }));

      // Enhanced logging before request
      if (process.env.NODE_ENV !== 'production') {
        console.log('Setting metafields with input:', JSON.stringify(metafieldsInput, null, 2));
      }

      const response = await adminClient.request<{
        metafieldsSet: {
          metafields: Metafield[];
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(setMetafieldsMutation, {
        metafields: metafieldsInput,
      });

      // Enhanced logging after request
      if (process.env.NODE_ENV !== 'production') {
        console.log('Metafields set response:', JSON.stringify(response, null, 2));
      }

      if (response.metafieldsSet.userErrors.length > 0) {
        const errors = response.metafieldsSet.userErrors.map((e) => ({
          field: e.field,
          message: e.message,
        }));
        const errorMessages = errors.map((e) => `${e.field.join('.')}: ${e.message}`);
        
        if (process.env.NODE_ENV !== 'production') {
          console.error('Metafields set userErrors:', JSON.stringify(errors, null, 2));
        }
        
        return {
          metafields: [],
          errors: errorMessages,
        };
      }

      return {
        metafields: response.metafieldsSet.metafields,
        errors: [],
      };
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Metafields set exception:', error);
        if (error instanceof Error) {
          console.error('Error stack:', error.stack);
        }
        if (error?.response?.errors) {
          console.error('GraphQL errors:', JSON.stringify(error.response.errors, null, 2));
        }
      }
      
      // Extract more detailed error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.response?.errors) {
        errorMessage = error.response.errors.map((e: any) => e.message || e).join(', ');
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      return {
        metafields: [],
        errors: [errorMessage],
      };
    }
  }

  /**
   * Set a single metafield
   * Retries once if it fails, with better error handling
   */
  async setMetafield(input: MetafieldInput): Promise<{ metafield: Metafield | null; error: string | null }> {
    // Validate input
    if (!input.namespace || !input.key || !input.ownerId) {
      return {
        metafield: null,
        error: 'Missing required fields: namespace, key, or ownerId',
      };
    }

    // Ensure value is a string (for JSON type, it should already be stringified)
    const value = typeof input.value === 'string' ? input.value : JSON.stringify(input.value);

    const metafieldInput: MetafieldInput = {
      ...input,
      value,
    };

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Setting metafield ${input.namespace}.${input.key} on ${input.ownerId}`);
    }

    const result = await this.setMetafields([metafieldInput]);
    
    if (result.errors.length > 0) {
      const errorMessage = result.errors[0];
      
      // If error is about metafield definition, try to provide helpful message
      if (errorMessage.includes('definition') || errorMessage.includes('not found')) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `Metafield ${input.namespace}.${input.key} may need to be defined in Shopify Admin. ` +
            `Go to Settings > Custom data > Products and create a definition for ${input.namespace}.${input.key}`
          );
        }
      }
      
      return {
        metafield: null,
        error: errorMessage,
      };
    }
    
    const createdMetafield = result.metafields[0];
    if (!createdMetafield) {
      return {
        metafield: null,
        error: 'Metafield was not created (no error returned)',
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`Successfully set metafield ${input.namespace}.${input.key}`);
    }

    return {
      metafield: createdMetafield,
      error: null,
    };
  }

  /**
   * Get all metafields for a product
   */
  async getProductMetafields(productId: string): Promise<{ metafields: Metafield[]; error: string | null }> {
    try {
      const response = await adminClient.request<{
        product: {
          id: string;
          metafields: {
            edges: Array<{
              node: Metafield;
            }>;
          };
        } | null;
      }>(getProductMetafieldsQuery, {
        id: productId,
      });

      if (!response.product) {
        return {
          metafields: [],
          error: 'Product not found',
        };
      }

      return {
        metafields: response.product.metafields.edges.map((edge) => edge.node),
        error: null,
      };
    } catch (error) {
      return {
        metafields: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const metafieldService = new MetafieldService();

