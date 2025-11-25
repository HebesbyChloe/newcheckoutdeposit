// Admin API Product Service
import { adminClient } from '@/lib/shopify/admin/client';
import {
  createProductMutation,
  updateProductMutation,
  createVariantMutation,
  updateVariantMutation,
  getProductMetafieldsQuery,
} from '../queries/admin.queries';

export interface AdminProduct {
  id: string;
  title: string;
  handle: string;
  status: string;
  variants: Array<{
    id: string;
    sku: string | null;
    price: string;
  }>;
}

export interface ProductVariant {
  id: string;
  sku: string | null;
  price: string;
  title: string;
}

export interface CreateProductInput {
  title: string;
  description?: string;
  vendor?: string;
  productType?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  variants?: Array<{
    price: string;
    sku?: string;
    title?: string;
    inventoryQuantities?: Array<{
      availableQuantity: number;
      locationId: string;
    }>;
  }>;
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
}

export class AdminProductService {
  /**
   * Find product by metafield value
   * Uses multiple search strategies to find products
   */
  async findProductByMetafield(
    namespace: string,
    key: string,
    value: string
  ): Promise<{ product: AdminProduct | null; error: string | null }> {
    try {
      // Strategy 1: Try metafield search query
      const query = `metafield:${namespace}.${key}:${value}`;
      const searchQuery = `
        query findProductByMetafield($query: String!) {
          products(first: 10, query: $query) {
            edges {
              node {
                id
                title
                handle
                status
                variants(first: 10) {
                  edges {
                    node {
                      id
                      sku
                      price
                    }
                  }
                }
                metafields(first: 20, namespace: "${namespace}") {
                  edges {
                    node {
                      namespace
                      key
                      value
                    }
                  }
                }
              }
            }
          }
        }
      `;

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Searching for product with metafield: ${namespace}.${key} = ${value}`);
        console.log(`Query string: ${query}`);
      }

      const response = await adminClient.request<{
        products: {
          edges: Array<{
            node: AdminProduct & {
              metafields?: {
                edges: Array<{
                  node: {
                    namespace: string;
                    key: string;
                    value: string;
                  };
                }>;
              };
            };
          }>;
        };
      }>(searchQuery, {
        query,
      });

      // Filter results to find exact match (in case search returns multiple)
      for (const edge of response.products.edges) {
        const product = edge.node;
        const metafields = product.metafields?.edges || [];
        
        // Check if this product has the exact metafield we're looking for
        // Handle both string values and JSON array values (for list types)
        const matchingMetafield = metafields.find((mf) => {
          if (mf.node.namespace !== namespace || mf.node.key !== key) {
            return false;
          }
          
          const metafieldValue = mf.node.value;
          
          // Direct match
          if (metafieldValue === value) {
            return true;
          }
          
          // Try parsing as JSON array (for list types)
          try {
            const parsed = JSON.parse(metafieldValue);
            if (Array.isArray(parsed) && parsed.includes(value)) {
              return true;
            }
          } catch {
            // Not JSON, continue
          }
          
          return false;
        });

        if (matchingMetafield) {
          // Transform variants from edges format
          const variants = product.variants?.edges
            ? product.variants.edges.map((edge: any) => edge.node)
            : [];

          if (process.env.NODE_ENV !== 'production') {
            console.log(`Found product by metafield: ${product.title} (${product.id})`);
          }

          return {
            product: {
              ...product,
              variants,
            },
            error: null,
          };
        }
      }

      // Strategy 2: If metafield search didn't work, try searching by title pattern
      if (process.env.NODE_ENV !== 'production') {
        console.log('Metafield search returned no results, trying title search...');
      }

      const titleQuery = value === 'labgrown' 
        ? 'title:"External Dummy - labgrown"'
        : value === 'natural'
        ? 'title:"External Dummy - natural"'
        : null;

      if (titleQuery) {
        const titleSearchQuery = `
          query findProductByTitle($query: String!) {
            products(first: 5, query: $query) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  variants(first: 10) {
                    edges {
                      node {
                        id
                        sku
                        price
                      }
                    }
                  }
                  metafields(first: 20, namespace: "${namespace}") {
                    edges {
                      node {
                        namespace
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const titleResponse = await adminClient.request<{
          products: {
            edges: Array<{
              node: AdminProduct & {
                metafields?: {
                  edges: Array<{
                    node: {
                      namespace: string;
                      key: string;
                      value: string;
                    };
                  }>;
                };
              };
            }>;
          };
        }>(titleSearchQuery, {
          query: titleQuery,
        });

        // Check if any of these products have the metafield
        for (const edge of titleResponse.products.edges) {
          const product = edge.node;
          const metafields = product.metafields?.edges || [];
          
          const matchingMetafield = metafields.find(
            (mf) => mf.node.namespace === namespace && mf.node.key === key && mf.node.value === value
          );

          if (matchingMetafield) {
            const variants = product.variants?.edges
              ? product.variants.edges.map((edge: any) => edge.node)
              : [];

            if (process.env.NODE_ENV !== 'production') {
              console.log(`Found product by title + metafield: ${product.title} (${product.id})`);
            }

            return {
              product: {
                ...product,
                variants,
              },
              error: null,
            };
          }
        }
      }

      // No product found
      if (process.env.NODE_ENV !== 'production') {
        console.log(`No product found with metafield ${namespace}.${key} = ${value}`);
      }

      return {
        product: null,
        error: null,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error finding product by metafield:', error);
      }
      return {
        product: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find products by title pattern
   */
  async findProductsByTitle(titlePattern: string): Promise<{ products: AdminProduct[]; error: string | null }> {
    try {
      const query = `title:${titlePattern}`;
      const searchQuery = `
        query findProductsByTitle($query: String!) {
          products(first: 10, query: $query) {
            edges {
              node {
                id
                title
                handle
                status
                variants(first: 10) {
                  edges {
                    node {
                      id
                      sku
                      price
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await adminClient.request<{
        products: {
          edges: Array<{
            node: AdminProduct;
          }>;
        };
      }>(searchQuery, {
        query,
      });

      const products = response.products.edges.map((edge) => {
        const product = edge.node;
        // Transform variants from edges format
        const variants = product.variants?.edges
          ? product.variants.edges.map((edge: any) => edge.node)
          : [];
        return {
          ...product,
          variants,
        };
      });

      return {
        products,
        error: null,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error finding products by title:', error);
      }
      return {
        products: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new product
   * Note: As of API version 2024-04, variants field is deprecated in ProductInput.
   * Products must be created first, then variants are added separately.
   */
  async createProduct(input: CreateProductInput): Promise<{ product: AdminProduct | null; error: string | null }> {
    try {
      // Step 1: Create product WITHOUT variants (variants field is deprecated in ProductInput)
      const productInput: any = {
        title: input.title,
        status: input.status || 'DRAFT',
      };

      if (input.description) {
        productInput.descriptionHtml = input.description;
      }

      if (input.vendor) {
        productInput.vendor = input.vendor;
      }

      if (input.productType) {
        productInput.productType = input.productType;
      }
      
      // Remove undefined values from productInput
      Object.keys(productInput).forEach((key) => {
        if (productInput[key] === undefined) {
          delete productInput[key];
        }
      });

      // Enhanced logging before request
      if (process.env.NODE_ENV !== 'production') {
        console.log('Creating product with input:', JSON.stringify(productInput, null, 2));
      }

      const response = await adminClient.request<{
        productCreate: {
          product: AdminProduct | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(createProductMutation, {
        input: productInput,
      });

      // Enhanced logging after request
      if (process.env.NODE_ENV !== 'production') {
        console.log('Product creation response:', JSON.stringify(response, null, 2));
      }

      if (response.productCreate.userErrors.length > 0) {
        const errors = response.productCreate.userErrors.map((e) => ({
          field: e.field,
          message: e.message,
        }));
        const errorMessage = errors.map((e) => `${e.field.join('.')}: ${e.message}`).join(', ');
        
        // Enhanced error logging for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.error('Product creation userErrors:', JSON.stringify(errors, null, 2));
          console.error('Product input sent:', JSON.stringify(productInput, null, 2));
        }
        
        return {
          product: null,
          error: errorMessage,
        };
      }

      if (!response.productCreate.product) {
        return {
          product: null,
          error: 'Product creation failed',
        };
      }

      const createdProduct = response.productCreate.product;
      const createdVariants: Array<{ id: string; sku: string | null; price: string }> = [];

      // Step 2: Create variants separately if provided
      const variantsToCreate = input.variants && input.variants.length > 0 
        ? input.variants 
        : [{ price: '0.00' }]; // Default variant if none provided

      for (const variantInput of variantsToCreate) {
        const variantResult = await this.createVariant(createdProduct.id, {
          price: variantInput.price,
          sku: variantInput.sku,
          inventoryQuantities: variantInput.inventoryQuantities,
        });

        if (variantResult.error) {
          // Log error - this is critical, we need at least one variant
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to create variant during product creation:', {
              error: variantResult.error,
              variantInput,
              productId: createdProduct.id,
            });
          }
          // If this is the first variant and it fails, we have a problem
          // Shopify products must have at least one variant
          if (createdVariants.length === 0) {
            return {
              product: null,
              error: `Failed to create initial variant: ${variantResult.error}. Products must have at least one variant.`,
            };
          }
        } else if (variantResult.variant) {
          createdVariants.push({
            id: variantResult.variant.id,
            sku: variantResult.variant.sku,
            price: variantResult.variant.price,
          });
        }
      }

      // Ensure we have at least one variant
      if (createdVariants.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Product created but no variants were created. This should not happen.');
        }
        return {
          product: null,
          error: 'Product created but failed to create any variants. Products must have at least one variant.',
        };
      }

      // Step 3: Set metafields if provided
      if (input.metafields && input.metafields.length > 0) {
        const { metafieldService } = await import('./metafield.service');
        const metafieldErrors: string[] = [];
        
        for (const mf of input.metafields) {
          const metafieldResult = await metafieldService.setMetafield({
            namespace: mf.namespace,
            key: mf.key,
            value: mf.value,
            type: mf.type,
            ownerId: createdProduct.id,
          });

          if (metafieldResult.error) {
            metafieldErrors.push(`${mf.namespace}.${mf.key}: ${metafieldResult.error}`);
            if (process.env.NODE_ENV !== 'production') {
              console.error(`Failed to set metafield ${mf.namespace}.${mf.key}:`, metafieldResult.error);
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.log(`Successfully set metafield ${mf.namespace}.${mf.key}`);
            }
          }
        }

        // Log warnings if metafields failed, but don't fail product creation
        if (metafieldErrors.length > 0) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Some metafields failed to set:', metafieldErrors);
          }
        }
      }

      // Step 4: Publish product to Online Store sales channel
      // This is required for the product to be available in Storefront API
      try {
        // Get Online Store publication ID
        const publicationsQuery = `
          query getPublications {
            publications(first: 10) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        `;

        const publicationsResponse = await adminClient.request<{
          publications: {
            edges: Array<{
              node: {
                id: string;
                name: string;
              };
            }>;
          };
        }>(publicationsQuery);

        const onlineStorePublication = publicationsResponse.publications.edges.find(
          (edge) => edge.node.name === 'Online Store'
        );

        if (onlineStorePublication) {
          const publishMutation = `
            mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
              publishablePublish(id: $id, input: $input) {
                publishable {
                  ... on Product {
                    id
                    title
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          const publishResponse = await adminClient.request<{
            publishablePublish: {
              publishable: { id: string; title: string } | null;
              userErrors: Array<{ field: string[]; message: string }>;
            };
          }>(publishMutation, {
            id: createdProduct.id,
            input: [
              {
                publicationId: onlineStorePublication.node.id,
              },
            ],
          });

          if (publishResponse.publishablePublish.userErrors.length > 0) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('Failed to publish product to Online Store:', publishResponse.publishablePublish.userErrors);
            }
          } else if (process.env.NODE_ENV !== 'production') {
            console.log('Product published to Online Store successfully');
          }
        } else if (process.env.NODE_ENV !== 'production') {
          console.warn('Online Store publication not found - product may not be available in Storefront API');
        }
      } catch (publishError) {
        // Don't fail product creation if publishing fails
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Error publishing product to Online Store:', publishError);
        }
      }

      // Return product with variants
      return {
        product: {
          ...createdProduct,
          variants: createdVariants,
        },
        error: null,
      };
    } catch (error: any) {
      // Enhanced error logging for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.error('Product creation exception:', error);
        if (error instanceof Error) {
          console.error('Error stack:', error.stack);
        }
        // Log the input that was sent
        console.error('Product input that failed:', JSON.stringify(input, null, 2));
        // Log full error response if available
        if (error?.response) {
          console.error('Error response:', JSON.stringify(error.response, null, 2));
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
        product: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Publish product to Online Store sales channel
   * This makes the product available in Storefront API
   * Also publishes to Storefront API publication if available
   */
  async publishProductToOnlineStore(productId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get publications
      const publicationsQuery = `
        query getPublications {
          publications(first: 10) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `;

      const publicationsResponse = await adminClient.request<{
        publications: {
          edges: Array<{
            node: {
              id: string;
              name: string;
            };
          }>;
        };
      }>(publicationsQuery);

      const onlineStorePublication = publicationsResponse.publications.edges.find(
        (edge) => edge.node.name === 'Online Store'
      );
      
      const storefrontApiPublication = publicationsResponse.publications.edges.find(
        (edge) => edge.node.name === 'Storefront API'
      );

      const publicationsToPublish = [];
      if (onlineStorePublication) {
        publicationsToPublish.push({ publicationId: onlineStorePublication.node.id });
      }
      if (storefrontApiPublication) {
        publicationsToPublish.push({ publicationId: storefrontApiPublication.node.id });
      }

      if (publicationsToPublish.length === 0) {
        return {
          success: false,
          error: 'No publications found (Online Store or Storefront API)',
        };
      }

      const publishMutation = `
        mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            publishable {
              ... on Product {
                id
                title
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const publishResponse = await adminClient.request<{
        publishablePublish: {
          publishable: { id: string; title: string } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(publishMutation, {
        id: productId,
        input: publicationsToPublish,
      });

      if (publishResponse.publishablePublish.userErrors.length > 0) {
        const errors = publishResponse.publishablePublish.userErrors.map((e) => e.message).join(', ');
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to publish product:', errors);
        }
        return {
          success: false,
          error: errors,
        };
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log(`Product published to ${publicationsToPublish.length} publication(s) successfully`);
      }

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Error publishing product:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    productId: string,
    input: Partial<CreateProductInput>
  ): Promise<{ product: AdminProduct | null; error: string | null }> {
    try {
      const productInput: any = {
        id: productId,
      };

      if (input.title) {
        productInput.title = input.title;
      }

      if (input.description) {
        productInput.descriptionHtml = input.description;
      }

      if (input.status) {
        productInput.status = input.status;
      }

      const response = await adminClient.request<{
        productUpdate: {
          product: AdminProduct | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(updateProductMutation, {
        input: productInput,
      });

      if (response.productUpdate.userErrors.length > 0) {
        const error = response.productUpdate.userErrors.map((e) => e.message).join(', ');
        return {
          product: null,
          error,
        };
      }

      return {
        product: response.productUpdate.product,
        error: null,
      };
    } catch (error) {
      return {
        product: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a new variant for a product
   */
  async createVariant(
    productId: string,
    input: {
      price: string;
      sku?: string;
      title?: string;
      inventoryQuantities?: Array<{
        availableQuantity: number;
        locationId: string;
      }>;
    }
  ): Promise<{ variant: ProductVariant | null; error: string | null }> {
    try {
      const variantInput: any = {
        productId,
        price: input.price,
      };

      if (input.sku) {
        variantInput.sku = input.sku;
      }

      // Note: Variants don't have a 'title' field in ProductVariantInput
      // Title is auto-generated from product options

      if (input.inventoryQuantities) {
        variantInput.inventoryQuantities = input.inventoryQuantities;
      }

      // Enhanced logging before request
      if (process.env.NODE_ENV !== 'production') {
        console.log('Creating variant with input:', JSON.stringify({
          productId,
          price: input.price,
          sku: input.sku,
        }, null, 2));
      }

      // Use REST API as primary method (more reliable than GraphQL for variants)
      const { createVariantRest } = await import('./product-rest.service');
      const restResult = await createVariantRest(productId, {
        price: input.price,
        sku: input.sku,
      });

      if (restResult.variant) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Variant created successfully via REST API:', restResult.variant.id);
        }
        return restResult;
      }

      // If REST API fails, try GraphQL as fallback
      if (process.env.NODE_ENV !== 'production') {
        console.warn('REST API variant creation failed, trying GraphQL fallback:', restResult.error);
      }

      try {
        // Prepare variants array for bulk create
        // Note: ProductVariantsBulkInput doesn't support sku field directly
        // SKU must be set via variantUpdate after creation, or use REST API
        const variantsInput: any[] = [{
          price: input.price,
        }];

        // Only add inventoryQuantities if provided
        if (input.inventoryQuantities) {
          variantsInput[0].inventoryQuantities = input.inventoryQuantities;
        }

        const response = await adminClient.request<{
          productVariantsBulkCreate: {
            productVariants: ProductVariant[];
            userErrors: Array<{ field: string[]; message: string }>;
          };
        }>(createVariantMutation, {
          productId,
          variants: variantsInput,
        });

        if (process.env.NODE_ENV !== 'production') {
          console.log('GraphQL variant creation response:', JSON.stringify(response, null, 2));
        }

        if (response.productVariantsBulkCreate.userErrors.length > 0) {
          const errors = response.productVariantsBulkCreate.userErrors.map((e) => ({
            field: e.field,
            message: e.message,
          }));
          const errorMessage = errors.map((e) => `${e.field.join('.')}: ${e.message}`).join(', ');
          
          if (process.env.NODE_ENV !== 'production') {
            console.error('GraphQL variant creation userErrors:', JSON.stringify(errors, null, 2));
          }
          
          return {
            variant: null,
            error: `Both REST and GraphQL failed. REST: ${restResult.error}. GraphQL: ${errorMessage}`,
          };
        }

        const createdVariant = response.productVariantsBulkCreate.productVariants[0];
        
        if (!createdVariant) {
          return {
            variant: null,
            error: `Both REST and GraphQL failed. REST: ${restResult.error}. GraphQL: Variant creation succeeded but no variant was returned`,
          };
        }

        if (process.env.NODE_ENV !== 'production') {
          console.log('Variant created successfully via GraphQL fallback:', createdVariant.id);
        }

        return {
          variant: createdVariant,
          error: null,
        };
      } catch (graphqlError: any) {
        const graphqlErrorMessage = graphqlError?.response?.errors?.[0]?.message || graphqlError?.message || 'Unknown GraphQL error';
        
        if (process.env.NODE_ENV !== 'production') {
          console.error('GraphQL variant creation exception:', graphqlError);
        }

        return {
          variant: null,
          error: `Both REST and GraphQL failed. REST: ${restResult.error}. GraphQL: ${graphqlErrorMessage}`,
        };
      }
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Variant creation exception:', error);
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
        variant: null,
        error: errorMessage,
      };
    }
  }

  /**
   * Update an existing variant
   * Uses REST API since GraphQL variant update mutations are deprecated/unavailable
   */
  async updateVariant(
    variantId: string,
    input: {
      price?: string;
      sku?: string;
      title?: string;
    }
  ): Promise<{ variant: ProductVariant | null; error: string | null }> {
    try {
      // Use REST API for variant updates (more reliable)
      const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
      const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
      const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

      // Extract numeric variant ID from GID
      const variantIdNum = variantId.replace('gid://shopify/ProductVariant/', '');

      const url = `https://${domain}/admin/api/${apiVersion}/variants/${variantIdNum}.json`;

      const variantData: any = {};
      if (input.price !== undefined) {
        variantData.price = input.price;
      }
      if (input.sku !== undefined) {
        variantData.sku = input.sku;
      }

      if (process.env.NODE_ENV !== 'production') {
        console.log('Updating variant via REST API:', {
          variantId: variantIdNum,
          data: variantData,
        });
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': adminAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variant: variantData }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.errors ? JSON.stringify(data.errors) : `HTTP ${response.status}`;
        if (process.env.NODE_ENV !== 'production') {
          console.error('REST API variant update failed:', errorMessage);
        }
        return {
          variant: null,
          error: errorMessage,
        };
      }

      if (!data.variant) {
        return {
          variant: null,
          error: 'Variant update succeeded but no variant was returned',
        };
      }

      // Convert REST API response to our format
      return {
        variant: {
          id: `gid://shopify/ProductVariant/${data.variant.id}`,
          sku: data.variant.sku,
          price: data.variant.price,
          title: data.variant.title || 'Default Title',
        },
        error: null,
      };
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Variant update exception:', error);
      }
      return {
        variant: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get product with variants
   */
  async getProduct(productId: string): Promise<{ product: AdminProduct | null; error: string | null }> {
    try {
      const query = `
        query getProduct($id: ID!) {
          product(id: $id) {
            id
            title
            handle
            status
            variants(first: 50) {
              edges {
                node {
                  id
                  sku
                  price
                }
              }
            }
          }
        }
      `;

      const response = await adminClient.request<{
        product: AdminProduct | null;
      }>(query, {
        id: productId,
      });

      if (!response.product) {
        return {
          product: null,
          error: 'Product not found',
        };
      }

      // Transform variants from edges format
      const variants = response.product.variants?.edges
        ? response.product.variants.edges.map((edge: any) => edge.node)
        : [];

      return {
        product: {
          ...response.product,
          variants,
        },
        error: null,
      };
    } catch (error) {
      return {
        product: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const adminProductService = new AdminProductService();

