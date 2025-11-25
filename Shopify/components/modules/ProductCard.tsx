'use client';

import { memo, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Product } from '@/types/product';
import AddToCartButton from '@/components/common/AddToCartButton';
import { isExternalProduct, getExternalItemId, getExternalSourceType, getExternalProductPayload } from '@/utils/external-product';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  href?: string; // Optional custom href override
  collection?: 'natural' | 'labgrown'; // Collection for external products
}

function ProductCard({ product, href, collection = 'labgrown' }: ProductCardProps) {
  const { addToCart } = useCart();
  const image = useMemo(() => product.images?.edges?.[0]?.node, [product.images]);
  const price = useMemo(() => parseFloat(product.priceRange?.minVariantPrice?.amount || '0'), [product.priceRange]);
  const currency = useMemo(() => product.priceRange?.minVariantPrice?.currencyCode || 'USD', [product.priceRange]);
  const firstVariant = useMemo(() => product.variants?.edges?.[0]?.node, [product.variants]);

  // Handle external product add to cart
  const handleExternalAddToCart = useCallback(async () => {
    if (!isExternalProduct(product)) {
      return;
    }

    const itemId = getExternalItemId(product);
    if (!itemId) {
      toast.error('Unable to add product to cart: Missing product ID');
      return;
    }

    const sourceType = getExternalSourceType(product, collection);
    const imageUrl = product.images?.edges?.[0]?.node?.url || '';
    const payload = getExternalProductPayload(product);

    try {
      await addToCart({
        source: 'external',
        externalId: itemId,
        title: product.title,
        imageUrl,
        price: { amount: price.toFixed(2), currencyCode: currency },
        quantity: 1,
        productHandle: product.handle,
        attributes: [
          { key: '_external_id', value: itemId },
          { key: '_source_type', value: sourceType },
        ],
        payload,
      });

      // Open cart panel
      if (typeof window !== 'undefined') {
        const { useCartStore } = await import('@/stores/cartStore');
        useCartStore.getState().openCartPanel();
      }

      toast.success('Product added to cart');
    } catch (error) {
      console.error('Error adding external product to cart:', error);
      toast.error('Failed to add product to cart');
    }
  }, [product, collection, price, currency, addToCart]);

  // Get sale price if available
  const compareAtPrice = useMemo(() =>
    firstVariant?.compareAtPrice?.amount
      ? parseFloat(firstVariant.compareAtPrice.amount)
      : null,
    [firstVariant]
  );
  const isOnSale = useMemo(() => compareAtPrice !== null && compareAtPrice > price, [compareAtPrice, price]);

  // Clean description (remove HTML tags)
  const cleanDescription = useMemo(() =>
    product.description
      ? product.description.replace(/<[^>]*>/g, '').trim()
      : '',
    [product.description]
  );

  return (
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border border-border/50 hover:border-[#DEC481]/50 bg-white flex flex-col h-full">
      {/* Fixed Image Area */}
      <Link href={href || `/products/${product.handle}`}>
        <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-[#f9fafb] via-[#f2f4f7] to-[#e5e7eb]">
          {image ? (
            <>
              <img
                src={image.url}
                alt={image.altText || product.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-muted-foreground text-sm">No Image</span>
            </div>
          )}
          {/* Luxury shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </div>
      </Link>

      <CardContent className="p-6 space-y-4 bg-white flex-1 flex flex-col">
        {/* Fixed Title Area */}
        <Link href={href || `/products/${product.handle}`}>
          <h3 className="font-semibold text-[#1d2939] text-lg mb-0 line-clamp-2 hover:text-[#3d6373] transition-colors leading-tight min-h-[3.5rem]">
            {product.title}
          </h3>
        </Link>

        {/* Fixed Description Area */}
        <div className="min-h-[3rem]">
          {cleanDescription ? (
            <p className="text-[#667085] text-sm line-clamp-2 leading-relaxed">
              {cleanDescription.substring(0, 80)}...
            </p>
          ) : (
            <div className="text-[#667085] text-sm leading-relaxed">&nbsp;</div>
          )}
        </div>

        {/* Fixed Price Section */}
        <div className="pt-2 border-t border-border/30 min-h-[4rem] flex flex-col justify-center">
          {isOnSale && compareAtPrice ? (
            <div className="space-y-1">
              <p className="text-lg font-semibold text-[#dc2626] line-through opacity-70">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency,
                }).format(compareAtPrice)}
              </p>
              <p className="text-2xl font-bold text-[#3d6373] tracking-tight">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency,
                }).format(price)}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="h-[1.75rem]">&nbsp;</div>
              <p className="text-2xl font-bold text-[#3d6373] tracking-tight">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency,
                }).format(price)}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Fixed Add to Cart Button Area */}
      <CardFooter className="p-6 pt-0 bg-white min-h-[3.5rem]">
        {isExternalProduct(product) ? (
          <button
            onClick={handleExternalAddToCart}
            className="w-full bg-[#3d6373] text-white px-6 py-3 rounded-md hover:bg-[#2d4f5f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Cart
          </button>
        ) : firstVariant ? (
          <AddToCartButton
            variantId={firstVariant.id}
            available={firstVariant.availableForSale}
            className="w-full"
            title={product.title}
            imageUrl={product.featuredImage?.url || ''}
            priceAmount={firstVariant.price?.amount || '0'}
            currencyCode={firstVariant.price?.currencyCode || 'USD'}
            productHandle={product.handle}
          />
        ) : null}
      </CardFooter>
    </Card>
  );
}

export default memo(ProductCard);