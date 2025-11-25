import type { InternalCartItemSource } from '@/types/internal-cart.types';

type SourceType = Extract<InternalCartItemSource, 'labgrown' | 'natural'>;

interface CachedDummyProduct {
  productId: string;
  expiresAt: number;
}

interface CachedVariant {
  productId: string;
  variantId: string;
  updatedAt: number;
  expiresAt: number;
}

class ExternalDiamondCache {
  private dummyProducts: Map<SourceType, CachedDummyProduct> = new Map();
  private variants: Map<string, CachedVariant> = new Map();

  // 1 hour TTL by default
  private readonly TTL_MS = 60 * 60 * 1000;

  getDummyProductId(sourceType: SourceType): string | null {
    const cached = this.dummyProducts.get(sourceType);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.dummyProducts.delete(sourceType);
      return null;
    }
    return cached.productId;
  }

  setDummyProductId(sourceType: SourceType, productId: string): void {
    this.dummyProducts.set(sourceType, {
      productId,
      expiresAt: Date.now() + this.TTL_MS,
    });
  }

  getVariant(externalId: string): { productId: string; variantId: string } | null {
    const cached = this.variants.get(externalId);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.variants.delete(externalId);
      return null;
    }
    return { productId: cached.productId, variantId: cached.variantId };
  }

  setVariant(externalId: string, productId: string, variantId: string): void {
    this.variants.set(externalId, {
      productId,
      variantId,
      updatedAt: Date.now(),
      expiresAt: Date.now() + this.TTL_MS,
    });
  }
}

export const externalDiamondCache = new ExternalDiamondCache();


