'use client';

import { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import AddToCartButton from '@/components/common/AddToCartButton';
import { Heart, Share2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ProductCompactActionsProps {
  product: Product;
  className?: string;
  variant?: 'default' | 'compact';
}

export default function ProductCompactActions({ 
  product, 
  className,
  variant = 'default'
}: ProductCompactActionsProps) {
  if (!product) {
    return null;
  }

  const firstVariant = product.variants?.edges?.[0]?.node;
  const variantId = firstVariant?.id || '';
  const available = firstVariant?.availableForSale || false;
  const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
  const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD';

  if (!variantId) {
    return (
      <div className={cn("space-y-2", className)}>
        <Button disabled className="w-full">No variants available</Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {variant === 'default' ? (
        <>
          <AddToCartButton
            variantId={variantId}
            available={available}
            className="w-full"
            title={product.title}
            imageUrl={product.featuredImage?.url || ''}
            priceAmount={price.toString()}
            currencyCode={currency}
            productHandle={product.handle}
          />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Wishlist
            </Button>
            <Button variant="outline" className="flex-1" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <AddToCartButton
            variantId={variantId}
            available={available}
            className="flex-1"
            title={product.title}
            imageUrl={product.featuredImage?.url || ''}
            priceAmount={price.toString()}
            currencyCode={currency}
            productHandle={product.handle}
          />
          <Button variant="outline" size="icon">
            <Heart className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

