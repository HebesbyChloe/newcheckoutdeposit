'use client';

import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import { Badge } from '@/components/ui/badge';

export default function CartIcon() {
  const { cart } = useCart();
  const openCartPanel = useCartStore((state) => state.openCartPanel);
  const itemCount = cart?.totalQuantity || 0;

  return (
    <button
      onClick={openCartPanel}
      className="relative p-2 text-[#1d2939] hover:text-[#3d6373] transition-colors focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2 rounded"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingCart className="h-6 w-6" />
      {itemCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </Badge>
      )}
    </button>
  );
}

