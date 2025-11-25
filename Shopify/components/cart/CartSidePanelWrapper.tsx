'use client';

import { useCartStore } from '@/stores/cartStore';
import CartSidePanel from './CartSidePanel';

export default function CartSidePanelWrapper() {
  const isOpen = useCartStore((state) => state.isPanelOpen);
  const closePanel = useCartStore((state) => state.closeCartPanel);
  
  return <CartSidePanel isOpen={isOpen} onClose={closePanel} />;
}

