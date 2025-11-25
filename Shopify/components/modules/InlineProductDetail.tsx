'use client';

import Link from 'next/link';
import { Product } from '@/types/product';
import AddToCartButton from '@/components/common/AddToCartButton';
import { cn } from '@/utils/cn';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import {
  isExternalProduct,
  getExternalItemId,
  getExternalSourceType,
  getExternalProductPayload,
} from '@/utils/external-product';
import { toast } from 'sonner';
import { useCallback } from 'react';

interface InlineProductDetailProps {
  product: Product;
  isOpen: boolean;
  // Which external collection this diamond belongs to (affects source_type)
  collection?: 'natural' | 'labgrown';
}

export default function InlineProductDetail({
  product,
  isOpen,
  collection = 'labgrown',
}: InlineProductDetailProps) {
  const image = product.images?.edges?.[0]?.node;
  const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
  const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD';
  const firstVariant = product.variants?.edges?.[0]?.node;
  
  // Get sale price if available
  const compareAtPrice = firstVariant?.compareAtPrice?.amount 
    ? parseFloat(firstVariant.compareAtPrice.amount)
    : null;
  const isOnSale = compareAtPrice !== null && compareAtPrice > price;
  
  // Clean description (remove HTML tags)
  const cleanDescription = product.description 
    ? product.description.replace(/<[^>]*>/g, '').trim()
    : '';

  const { addToCart, loading } = useCart();

  const handleExternalAddToCart = useCallback(async () => {
    if (!isExternalProduct(product)) return;

    const itemId = getExternalItemId(product);
    if (!itemId) {
      toast.error('Unable to add product to cart: Missing product ID');
      return;
    }

    // Use collection to distinguish natural vs labgrown when no explicit metafield
    const sourceType = getExternalSourceType(product, collection);
    const payload = getExternalProductPayload(product);
    const imageUrl = image?.url || product.featuredImage?.url || '';

    try {
      await addToCart({
        source: 'external',
        externalId: itemId,
        title: product.title,
        imageUrl,
        price: { amount: price.toFixed(2), currencyCode: currency },
        quantity: 1,
        attributes: [
          { key: '_external_id', value: itemId },
          { key: '_source_type', value: sourceType },
        ],
        payload,
      });

      useCartStore.getState().openCartPanel();
      toast.success('Product added to cart');
    } catch (error) {
      console.error('Error adding external product to cart from inline detail:', error);
      toast.error('Failed to add product to cart');
    }
  }, [product, image, price, currency, collection, addToCart]);

  return (
    <tr>
      <td colSpan={7} className="p-0">
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="bg-gradient-to-r from-[#f9fafb] to-[#f2f4f7] border-t border-b border-[#DEC481]/30 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side - Image */}
              <div className="flex items-center justify-center">
                {image ? (
                  <Link href={`/products/${product.handle}`}>
                    <div className="relative aspect-square w-full max-w-[300px] overflow-hidden bg-gradient-to-br from-[#f9fafb] via-[#f2f4f7] to-[#e5e7eb] rounded-lg border border-border/30 hover:border-[#DEC481]/50 transition-colors">
                      <img
                        src={image.url}
                        alt={image.altText || product.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </Link>
                ) : (
                  <div className="flex h-full items-center justify-center w-full max-w-[300px] aspect-square bg-muted rounded-lg">
                    <span className="text-muted-foreground text-sm">No Image</span>
                  </div>
                )}
              </div>

              {/* Right Side - Details */}
              <div className="flex flex-col justify-center space-y-4">
                {/* Title */}
                <Link href={`/products/${product.handle}`}>
                  <h3 className="font-semibold text-[#1d2939] text-xl hover:text-[#3d6373] transition-colors">
                    {product.title}
                  </h3>
                </Link>

                {/* Description */}
                {cleanDescription && (
                  <p className="text-[#667085] text-sm leading-relaxed">
                    {cleanDescription}
                  </p>
                )}

                {/* Price Section */}
                <div className="pt-2 border-t border-border/30">
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
                    <p className="text-2xl font-bold text-[#3d6373] tracking-tight">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: currency,
                      }).format(price)}
                    </p>
                  )}
                </div>

                {/* Add to Cart Button */}
                {isExternalProduct(product) ? (
                  <div className="pt-2">
                    <button
                      onClick={handleExternalAddToCart}
                      disabled={loading}
                      className="w-full md:w-auto min-w-[200px] bg-[#2c5f6f] hover:bg-[#234a56] text-white px-6 py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Adding...' : 'Add to Cart'}
                    </button>
                  </div>
                ) : (
                  firstVariant && (
                    <div className="pt-2">
                      <AddToCartButton
                        variantId={firstVariant.id}
                        available={firstVariant.availableForSale}
                        className="w-full md:w-auto min-w-[200px]"
                        title={product.title}
                        // Prefer the same image used in the card, then fall back to featuredImage
                        imageUrl={image?.url || product.featuredImage?.url || ''}
                        // Ensure a non-empty price is always sent
                        priceAmount={
                          firstVariant.price?.amount ||
                          product.priceRange?.minVariantPrice?.amount ||
                          price.toString()
                        }
                        currencyCode={
                          firstVariant.price?.currencyCode ||
                          product.priceRange?.minVariantPrice?.currencyCode ||
                          currency
                        }
                        productHandle={product.handle}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}




