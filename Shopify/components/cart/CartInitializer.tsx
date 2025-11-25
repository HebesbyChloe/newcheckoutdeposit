'use client';

import { useEffect, useRef } from 'react';
import { useCartStore } from '@/stores/cartStore';

export default function CartInitializer() {
  const getCart = useCartStore((state) => state.getCart);
  const getCartId = useCartStore((state) => state.getCartId);
  const cart = useCartStore((state) => state.cart);
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once on mount, and only if we have a cartId but no cart data
    if (initialized.current) return;
    
    const cartId = getCartId();
    if (cartId && !cart) {
      initialized.current = true;
      getCart();
    } else if (!cartId) {
      initialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return null;
}

