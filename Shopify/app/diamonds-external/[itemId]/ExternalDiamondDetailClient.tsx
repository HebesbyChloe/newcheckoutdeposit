'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DiamondDetail from '@/components/DiamondDetail';
import type { Product } from '@/types/product';
import type { DiamondDetailData } from '@/types/external-cart.types';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/stores/cartStore';
import {
  isExternalProduct,
  getExternalItemId,
  getExternalSourceType,
  getExternalProductPayload,
} from '@/utils/external-product';
import { getMetafield } from '@/types/product';

interface ExternalDiamondDetailClientProps {
  product: Product;
  collection: 'natural' | 'labgrown';
  diamond: DiamondDetailData;
}

export default function ExternalDiamondDetailClient({
  product,
  collection,
  diamond,
}: ExternalDiamondDetailClientProps) {
  const router = useRouter();
  const { addToCart, loading } = useCart();

  const rawDocument = useMemo(() => {
    try {
      const value = getMetafield(product, 'external', '_raw_document');
      if (!value) return null;
      if (typeof value === 'string') {
        return JSON.parse(value);
      }
      return value;
    } catch {
      return null;
    }
  }, [product]);

  const handleAddToCart = useCallback(async () => {
    if (!isExternalProduct(product)) {
      return;
    }

    const externalId = getExternalItemId(product);
    if (!externalId) {
      toast.error('Unable to add diamond to cart: Missing external ID');
      return;
    }

    const sourceType = getExternalSourceType(product, collection);
    const price = diamond.price || parseFloat(product.priceRange?.minVariantPrice?.amount || '0') || 0;
    const imageUrl =
      diamond.images?.[0] ||
      product.images?.edges?.[0]?.node?.url ||
      product.featuredImage?.url ||
      '';
    const payload = getExternalProductPayload(product);

    try {
      await addToCart({
        source: 'external',
        externalId,
        title: product.title || diamond.title,
        imageUrl,
        price: {
          amount: price.toFixed(2),
          currencyCode:
            product.priceRange?.minVariantPrice?.currencyCode || 'USD',
        },
        quantity: 1,
        productHandle: product.handle,
        attributes: [
          { key: '_external_id', value: externalId },
          { key: '_source_type', value: sourceType },
        ],
        payload,
      });

      useCartStore.getState().openCartPanel();
      toast.success('Diamond added to cart');
    } catch (error) {
      console.error(
        '[ExternalDiamondDetailClient] Failed to add diamond to cart',
        error,
      );
      toast.error('Failed to add diamond to cart');
    }
  }, [product, collection, diamond, addToCart]);

  const handleInquire = useCallback(() => {
    // Simple placeholder: route to contact or inquiries page if available
    try {
      router.push('/contact');
    } catch {
      // If contact page does not exist, this will be a no-op
    }
  }, [router]);

  return (
    <>
      <DiamondDetail
        diamond={diamond}
        onAddToCart={handleAddToCart}
        addingToCart={loading}
        onInquire={handleInquire}
      />

      {rawDocument && (
        <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              Raw External API Response (Debug)
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              This shows the original external feed document stored on the
              product (`external._raw_document`). Only visible for debugging.
            </p>
            <pre className="max-h-[480px] overflow-auto rounded bg-background p-3 text-[11px] leading-snug text-muted-foreground">
              {JSON.stringify(rawDocument, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </>
  );
}


