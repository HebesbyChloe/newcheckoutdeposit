'use client';

import { useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { Card } from '@/components/ui/card';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import DiscountCodeInput from '@/components/cart/DiscountCodeInput';
import EmptyCart from '@/components/cart/EmptyCart';
import ShareCart from '@/components/modules/ShareCart';
import { Cart, CartLine } from '@/types/api.types';
import { apiClient } from '@/services/api-client';
import { useCartStore } from '@/stores/cartStore';
import { Skeleton, CardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function CartPage() {
  const { 
    cart, 
    updateQuantity, 
    removeItem, 
    applyDiscount, 
    removeDiscount, 
    getCart,
    loading,
    error 
  } = useCart();

  useEffect(() => {
    getCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleCheckout = async () => {
    try {
      const cartId =
        typeof window !== 'undefined'
          ? useCartStore.getState().getCartId()
          : null;

      if (!cartId) {
        alert('Cart not found. Please add items again.');
        return;
      }

      const response = await apiClient.post<{ checkoutUrl: string }>(
        '/api/checkout',
        { cartId, cart: cart as Cart }
      );

      if (response.error || !response.data?.checkoutUrl) {
        alert(response.error || 'Failed to start checkout');
        return;
      }

      window.location.href = response.data.checkoutUrl;
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('Failed to start checkout. Please try again.');
    }
  };

  if (loading && !cart) {
    return (
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">
        <Skeleton className="h-9 w-48 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          <div className="lg:col-span-1">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        <h1 className="text-3xl font-bold text-[#1d2939] mb-8">Shopping Cart</h1>
        <EmptyCart />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">
      <h1 className="text-3xl font-bold text-[#1d2939] mb-8">Shopping Cart</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[#1d2939]">
                {cart.totalQuantity} {cart.totalQuantity === 1 ? 'item' : 'items'}
              </h2>
            </div>

            <div className="space-y-0">
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
          </Card>

          {/* Discount Code Input */}
          <div className="mt-6">
            <DiscountCodeInput
              appliedCodes={cart.discountCodes || []}
              onApply={applyDiscount}
              onRemove={removeDiscount}
              loading={loading}
            />
          </div>

          {/* Share Cart - disabled for internal cart (no persistent checkout URL) */}
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1">
          <CartSummary
            cart={cart}
            onCheckout={handleCheckout}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

