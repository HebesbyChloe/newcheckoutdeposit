'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCart } from '@/hooks/useCart';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import EmptyCart from '@/components/cart/EmptyCart';
import { CartLine, GatewayResponse } from '@/types/api.types';
import { cn } from '@/utils/cn';
import { useCartStore } from '@/stores/cartStore';
import { apiClient } from '@/services/api-client';

interface CartSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Separate component for debug info to avoid hydration issues
// Only render on client-side after mount and in development
function CartDebugInfo({ cart }: { cart: any }) {
  const [mounted, setMounted] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  useEffect(() => {
    // Only set mounted on client-side
    if (typeof window !== 'undefined') {
      setMounted(true);
      setCartId(useCartStore.getState().getCartId());
    }
  }, []);

  // Don't render anything on server or before mount to avoid hydration mismatch
  // Also don't render in production
  if (typeof window === 'undefined' || !mounted || process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
      <p>Debug: Cart is {cart ? 'present' : 'null'}</p>
      <p>Lines: {cart?.lines ? `${cart.lines.length} items` : 'no lines property'}</p>
      <p>Total Quantity: {cart?.totalQuantity || 0}</p>
      <p>Cart ID: {cartId || 'none'}</p>
    </div>
  );
}

export default function CartSidePanel({ isOpen, onClose }: CartSidePanelProps) {
  const {
    cart: hookCart,
    updateQuantity,
    removeItem,
    getCart,
    loading: hookLoading,
    error
  } = useCart();

  // Prefer cart from store (which is updated immediately when items are added)
  const cartStoreCart = useCartStore((state) => state.cart);
  const cartStoreLoading = useCartStore((state) => state.loading);
  
  // Use state for cartId to avoid hydration issues (localStorage is only available on client)
  const [cartId, setCartId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    // Only get cartId on client-side after mount
    if (typeof window !== 'undefined') {
      setMounted(true);
      setCartId(useCartStore.getState().getCartId());
    }
  }, []);

  // Use store cart if available, otherwise use hook cart
  const cart = cartStoreCart || hookCart;
  const loading = cartStoreLoading || hookLoading;

  // Debug logging
  useEffect(() => {
    if (isOpen && process.env.NODE_ENV !== 'production') {
      console.log('CartSidePanel - Cart state:', {
        isOpen,
        hasStoreCart: !!cartStoreCart,
        hasHookCart: !!hookCart,
        usingCart: cart ? 'store' : 'hook',
        linesCount: cart?.lines?.length || 0,
        totalQuantity: cart?.totalQuantity || 0,
        cartId: useCartStore.getState().getCartId(),
        cart: cart,
      });
    }
  }, [isOpen, cartStoreCart, hookCart, cart]);

  // Fetch cart when panel opens ONLY if we truly don't have a cart
  // Don't auto-fetch if we just added items (cart should already be set)
  useEffect(() => {
    if (isOpen) {
      const cartId = useCartStore.getState().getCartId();
      const currentCart = useCartStore.getState().cart;

      if (process.env.NODE_ENV !== 'production') {
        console.log('CartSidePanel useEffect - Panel opened:', {
          isOpen,
          cartId,
          hasCurrentCart: !!currentCart,
          currentCartLinesCount: currentCart?.lines?.length || 0,
          currentCartTotalQuantity: currentCart?.totalQuantity || 0,
          willFetch: !currentCart && cartId,
        });
      }

      // ONLY fetch if we have a cart ID but NO cart at all
      // Don't fetch if cart exists (even if empty) - it might be in the process of being updated
      if (cartId && !currentCart) {
        // Delay to let any pending cart updates complete
        const timer = setTimeout(() => {
          // Double-check cart still doesn't exist before fetching
          const stillNoCart = !useCartStore.getState().cart;
          if (stillNoCart) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('CartSidePanel: Fetching cart - no cart in store');
            }
            getCart();
          }
        }, 300);
        return () => clearTimeout(timer);
      } else if (process.env.NODE_ENV !== 'production') {
        console.log('CartSidePanel: Not fetching - cart exists or no cartId');
      }
    }
  }, [isOpen, getCart]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleCheckout = async () => {
    try {
      const cartId = useCartStore.getState().getCartId();

      if (!cartId || !cart) {
        alert('Cart not found. Please add items again.');
        return;
      }

      // Gateway endpoint returns: { data: { checkoutUrl }, error: {...} }
      // apiClient wraps it as: { data: { data: { checkoutUrl }, error: {...} }, error: ... }
      const response = await apiClient.post<GatewayResponse<{ checkoutUrl: string }>>(
        '/api/gw/v1/cart/checkout',
        { cartId }
      );

      // Handle apiClient error (from axios/network)
      if (response.error) {
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : (response.error instanceof Error 
              ? response.error.message 
              : (typeof response.error === 'object' && response.error !== null
                  ? (response.error as any).message || (response.error as any).error || JSON.stringify(response.error)
                  : 'An error occurred'));
        console.error('Checkout apiClient error:', response);
        alert(errorMessage);
        return;
      }

      // response.data is the gateway envelope: { data: {...}, error: {...} }
      const gatewayResponse = response.data as GatewayResponse<{ cartId: string; checkoutUrl: string }> | undefined;

      if (!gatewayResponse) {
        console.error('Checkout: No response data', response);
        alert('Failed to get checkout response');
        return;
      }

      // Debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('Checkout response:', {
          hasData: !!gatewayResponse.data,
          hasError: !!gatewayResponse.error,
          dataKeys: gatewayResponse.data ? Object.keys(gatewayResponse.data) : [],
          error: gatewayResponse.error
        });
      }

      // Handle gateway error
      if (gatewayResponse.error) {
        const errorInfo = gatewayResponse.error;
        const errorMessage = typeof errorInfo === 'string'
          ? errorInfo
          : (errorInfo?.message || errorInfo?.code || JSON.stringify(errorInfo));
        console.error('Checkout gateway error:', gatewayResponse.error);
        alert(errorMessage);
        return;
      }

      // Check for checkoutUrl in response
      // Backend returns { cartId, checkoutUrl }, gateway wraps it as { data: { cartId, checkoutUrl } }
      const checkoutUrl = gatewayResponse.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        console.error('Checkout: No checkoutUrl in response', {
          gatewayResponse,
          data: gatewayResponse.data,
          dataType: typeof gatewayResponse.data
        });
        alert('Failed to get checkout URL. Please try again.');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start checkout. Please try again.';
      alert(errorMessage);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Side Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-[#1d2939]">Shopping Cart</h2>
            {mounted && cartId && (
              <p className="text-xs text-[#667085] mt-1">
                Cart ID: {cartId}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto">
          {!mounted ? (
            // Render empty state during SSR to match initial client render
            <div className="p-4">
              <EmptyCart />
            </div>
          ) : loading && !cart ? (
            <div className="p-4">
              <div className="animate-pulse space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ) : !cart || !cart.lines || cart.lines.length === 0 ? (
            <div className="p-4">
              <CartDebugInfo cart={cart} />
              <EmptyCart />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">
                    {typeof error === 'string' ? error : (error?.message || 'An error occurred')}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {cart.lines.map((item: CartLine) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                    loading={loading}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Summary and Checkout */}
        {cart && cart.lines.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <CartSummary
              cart={cart}
              onCheckout={handleCheckout}
              loading={loading}
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 border-gray-200"
                onClick={() => {
                  if (confirm('This will clear your cart and reload the page. Are you sure?')) {
                    useCartStore.getState().clearCartId();
                    window.location.reload();
                  }
                }}
              >
                Reset Cart (Fix Issues)
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

