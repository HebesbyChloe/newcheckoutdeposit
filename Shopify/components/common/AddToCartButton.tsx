'use client';

import { memo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useCart } from '@/hooks/useCart';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

interface AddToCartButtonProps {
  variantId: string;
  available: boolean;
  className?: string;
  title: string;
  imageUrl: string;
  priceAmount: string;
  currencyCode: string;
  productHandle?: string;
}

function AddToCartButton({
  variantId,
  available,
  className,
  title,
  imageUrl,
  priceAmount,
  currencyCode,
  productHandle,
}: AddToCartButtonProps) {
  const { addToCart, loading, error } = useCart();
  const [success, setSuccess] = useState(false);

  const handleAddToCart = useCallback(async () => {
    if (!available) {
      return;
    }

    if (variantId === '88889999') {
      toast.warning('Coming soon: Add to cart feature will be available shortly');
      return;
    }
    
    await addToCart({
      source: 'shopify',
      variantId,
      title,
      imageUrl,
      price: { amount: priceAmount, currencyCode },
      quantity: 1,
      productHandle,
    });

    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
    
    // Open cart panel (cart is already updated by addToCart)
    const { useCartStore } = await import('@/stores/cartStore');
    useCartStore.getState().openCartPanel();
  }, [available, variantId, title, imageUrl, priceAmount, currencyCode, productHandle, addToCart]);

  return (
    <div className="w-full">
      <Button
        onClick={handleAddToCart}
        disabled={loading || !available || success}
        className={cn(
          "w-full focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2",
          success && "bg-green-600 hover:bg-green-600",
          className
        )}
        aria-label={loading ? 'Adding to cart, please wait' : available ? 'Add to cart' : 'Out of stock'}
        aria-busy={loading}
        aria-disabled={loading || !available || success}
      >
        {loading ? (
          'Adding...'
        ) : success ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Added!
          </>
        ) : available ? (
          'Add to Cart'
        ) : (
          'Out of Stock'
        )}
      </Button>
      {error && !success && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="text-sm text-destructive mt-2"
        >
          {typeof error === 'string' ? error : (error?.message || 'An error occurred')}
        </div>
      )}
    </div>
  );
}

export default memo(AddToCartButton);
