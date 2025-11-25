'use client';

import { Product, getMetafield, getDiamondSpecs } from '@/types/product';
import ProductDetailHeaderModule, { ProductDetailHeaderModuleProps } from './ProductDetailHeaderModule';
import { Heart, Share2 } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '@/services/api-client';
import { isExternalProduct } from '@/utils/external-product';

interface ProductDetailHeaderModuleAdapterProps {
  product: Product;
  className?: string;
  onAddToCart?: () => void | Promise<void>;
  onWishlist?: () => void;
  onShare?: () => void;
}

export default function ProductDetailHeaderModuleAdapter({
  product,
  className,
  onAddToCart,
  onWishlist,
  onShare,
}: ProductDetailHeaderModuleAdapterProps) {
  const [loading, setLoading] = useState(false);
  
  if (!product) {
    return null;
  }
  
  const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
  const firstVariant = product.variants?.edges?.[0]?.node;
  const specs = getDiamondSpecs(product);
  
  // Build specs array
  const productSpecs: ProductDetailHeaderModuleProps['specs'] = [];
  if (specs.shape) productSpecs.push({ label: 'Shape', value: specs.shape });
  if (specs.carat > 0) productSpecs.push({ label: 'Carat', value: `${specs.carat} ct` });
  if (specs.cut) productSpecs.push({ label: 'Cut', value: specs.cut });
  if (specs.color) productSpecs.push({ label: 'Color', value: specs.color });
  if (specs.clarity) productSpecs.push({ label: 'Clarity', value: specs.clarity });
  if (specs.gradingLab) productSpecs.push({ label: 'Grading Lab', value: specs.gradingLab });
  
  // Stock status
  const stockStatus = firstVariant?.availableForSale 
    ? { label: 'In Stock', variant: 'secondary' as const }
    : { label: 'Out of Stock', variant: 'destructive' as const };

  // Handle add to cart
  const handleAddToCart = async () => {
    // For external products, use the provided handler
    if (isExternalProduct(product)) {
      if (onAddToCart) {
        setLoading(true);
        try {
          await onAddToCart();
        } catch (error) {
          console.error('Error adding external product to cart:', error);
        } finally {
          setLoading(false);
        }
      }
      return;
    }
    
    // For regular Shopify products
    if (!firstVariant?.availableForSale) return;
    
    setLoading(true);
    try {
      if (onAddToCart) {
        await onAddToCart();
      } else {
        // Default add to cart behavior
        const response = await apiClient.post<{ checkoutUrl: string }>('/api/checkout', {
          variantId: firstVariant.id,
          quantity: 1,
        });
        if (response.data?.checkoutUrl) {
          window.location.href = response.data.checkoutUrl;
        }
      }
    } catch (error) {
      console.error('Error adding product to cart:', error);
    } finally {
      setLoading(false);
    }
  };

  // Secondary actions
  const secondaryActions: ProductDetailHeaderModuleProps['secondaryActions'] = [];
  if (onWishlist) {
    secondaryActions.push({
      label: 'Wishlist',
      icon: <Heart className="h-4 w-4" />,
      onClick: onWishlist,
    });
  }
  if (onShare) {
    secondaryActions.push({
      label: 'Share',
      icon: <Share2 className="h-4 w-4" />,
      onClick: onShare,
    });
  }

  return (
    <div className={className}>
      <ProductDetailHeaderModule
        title={product.title || 'Product'}
        specs={productSpecs}
        price={price}
        stockStatus={stockStatus}
        primaryAction={{
          label: loading ? 'Adding...' : (firstVariant?.availableForSale ? 'Add to Cart' : 'Out of Stock'),
          onClick: handleAddToCart,
        }}
        secondaryActions={secondaryActions}
        shippingDate={getMetafield(product, 'custom', 'shipping_date') || undefined}
      />
    </div>
  );
}

