// Hook for cart operations - now uses global cartStore
import { UseCartReturn } from '@/types/hook.types';
import { useCartStore } from '@/stores/cartStore';

export function useCart(): UseCartReturn {
  const cart = useCartStore((state) => state.cart);
  const loading = useCartStore((state) => state.loading);
  const error = useCartStore((state) => state.error);
  const getCart = useCartStore((state) => state.getCart);
  const addToCart = useCartStore((state) => state.addToCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const applyDiscount = useCartStore((state) => state.applyDiscount);
  const removeDiscount = useCartStore((state) => state.removeDiscount);
  const clearCart = useCartStore((state) => state.clearCart);

  return {
    cart,
    addToCart,
    updateQuantity,
    removeItem,
    applyDiscount,
    removeDiscount,
    clearCart,
    getCart,
    loading,
    error,
  };
}

