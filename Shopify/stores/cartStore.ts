'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Cart, GatewayResponse } from '@/types/api.types';
import { AddToCartInput } from '@/types/hook.types';
import { apiClient } from '@/services/api-client';

const CART_ID_KEY = 'internal_cart_id';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  isPanelOpen: boolean;

  // Actions
  getCartId: () => string | null;
  saveCartId: (cartId: string) => void;
  clearCartId: () => void;
  getCart: () => Promise<void>;
  addToCart: (input: AddToCartInput) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  removeItem: (lineId: string) => Promise<void>;
  applyDiscount: (code: string) => Promise<void>;
  removeDiscount: () => Promise<void>;
  clearCart: () => Promise<void>;
  setCart: (cart: Cart | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  openCartPanel: () => void;
  closeCartPanel: () => void;
  toggleCartPanel: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      loading: false,
      error: null,
      isPanelOpen: false,

      getCartId: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(CART_ID_KEY);
      },

      saveCartId: (cartId: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(CART_ID_KEY, cartId);
        if (process.env.NODE_ENV !== 'production') {
          console.log('saveCartId:', { cartId });
        }
      },

      clearCartId: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(CART_ID_KEY);
      },

      setCart: (cart: Cart | null) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('setCart called:', {
            hasCart: !!cart,
            linesCount: cart?.lines?.length || 0,
            totalQuantity: cart?.totalQuantity || 0,
            cartId: cart?.id,
            cart: cart,
          });
        }
        set({ cart });

        // Save cart ID
        if (cart?.id) {
          get().saveCartId(cart.id);
        }

        // Verify it was set
        const verifyCart = get().cart;
        if (process.env.NODE_ENV !== 'production') {
          console.log('Cart after setCart:', {
            hasCart: !!verifyCart,
            linesCount: verifyCart?.lines?.length || 0,
            totalQuantity: verifyCart?.totalQuantity || 0,
          });
        }
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      openCartPanel: () => {
        set({ isPanelOpen: true });
      },

      closeCartPanel: () => {
        set({ isPanelOpen: false });
      },

      toggleCartPanel: () => {
        set((state) => ({ isPanelOpen: !state.isPanelOpen }));
      },

      getCart: async () => {
        let cartId = get().getCartId();
        if (!cartId) {
          set({ cart: null });
          return;
        }

        set({ loading: true, error: null });

        try {
          // Gateway endpoint returns: { data: { cartId, cart }, error: {...} }
          // apiClient wraps it as: { data: { data: { cartId, cart }, error: {...} }, error: ... }
          const response = await apiClient.get<GatewayResponse<{ cartId: string; cart: Cart }>>(`/api/gw/v1/cart?cartId=${encodeURIComponent(cartId)}`);

          // Handle apiClient error (network, timeout, etc.)
          if (response.error) {
            if (process.env.NODE_ENV !== 'production') {
              console.error('getCart apiClient error:', response.error, 'cartId:', cartId);
            }
            // Handle error - could be string or object
            const errorMessage = typeof response.error === 'string' 
              ? response.error 
              : (response.error?.message || 'An error occurred');
            set({ error: errorMessage });
            get().clearCartId();
            set({ cart: null });
            return;
          }

          // response.data is the gateway envelope: { data: {...}, error: {...} }
          const gatewayResponse = response.data as GatewayResponse<{ cartId: string; cart: Cart }> | undefined;

          if (gatewayResponse?.error) {
            // Gateway error
            const errorInfo = gatewayResponse.error;
            if (process.env.NODE_ENV !== 'production') {
              console.error('getCart gateway error:', errorInfo, 'cartId:', cartId);
            }
            set({ error: errorInfo.message });
            get().clearCartId();
            set({ cart: null });
            return;
          }

          if (gatewayResponse?.data?.cart) {
            set({ cart: gatewayResponse.data.cart });
            // Save the cart ID from the response
            get().saveCartId(gatewayResponse.data.cartId || gatewayResponse.data.cart.id);
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('getCart: No cart in response', response);
            }
            get().clearCartId();
            set({ cart: null });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cart';
          if (process.env.NODE_ENV !== 'production') {
            console.error('getCart exception:', err, 'cartId:', cartId);
          }
          set({ error: errorMessage, cart: null });
        } finally {
          set({ loading: false });
        }
      },

      addToCart: async (input: AddToCartInput): Promise<void> => {
        set({ loading: true, error: null });

        try {
          const cartId = get().getCartId();

          // Debug logging
          if (process.env.NODE_ENV !== 'production') {
            console.log('🛒 [Cart Store] addToCart called:', {
              cartId,
              input: {
                source: input.source,
                externalId: input.externalId,
                variantId: input.variantId,
                title: input.title,
              },
            });
          }

          // Gateway endpoint returns: { data: { cartId, cart }, error: {...} }
          // apiClient wraps it as: { data: { data: { cartId, cart }, error: {...} }, error: ... }
          const response = await apiClient.post<GatewayResponse<{ cartId: string; cart: Cart }>>('/api/gw/v1/cart/items', {
            cartId: cartId || undefined,
            ...input,
          });
          
          // Debug logging for response
          if (process.env.NODE_ENV !== 'production') {
            console.log('📦 [Cart Store] addToCart response:', {
              hasError: !!response.error,
              hasData: !!response.data,
              gatewayResponse: response.data,
            });
          }

          // Handle apiClient error (network, timeout, etc.)
          if (response.error) {
            // Handle error - could be string or object
            const errorMessage = typeof response.error === 'string' 
              ? response.error 
              : (response.error?.message || 'Failed to add to cart');
            set({ error: errorMessage, loading: false });
            return;
          }

          // response.data is the gateway envelope: { data: {...}, error: {...} }
          const gatewayResponse = response.data as GatewayResponse<{ cartId: string; cart: Cart }> | undefined;

          // Handle gateway error
          if (gatewayResponse?.error) {
            const errorInfo = gatewayResponse.error;
            
            // Show debug message if Shopify creation failed
            if (errorInfo.details && process.env.NODE_ENV !== 'production') {
              console.warn('Shopify product creation failed (cart still saved):', errorInfo.details);
              // Show toast/alert with debug info
              if (typeof window !== 'undefined') {
                const { toast } = await import('sonner');
                toast.warning(`Product added to cart, but Shopify creation failed. Debug: ${JSON.stringify(errorInfo.details)}`);
              }
            }
            
            // If it's a critical error, show it; otherwise cart was saved successfully
            if (errorInfo.code !== 'SHOPIFY_ERROR' && errorInfo.code !== 'SHOPIFY_PRODUCT_CREATION_FAILED') {
              set({ error: errorInfo.message, loading: false });
              return;
            }
            
            // For Shopify errors, cart was still saved, so continue if we have cart data
            if (gatewayResponse.data?.cartId && gatewayResponse.data?.cart) {
              const newCart = gatewayResponse.data.cart;
              set({ cart: newCart, loading: false });
              get().saveCartId(gatewayResponse.data.cartId);
              return;
            }
          }

          // Success case
          if (gatewayResponse?.data?.cartId && gatewayResponse?.data?.cart) {
            const newCart = gatewayResponse.data.cart;
            set({ cart: newCart, loading: false });
            get().saveCartId(gatewayResponse.data.cartId);
            return;
          }

          set({ loading: false });
          return;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to add to cart';
          set({ error: errorMessage, loading: false });
          return;
        }
      },

      updateQuantity: async (lineId: string, quantity: number) => {
        const cartId = get().getCartId();
        if (!cartId) {
          set({ error: 'No cart found' });
          return;
        }

        if (quantity <= 0) {
          await get().removeItem(lineId);
          return;
        }

        set({ loading: true, error: null });

        try {
          // Gateway endpoint returns: { data: { cartId, cart }, error: {...} }
          // apiClient wraps it as: { data: { data: { cartId, cart }, error: {...} }, error: ... }
          const response = await apiClient.request<GatewayResponse<{ cartId: string; cart: Cart }>>('/api/gw/v1/cart/items', {
            method: 'PUT',
            body: { cartId, lineId, quantity },
          });

          // Handle apiClient error
          if (response.error) {
            // Handle error - could be string or object
            const errorMessage = typeof response.error === 'string' 
              ? response.error 
              : (response.error?.message || 'An error occurred');
            set({ error: errorMessage });
            return;
          }

          // response.data is the gateway envelope: { data: {...}, error: {...} }
          const gatewayResponse = response.data as GatewayResponse<{ cartId: string; cart: Cart }> | undefined;

          // Handle gateway error
          if (gatewayResponse?.error) {
            set({ error: gatewayResponse.error.message });
            return;
          }

          if (gatewayResponse?.data?.cart) {
            set({ cart: gatewayResponse.data.cart });
            get().saveCartId(gatewayResponse.data.cartId || cartId);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update quantity';
          set({ error: errorMessage });
        } finally {
          set({ loading: false });
        }
      },

      removeItem: async (lineId: string) => {
        const cartId = get().getCartId();
        if (!cartId) {
          set({ error: 'No cart found' });
          return;
        }

        set({ loading: true, error: null });

        try {
          // Gateway endpoint returns: { data: { cartId, cart }, error: {...} }
          // apiClient wraps it as: { data: { data: { cartId, cart }, error: {...} }, error: ... }
          const response = await apiClient.request<GatewayResponse<{ cartId: string; cart: Cart }>>('/api/gw/v1/cart/items', {
            method: 'DELETE',
            body: { cartId, lineId },
          });

          // Handle apiClient error
          if (response.error) {
            // Handle error - could be string or object
            const errorMessage = typeof response.error === 'string' 
              ? response.error 
              : (response.error?.message || 'An error occurred');
            set({ error: errorMessage });
            return;
          }

          // response.data is the gateway envelope: { data: {...}, error: {...} }
          const gatewayResponse = response.data as GatewayResponse<{ cartId: string; cart: Cart }> | undefined;

          // Handle gateway error
          if (gatewayResponse?.error) {
            set({ error: gatewayResponse.error.message });
            return;
          }

          if (gatewayResponse?.data?.cart) {
            set({ cart: gatewayResponse.data.cart });
            if (gatewayResponse.data.cart.lines.length === 0) {
              get().clearCartId();
            } else {
              get().saveCartId(gatewayResponse.data.cartId || cartId);
            }
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to remove item';
          set({ error: errorMessage });
        } finally {
          set({ loading: false });
        }
      },

      applyDiscount: async (code: string) => {
        const cartId = get().getCartId();
        if (!cartId) {
          set({ error: 'No cart found' });
          return;
        }

        set({ loading: true, error: null });

        try {
          const response = await apiClient.post<{ cart: Cart }>('/api/cart/discount', {
            cartId,
            discountCodes: [code],
          });

          if (response.error) {
            // Handle error - could be string or object
            const errorMessage = typeof response.error === 'string' 
              ? response.error 
              : (response.error?.message || 'An error occurred');
            set({ error: errorMessage });
            return;
          }

          if (response.data?.cart) {
            set({ cart: response.data.cart });
            get().saveCartId(response.data.cart.id);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to apply discount';
          set({ error: errorMessage });
        } finally {
          set({ loading: false });
        }
      },

      removeDiscount: async () => {
        const cartId = get().getCartId();
        if (!cartId) {
          set({ error: 'No cart found' });
          return;
        }

        set({ loading: true, error: null });

        try {
          const response = await apiClient.request<{ cart: Cart }>('/api/cart/discount', {
            method: 'DELETE',
            body: { cartId },
          });

          if (response.error) {
            // Handle error - could be string or object
            const errorMessage = typeof response.error === 'string' 
              ? response.error 
              : (response.error?.message || 'An error occurred');
            set({ error: errorMessage });
            return;
          }

          if (response.data?.cart) {
            set({ cart: response.data.cart });
            get().saveCartId(response.data.cart.id);
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to remove discount';
          set({ error: errorMessage });
        } finally {
          set({ loading: false });
        }
      },

      clearCart: async () => {
        get().clearCartId();
        set({ cart: null });
      },
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({}),
    }
  )
);
