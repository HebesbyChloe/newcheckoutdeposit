// Cart API service
import { shopifyClient } from '@/lib/shopify';
import {
  cartCreateMutation,
  cartQuery,
  cartLinesAddMutation,
  cartLinesUpdateMutation,
  cartLinesRemoveMutation,
  cartDiscountCodesUpdateMutation,
  cartNoteUpdateMutation,
  cartBuyerIdentityUpdateMutation
} from './queries/cart.queries';
import {
  CartApiResponse,
  CartCreateRequest,
  Cart,
  CartLine,
  CartUpdateRequest,
  CartRemoveRequest,
  CartDiscountRequest
} from '@/types/api.types';

// Helper to transform GraphQL cart response with edges to flat structure
function transformCartResponse(cart: any): Cart | null {
  if (!cart) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('transformCartResponse: cart is null or undefined');
    }
    return null;
  }

  const lines = cart.lines?.edges
    ? cart.lines.edges.map((edge: any) => transformCartLine(edge.node))
    : (cart.lines || []);

  if (process.env.NODE_ENV !== 'production') {
    console.log('transformCartResponse:', {
      hasCart: !!cart,
      hasLines: !!cart.lines,
      hasEdges: !!cart.lines?.edges,
      edgesCount: cart.lines?.edges?.length || 0,
      transformedLinesCount: lines.length,
      totalQuantity: cart.totalQuantity,
    });
  }

  // Clean cart ID (remove query parameters like ?key=...)
  const cleanCartId = (id: string): string => {
    return id.includes('?') ? id.split('?')[0] : id;
  };
  
  const cleanedId = cleanCartId(cart.id);
  const cleanedCheckoutUrl = cart.checkoutUrl?.includes('?') 
    ? cart.checkoutUrl.split('?')[0] 
    : cart.checkoutUrl;
  
  // Clean cart line IDs (remove query parameters like ?cart=...)
  const cleanedLines = lines.map((line: any) => {
    if (line.id && line.id.includes('?')) {
      return {
        ...line,
        id: line.id.split('?')[0],
      };
    }
    return line;
  });
  
  return {
    id: cleanedId,
    checkoutUrl: cleanedCheckoutUrl,
    totalQuantity: cart.totalQuantity,
    cost: cart.cost,
    discountCodes: cart.discountCodes || [],
    lines: cleanedLines,
  };
}

// Helper to transform cart line from GraphQL structure
function transformCartLine(node: any): CartLine {
  // Transform attributes from GraphQL format (array of {key, value}) to our format
  let attributes: Array<{ key: string; value: string }> | undefined = undefined;

  if (node.attributes) {
    if (Array.isArray(node.attributes)) {
      attributes = node.attributes
        .filter((attr: any) => attr && attr.key && attr.value !== undefined)
        .map((attr: any) => ({
          key: String(attr.key || ''),
          value: String(attr.value || ''),
        }));
    } else if (typeof node.attributes === 'object') {
      // Handle case where attributes might be an object instead of array
      attributes = Object.entries(node.attributes)
        .filter(([key, value]) => key && value !== undefined)
        .map(([key, value]) => ({
          key: String(key),
          value: String(value),
        }));
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('transformCartLine - raw attributes:', node.attributes);
      console.log('transformCartLine - attributes type:', Array.isArray(node.attributes) ? 'array' : typeof node.attributes);
      console.log('transformCartLine - transformed attributes:', attributes);
    }
  } else if (process.env.NODE_ENV !== 'production') {
    console.log('transformCartLine - no attributes found on node');
  }

  // Clean line ID (remove query parameters like ?cart=...)
  const cleanLineId = (id: string): string => {
    return id.includes('?') ? id.split('?')[0] : id;
  };
  
  return {
    id: cleanLineId(node.id),
    quantity: node.quantity,
    attributes: attributes && attributes.length > 0 ? attributes : undefined,
    merchandise: {
      id: node.merchandise.id,
      title: node.merchandise.title,
      price: node.merchandise.price,
      metafields: undefined, // Metafields not available in Storefront API cart context
      product: {
        id: node.merchandise.product.id,
        title: node.merchandise.product.title,
        handle: node.merchandise.product.handle,
        images: node.merchandise.product.images?.edges
          ? node.merchandise.product.images.edges.map((imgEdge: any) => ({
            url: imgEdge.node.url,
            altText: imgEdge.node.altText,
          }))
          : [],
      },
    },
    cost: node.cost,
  };
}

export class CartService {
  /**
   * Create cart with items
   */
  async createCart(request: CartCreateRequest): Promise<CartApiResponse> {
    try {
      if (!request.variantId) {
        return {
          error: 'Variant ID is required',
        };
      }

      const data = await shopifyClient.request<{
        cartCreate: {
          cart: any;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(cartCreateMutation, {
        input: {
          lines: [
            {
              merchandiseId: request.variantId,
              quantity: request.quantity || 1,
              attributes: request.attributes || [],
            },
          ],
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('createCart - GraphQL input sent:', {
          variantId: request.variantId,
          quantity: request.quantity || 1,
          attributesCount: request.attributes?.length || 0,
          attributes: request.attributes,
        });
      }

      if (data.cartCreate.userErrors.length > 0) {
        return {
          error: data.cartCreate.userErrors[0].message,
        };
      }

      if (data.cartCreate.cart?.checkoutUrl) {
        // Transform the cart response to return full cart object
        const transformedCart = transformCartResponse(data.cartCreate.cart);

        if (process.env.NODE_ENV !== 'production') {
          console.log('cartCreate result:', {
            hasCart: !!data.cartCreate.cart,
            hasTransformed: !!transformedCart,
            linesCount: transformedCart?.lines?.length || 0,
            totalQuantity: transformedCart?.totalQuantity || 0,
          });
        }

        return {
          checkoutUrl: data.cartCreate.cart.checkoutUrl,
          cartId: data.cartCreate.cart.id,
          cart: transformedCart, // Return full cart object
        };
      }

      return {
        error: 'Failed to create cart',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create cart with multiple lines
   */
  async createCartWithLines(request: { 
    lines: Array<{
      merchandiseId: string;
      quantity: number;
      attributes?: Array<{ key: string; value: string }>;
    }>;
  }): Promise<CartApiResponse> {
    try {
      const data = await shopifyClient.request<{
        cartCreate: {
          cart: any;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(cartCreateMutation, {
        input: {
          lines: request.lines,
        },
      });

      if (process.env.NODE_ENV !== 'production') {
        console.log('createCartWithLines - GraphQL input sent:', {
          linesCount: request.lines.length,
          lines: request.lines.map(l => ({
            merchandiseId: l.merchandiseId,
            quantity: l.quantity,
            attributesCount: l.attributes?.length || 0,
            attributes: l.attributes,
          })),
        });
      }

      if (data.cartCreate.userErrors.length > 0) {
        return {
          error: data.cartCreate.userErrors[0].message,
        };
      }

      if (data.cartCreate.cart?.checkoutUrl) {
        const transformedCart = transformCartResponse(data.cartCreate.cart);

        if (process.env.NODE_ENV !== 'production') {
          console.log('createCartWithLines result:', {
            hasCart: !!data.cartCreate.cart,
            hasTransformed: !!transformedCart,
            linesCount: transformedCart?.lines?.length || 0,
            totalQuantity: transformedCart?.totalQuantity || 0,
          });
        }

        return {
          checkoutUrl: data.cartCreate.cart.checkoutUrl,
          cartId: data.cartCreate.cart.id,
          cart: transformedCart,
        };
      }

      return {
        error: 'Failed to create cart',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get cart by ID with full details
   */
  async getCart(cartId: string): Promise<Cart | null> {
    try {
      const data = await shopifyClient.request<{
        cart: {
          id: string;
          checkoutUrl: string;
          totalQuantity: number;
          cost: {
            totalAmount: {
              amount: string;
              currencyCode: string;
            };
            subtotalAmount: {
              amount: string;
              currencyCode: string;
            };
            totalTaxAmount: {
              amount: string;
              currencyCode: string;
            } | null;
            totalDutyAmount: {
              amount: string;
              currencyCode: string;
            } | null;
          };
          discountCodes: Array<{
            code: string;
            applicable: boolean;
          }>;
          lines: {
            edges: Array<{
              node: {
                id: string;
                quantity: number;
                merchandise: {
                  id: string;
                  title: string;
                  price: {
                    amount: string;
                    currencyCode: string;
                  };
                  product: {
                    id: string;
                    title: string;
                    handle: string;
                    images: {
                      edges: Array<{
                        node: {
                          url: string;
                          altText: string | null;
                        };
                      }>;
                    };
                  };
                };
                cost: {
                  totalAmount: {
                    amount: string;
                    currencyCode: string;
                  };
                };
              };
            }>;
          };
        } | null;
      }>(cartQuery, {
        id: cartId,
      });

      return transformCartResponse(data.cart);
    } catch (error) {
      return null;
    }
  }

  /**
   * Add items to existing cart
   */
  async addLinesToCart(cartId: string, lines: Array<{ merchandiseId: string; quantity: number; attributes?: Array<{ key: string; value: string }> }>): Promise<Cart | null> {
    try {
      // Clean cart ID (remove query parameters)
      const cleanCartId = (id: string): string => {
        return id.includes('?') ? id.split('?')[0] : id;
      };
      const cleanedCartId = cleanCartId(cartId);
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('addLinesToCart - input:', {
          originalCartId: cartId,
          cleanedCartId: cleanedCartId,
          linesCount: lines.length,
          lines: lines.map(l => ({
            merchandiseId: l.merchandiseId,
            quantity: l.quantity,
            hasAttributes: !!l.attributes,
            attributesCount: l.attributes?.length || 0,
            attributes: l.attributes,
          }))
        });
      }

      const data = await shopifyClient.request<{
        cartLinesAdd: {
          cart: any;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(cartLinesAddMutation, {
        cartId: cleanedCartId, // Use cleaned cart ID
        lines,
      });

      if (data.cartLinesAdd.userErrors.length > 0) {
        const errorMessage = data.cartLinesAdd.userErrors.map(e => e.message).join(', ');
        if (process.env.NODE_ENV !== 'production') {
          console.error('Cart lines add user errors:', data.cartLinesAdd.userErrors);
          console.error('Cart lines add - input:', { 
            originalCartId: cartId,
            cleanedCartId: cleanedCartId,
            lines 
          });
        }
        // Don't throw - return null so API can handle it
        return null;
      }

      if (!data.cartLinesAdd.cart) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('addLinesToCart: No cart returned from Shopify');
        }
        return null;
      }

      const transformed = transformCartResponse(data.cartLinesAdd.cart);

      if (process.env.NODE_ENV !== 'production') {
        // Log attributes from raw response
        const rawLines = data.cartLinesAdd.cart?.lines?.edges || [];
        console.log('addLinesToCart - Raw cart response:', {
          hasCart: !!data.cartLinesAdd.cart,
          linesCount: rawLines.length,
          fullCartResponse: JSON.stringify(data.cartLinesAdd.cart, null, 2),
        });

        rawLines.forEach((edge: any, idx: number) => {
          console.log(`addLinesToCart - line ${idx} raw node:`, {
            id: edge.node.id,
            quantity: edge.node.quantity,
            hasAttributes: !!edge.node.attributes,
            attributesType: Array.isArray(edge.node.attributes) ? 'array' : typeof edge.node.attributes,
            attributes: edge.node.attributes,
            fullNode: JSON.stringify(edge.node, null, 2),
          });
        });

        // Log attributes from transformed response
        transformed?.lines?.forEach((line: any, idx: number) => {
          console.log(`addLinesToCart - line ${idx} transformed:`, {
            id: line.id,
            quantity: line.quantity,
            hasAttributes: !!line.attributes,
            attributes: line.attributes,
          });
        });

        console.log('addLinesToCart result summary:', {
          hasCart: !!data.cartLinesAdd.cart,
          hasTransformed: !!transformed,
          linesCount: transformed?.lines?.length || 0,
          totalQuantity: transformed?.totalQuantity || 0,
          rawCartLines: data.cartLinesAdd.cart.lines?.edges?.length || 0,
          transformedLinesCount: transformed?.lines?.length || 0,
        });
      }

      return transformed;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Exception in addLinesToCart:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }
      return null;
    }
  }

  /**
   * Update cart line quantities
   */
  async updateCartLines(request: CartUpdateRequest): Promise<Cart | null> {
    try {
      const data = await shopifyClient.request<{
        cartLinesUpdate: {
          cart: Cart | null;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(cartLinesUpdateMutation, {
        cartId: request.cartId,
        lines: request.lines,
      });

      if (data.cartLinesUpdate.userErrors.length > 0) {
        return null;
      }

      return transformCartResponse(data.cartLinesUpdate.cart);
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove lines from cart
   */
  async removeCartLines(request: CartRemoveRequest): Promise<Cart | null> {
    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log('removeCartLines - input:', { cartId: request.cartId, lineIds: request.lineIds });
      }

      const data = await shopifyClient.request<{
        cartLinesRemove: {
          cart: any;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(cartLinesRemoveMutation, {
        cartId: request.cartId,
        lineIds: request.lineIds,
      });

      if (data.cartLinesRemove.userErrors.length > 0) {
        const errorMessage = data.cartLinesRemove.userErrors.map(e => e.message).join(', ');
        if (process.env.NODE_ENV !== 'production') {
          console.error('Cart lines remove user errors:', data.cartLinesRemove.userErrors);
          console.error('Cart lines remove - input:', { cartId: request.cartId, lineIds: request.lineIds });
        }
        
        // If cart doesn't exist, return a special indicator so we can clear it
        const cartNotFound = data.cartLinesRemove.userErrors.some(
          (e: any) => e.message?.toLowerCase().includes('cart does not exist') || 
                     e.message?.toLowerCase().includes('cart not found')
        );
        
        if (cartNotFound) {
          // Return a special object to indicate cart is invalid
          return { __cartNotFound: true } as any;
        }
        
        // Don't throw - return null so API can handle it
        return null;
      }

      if (!data.cartLinesRemove.cart) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('removeCartLines: No cart returned from Shopify');
        }
        return null;
      }

      const transformed = transformCartResponse(data.cartLinesRemove.cart);

      if (process.env.NODE_ENV !== 'production') {
        console.log('removeCartLines result:', {
          hasCart: !!data.cartLinesRemove.cart,
          hasTransformed: !!transformed,
          linesCount: transformed?.lines?.length || 0,
        });
      }

      return transformed;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Exception in removeCartLines:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      }
      return null;
    }
  }

  /**
   * Apply discount codes to cart
   */
  async applyDiscountCode(request: CartDiscountRequest): Promise<Cart | null> {
    try {
      const data = await shopifyClient.request<{
        cartDiscountCodesUpdate: {
          cart: Cart | null;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(cartDiscountCodesUpdateMutation, {
        cartId: request.cartId,
        discountCodes: request.discountCodes,
      });

      if (data.cartDiscountCodesUpdate.userErrors.length > 0) {
        return null;
      }

      return transformCartResponse(data.cartDiscountCodesUpdate.cart);
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove discount codes from cart
   */
  async removeDiscountCode(cartId: string): Promise<Cart | null> {
    try {
      const data = await shopifyClient.request<{
        cartDiscountCodesUpdate: {
          cart: Cart | null;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(cartDiscountCodesUpdateMutation, {
        cartId,
        discountCodes: [],
      });

      if (data.cartDiscountCodesUpdate.userErrors.length > 0) {
        return null;
      }

      return transformCartResponse(data.cartDiscountCodesUpdate.cart);
    } catch (error) {
      return null;
    }
  }

  /**
   * Add item to cart (creates new cart if needed)
   */
  async addToCart(variantId: string, quantity: number = 1): Promise<string | null> {
    const result = await this.createCart({ variantId, quantity });
    return result.checkoutUrl || null;
  }

  /**
   * Update cart note (special instructions)
   */
  async updateCartNote(cartId: string, note: string): Promise<Cart | null> {
    try {
      const data = await shopifyClient.request<{
        cartNoteUpdate: {
          cart: any;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(cartNoteUpdateMutation, {
        cartId,
        note,
      });

      if (data.cartNoteUpdate.userErrors.length > 0) {
        return null;
      }

      return transformCartResponse(data.cartNoteUpdate.cart);
    } catch (error) {
      return null;
    }
  }

  /**
   * Update cart buyer identity (associate with customer)
   */
  async updateCartBuyerIdentity(
    cartId: string,
    buyerIdentity: {
      email?: string;
      customerAccessToken?: string;
      deliveryAddressPreferences?: Array<{
        deliveryAddress: {
          address1?: string;
          address2?: string;
          city?: string;
          province?: string;
          country?: string;
          zip?: string;
        };
      }>;
    }
  ): Promise<Cart | null> {
    try {
      const data = await shopifyClient.request<{
        cartBuyerIdentityUpdate: {
          cart: any;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(cartBuyerIdentityUpdateMutation, {
        cartId,
        buyerIdentity,
      });

      if (data.cartBuyerIdentityUpdate.userErrors.length > 0) {
        return null;
      }

      return transformCartResponse(data.cartBuyerIdentityUpdate.cart);
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
export const cartService = new CartService();
