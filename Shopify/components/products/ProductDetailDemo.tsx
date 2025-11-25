'use client';

import { useMemo, useCallback } from 'react';
import { Product, Media, Video, MediaImage, getMetafield } from '@/types/product';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ProductDetailHeaderModuleAdapter from '@/components/products/ProductDetailHeaderModuleAdapter';
import SellingPointsModuleAdapter from '@/components/products/SellingPointsModuleAdapter';
import AccordionModuleAdapter from '@/components/products/AccordionModuleAdapter';
import ProductGalleryVideo from '@/components/products/ProductGalleryVideo';
import ExternalVideo360 from '@/components/products/ExternalVideo360';
import { cn } from '@/utils/cn';
import { Play, Code } from 'lucide-react';
import { useMediaGallery } from '@/hooks/useMediaGallery';
import { getProductMedia, isVideo } from '@/utils/transformers/product-transformer';
import { isExternalProduct, getExternalItemId, getExternalSourceType, getExternalProductPayload } from '@/utils/external-product';
import { apiClient } from '@/services/api-client';
import { toast } from 'sonner';

interface ProductDetailDemoProps {
  product: Product;
  className?: string;
  collection?: 'natural' | 'labgrown'; // Collection for external products
}

export default function ProductDetailDemo({ 
  product, 
  className,
  collection = 'labgrown',
}: ProductDetailDemoProps) {
  // Use provided collection or default to labgrown
  const productCollection = collection;
  
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
      
      const sourceType = getExternalSourceType(product, productCollection);
      const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
      const image = product.images?.edges?.[0]?.node?.url || '';
      const payload = getExternalProductPayload(product);
      
      // Get existing cart ID from localStorage
      const existingCartId = typeof window !== 'undefined' 
        ? localStorage.getItem('shopify_cart_id') 
        : null;
      
      // Get existing cart items from Zustand store (to preserve them if cart is expired)
      const existingCart = typeof window !== 'undefined' 
        ? (await import('@/stores/cartStore')).useCartStore.getState().cart
        : null;

      const existingCartLines = existingCart?.lines?.map(line => ({
        merchandiseId: line.merchandise.id,
        quantity: line.quantity,
        attributes: line.attributes,
      })) || [];
      
      try {
        const response = await apiClient.post<{ 
          checkoutUrl: string; 
          cart?: any;
          cartId?: string;
        }>('/api/external-cart/add', {
          external_id: itemId,
          source_type: sourceType,
          title: product.title,
          image: image,
          price: price,
          payload: payload,
          cartId: existingCartId || undefined,
          existingCartLines: existingCartLines.length > 0 ? existingCartLines : undefined,
        });
      
      // Debug: Log the full response
      if (process.env.NODE_ENV !== 'production') {
        console.log('External cart add - Full API response:', {
          hasError: !!response.error,
          error: response.error,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          hasCart: !!response.data?.cart,
          hasCartId: !!response.data?.cartId,
          hasCheckoutUrl: !!response.data?.checkoutUrl,
          fullResponse: response,
        });
      }
      
      if (response.error) {
        toast.error(response.error || 'Failed to add product to cart');
        return;
      }
      
      // If cart was returned, update the cart store and open cart panel
      if (response.data?.cart) {
        // Update cart store if available
        if (typeof window !== 'undefined') {
          const { useCartStore } = await import('@/stores/cartStore');
          const cart = response.data.cart;
          // Extract cart ID and clean it (remove query parameters like ?key=...)
          let cartId = response.data.cartId || cart.id;
          if (cartId && cartId.includes('?')) {
            cartId = cartId.split('?')[0];
          }
          
          // Debug logging
          if (process.env.NODE_ENV !== 'production') {
            console.log('Setting cart in store:', {
              cartId,
              hasCart: !!cart,
              linesCount: cart?.lines?.length || 0,
              totalQuantity: cart?.totalQuantity || 0,
              cart: cart,
            });
          }
          
          // Save cart ID first
          if (cartId) {
            useCartStore.getState().saveCartId(cartId);
          }
          
          // Set the cart directly (don't fetch again - use the one we just got)
          useCartStore.getState().setCart(cart);
          
          // Verify cart was set
          const setCart = useCartStore.getState().cart;
          if (process.env.NODE_ENV !== 'production') {
            console.log('Cart after setting:', {
              hasCart: !!setCart,
              linesCount: setCart?.lines?.length || 0,
              totalQuantity: setCart?.totalQuantity || 0,
            });
          }
          
          // Open cart panel
          useCartStore.getState().openCartPanel();
        }
        toast.success('Product added to cart');
      } else if (response.data?.checkoutUrl || response.data?.cartId) {
        // Fallback: We have checkout URL or cartId but no cart object
        // Try to extract cart ID and fetch the cart
        if (typeof window !== 'undefined') {
          const { useCartStore } = await import('@/stores/cartStore');
          
          let cartIdToUse = response.data.cartId;
          
          // If no cartId, try to extract from checkout URL
          if (!cartIdToUse && response.data.checkoutUrl) {
            const checkoutUrl = response.data.checkoutUrl;
            const cartIdMatch = checkoutUrl.match(/\/cart\/c\/([^?]+)/);
            if (cartIdMatch && cartIdMatch[1]) {
              cartIdToUse = cartIdMatch[1];
            }
          }
          
          if (cartIdToUse) {
            if (process.env.NODE_ENV !== 'production') {
              console.log('No cart in response, fetching cart by ID:', cartIdToUse);
            }
            useCartStore.getState().saveCartId(cartIdToUse);
            // Fetch the cart
            await useCartStore.getState().getCart();
          } else {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('No cart, cartId, or checkoutUrl with cartId found in response');
            }
          }
          
          // Open cart panel
          useCartStore.getState().openCartPanel();
        }
        toast.success('Product added to cart');
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.error('External cart add failed - no cart, cartId, or checkoutUrl in response');
        }
        toast.error('Failed to add product to cart');
      }
    } catch (error) {
      console.error('Error adding external product to cart:', error);
      toast.error('Failed to add product to cart');
    }
  }, [product, productCollection]);
  // Get all media items (prefer media field, fallback to images)
  const allMedia = useMemo(() => {
    try {
      const media = getProductMedia(product);
      return media;
    } catch (error) {
      console.error('❌ [PRODUCT DETAIL] Error getting product media:', error);
      // Fallback to empty array if there's an error
      return [];
    }
  }, [product]);

  const { selectedMedia, selectedIndex, selectMedia } = useMediaGallery(allMedia, 0);

  // Get external video URL from metafield - check both custom and external namespaces
  // Priority: custom.video_external_url > external.3dviewer_url > external.video_url
  const externalVideoUrl = useMemo(() => {
    return getMetafield(product, 'custom', 'video_external_url') ||
           getMetafield(product, 'custom', 'video-external-url') || // Fallback for hyphenated version
           getMetafield(product, 'external', '3dviewer_url') || // 3DViewer URL from raw document
           getMetafield(product, 'external', 'video_url') || // External feed video URL
           getMetafield(product, 'external', 'video-url'); // Fallback for hyphenated version
  }, [product]);

  // Extract image and certificate URLs for debugging
  // Raw document uses "Image URL" (with space)
  const imagePath = useMemo(() => {
    return getMetafield(product, 'external', 'image_url') ||
           product.images?.edges?.[0]?.node?.url ||
           '';
  }, [product]);

  // Raw document uses "Certificate URL" (with space) or "Online Report URL"
  const certificatePath = useMemo(() => {
    return getMetafield(product, 'external', 'certificate_url') ||
           getMetafield(product, 'external', 'online_report_url') ||
           '';
  }, [product]);

  const videoUrl = useMemo(() => {
    return getMetafield(product, 'external', 'video_url') ||
           getMetafield(product, 'external', '3dviewer_url') ||
           externalVideoUrl ||
           '';
  }, [product, externalVideoUrl]);

  // Debug: Log if no media found
  if (allMedia.length === 0) {
    console.warn('⚠️ [PRODUCT DETAIL] No media found for product:', {
      productId: product.id,
      productHandle: product.handle,
      hasMediaField: !!product.media?.edges,
      mediaCount: product.media?.edges?.length || 0,
      hasImagesField: !!product.images?.edges,
      imagesCount: product.images?.edges?.length || 0,
      imageUrls: product.images?.edges?.map(e => e.node.url) || [],
    });
  }

  return (
    <div className={cn("container mx-auto py-8 px-4", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Product Media Gallery */}
        <div className="space-y-4">
          {/* External Video 360 - Show if available */}
          {externalVideoUrl && (
            <Card>
              <div className="aspect-square relative overflow-hidden rounded-lg">
                <ExternalVideo360
                  videoUrl={externalVideoUrl}
                  className="h-full w-full"
                  autoplay={false}
                  loop={true}
                  muted={true}
                  controls={true}
                />
              </div>
            </Card>
          )}
          
          {/* Regular Media Gallery - Show always, or if no external video */}
          {selectedMedia && (
            <Card>
              <div className="aspect-square relative overflow-hidden rounded-lg">
                {isVideo(selectedMedia) ? (
                  <ProductGalleryVideo
                    video={selectedMedia as Video}
                    className="h-full w-full"
                  />
                ) : (
                  <img
                    src={(selectedMedia as MediaImage).image.url}
                    alt={(selectedMedia as MediaImage).image.altText || product.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </Card>
          )}
          
          {/* Fallback if no media at all */}
          {!selectedMedia && !externalVideoUrl && (
            <Card>
              <div className="aspect-square relative overflow-hidden rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <span className="text-[#667085]">No image available</span>
              </div>
            </Card>
          )}
          {/* Show thumbnail gallery if we have multiple media items */}
          {allMedia.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {allMedia.slice(0, 8).map((media, index) => (
                <Card
                  key={index}
                  className={cn(
                    "cursor-pointer hover:border-[#3d6373] transition-colors",
                    selectedIndex === index && "border-[#3d6373] border-2"
                  )}
                  onClick={() => selectMedia(index)}
                >
                  <div className="aspect-square relative overflow-hidden rounded-lg">
                    {isVideo(media) ? (
                      <>
                        <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <div className="bg-white/90 rounded-full p-2">
                            <Play className="h-4 w-4 text-[#3d6373]" fill="currentColor" />
                          </div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="bg-white/90 rounded-full p-2">
                            <Play className="h-4 w-4 text-[#3d6373]" fill="currentColor" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={(media as MediaImage).image.url}
                        alt={(media as MediaImage).image.altText || product.title}
                      className="h-full w-full object-cover"
                    />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <ProductDetailHeaderModuleAdapter 
            product={product} 
            onAddToCart={isExternalProduct(product) ? handleExternalAddToCart : undefined}
          />
          
          <SellingPointsModuleAdapter product={product} />
          
          <AccordionModuleAdapter product={product} />
        </div>
      </div>

      {/* Debug Section - Show Image/Certificate/Video URLs */}
      <div className="mt-8">
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <h3 className="font-semibold text-lg text-[#1d2939] mb-4">🔍 Media URLs Debug</h3>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded border border-yellow-300">
              <div className="font-semibold text-sm text-[#1d2939] mb-1">Image Path/URL:</div>
              {imagePath ? (
                <div className="space-y-1">
                  <a 
                    href={imagePath} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all text-sm block"
                  >
                    {imagePath}
                  </a>
                  <img 
                    src={imagePath} 
                    alt="Product Image" 
                    className="max-w-xs max-h-32 object-contain border border-gray-300 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-red-600 text-xs mt-1';
                      errorDiv.textContent = '❌ Image failed to load';
                      (e.target as HTMLImageElement).parentElement?.appendChild(errorDiv);
                    }}
                  />
                </div>
              ) : (
                <div className="text-red-600 text-sm">❌ No image path found</div>
              )}
            </div>

            <div className="p-3 bg-white rounded border border-yellow-300">
              <div className="font-semibold text-sm text-[#1d2939] mb-1">Certificate Path/URL:</div>
              {certificatePath ? (
                <div className="space-y-1">
                  <a 
                    href={certificatePath} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all text-sm block"
                  >
                    {certificatePath}
                  </a>
                  <img 
                    src={certificatePath} 
                    alt="Certificate" 
                    className="max-w-xs max-h-32 object-contain border border-gray-300 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'text-red-600 text-xs mt-1';
                      errorDiv.textContent = '❌ Certificate image failed to load';
                      (e.target as HTMLImageElement).parentElement?.appendChild(errorDiv);
                    }}
                  />
                </div>
              ) : (
                <div className="text-red-600 text-sm">❌ No certificate path found</div>
              )}
            </div>

            <div className="p-3 bg-white rounded border border-yellow-300">
              <div className="font-semibold text-sm text-[#1d2939] mb-1">Video URL:</div>
              {videoUrl ? (
                <div className="space-y-1">
                  <a 
                    href={videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all text-sm block"
                  >
                    {videoUrl}
                  </a>
                  <div className="text-xs text-[#667085] mt-1">
                    (Should render in ExternalVideo360 component above)
                  </div>
                </div>
              ) : (
                <div className="text-red-600 text-sm">❌ No video URL found</div>
              )}
            </div>

            <div className="p-3 bg-white rounded border border-yellow-300">
              <div className="font-semibold text-sm text-[#1d2939] mb-1">Media Array Info:</div>
              <div className="text-xs text-[#667085] space-y-1">
                <div>Total media items: {allMedia.length}</div>
                <div>Images count: {product.images?.edges?.length || 0}</div>
                <div>Selected media index: {selectedIndex}</div>
                {product.images?.edges && product.images.edges.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium mb-1">Image URLs in product.images:</div>
                    {product.images.edges.map((edge, idx) => (
                      <div key={idx} className="text-xs break-all pl-2 border-l-2 border-gray-300">
                        [{idx}] {edge.node.url}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Debug Section - Show All Product Fields */}
      <div className="mt-12 pt-8 border-t border-border">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="debug" className="border border-border/50 rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-[#667085]" />
                <span className="font-medium text-[#1d2939]">Product Data (Debug View)</span>
                <span className="text-xs text-[#667085] ml-2">Click to expand all available fields</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                <div className="bg-[#f9fafb] rounded-lg p-4 border border-border/30">
                  <h3 className="text-sm font-semibold text-[#1d2939] mb-3">Raw Product Object</h3>
                  <pre className="text-xs overflow-x-auto text-[#667085] font-mono bg-white p-4 rounded border border-border/20 max-h-96 overflow-y-auto">
                    {JSON.stringify(product, null, 2)}
                  </pre>
                </div>

                {/* Raw Typesense Document */}
                {(() => {
                  const metafieldsEdges = Array.isArray(product.metafields) 
                    ? product.metafields.map(m => ({ node: m }))
                    : product.metafields?.edges || [];
                  const rawDocMetafield = metafieldsEdges.find(
                    (e) => e.node.namespace === 'external' && e.node.key === '_raw_document'
                  );
                  
                  if (rawDocMetafield) {
                    try {
                      const rawDoc = JSON.parse(rawDocMetafield.node.value);
                      return (
                        <div className="bg-[#f0f9ff] rounded-lg p-4 border border-blue-200">
                          <h3 className="text-sm font-semibold text-[#1d2939] mb-3">Raw Typesense Document (Original Feed Data)</h3>
                          <details className="cursor-pointer">
                            <summary className="text-sm text-[#667085] hover:text-[#1d2939] mb-2">
                              Click to view all fields from the original Typesense feed
                            </summary>
                            <div className="mt-2">
                              <div className="mb-2 text-xs text-[#667085]">
                                <strong>Available Fields:</strong> {Object.keys(rawDoc).join(', ')}
                              </div>
                              <pre className="text-xs overflow-x-auto text-[#667085] font-mono bg-white p-4 rounded border border-border/20 max-h-96 overflow-y-auto">
                                {JSON.stringify(rawDoc, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      );
                    } catch {
                      return null;
                    }
                  }
                  return null;
                })()}

                {/* Structured Field View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm text-[#1d2939] mb-3">Basic Information</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-[#667085] font-medium">ID:</dt>
                        <dd className="text-[#1d2939] font-mono text-xs break-all">{product.id || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#667085] font-medium">Title:</dt>
                        <dd className="text-[#1d2939]">{product.title || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#667085] font-medium">Handle:</dt>
                        <dd className="text-[#1d2939] font-mono text-xs">{product.handle || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-[#667085] font-medium">Description:</dt>
                        <dd className="text-[#1d2939] text-xs line-clamp-3">{product.description || 'N/A'}</dd>
                      </div>
                    </dl>
                  </Card>

                  {/* Price Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm text-[#1d2939] mb-3">Pricing</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-[#667085] font-medium">Min Price:</dt>
                        <dd className="text-[#1d2939]">
                          {product.priceRange?.minVariantPrice?.amount 
                            ? `${product.priceRange.minVariantPrice.currencyCode} ${product.priceRange.minVariantPrice.amount}`
                            : 'N/A'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#667085] font-medium">Max Price:</dt>
                        <dd className="text-[#1d2939]">
                          {product.priceRange?.minVariantPrice?.amount 
                            ? `${product.priceRange.minVariantPrice.currencyCode} ${product.priceRange.minVariantPrice.amount}`
                            : 'N/A'}
                        </dd>
                      </div>
                    </dl>
                  </Card>

                  {/* Media Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm text-[#1d2939] mb-3">Media</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-[#667085] font-medium">Images Count:</dt>
                        <dd className="text-[#1d2939]">{product.images?.edges?.length || 0}</dd>
                      </div>
                      <div>
                        <dt className="text-[#667085] font-medium">Media Count:</dt>
                        <dd className="text-[#1d2939]">{product.media?.edges?.length || 0}</dd>
                      </div>
                      <div>
                        <dt className="text-[#667085] font-medium">All Media Count:</dt>
                        <dd className="text-[#1d2939]">{allMedia.length}</dd>
                      </div>
                    </dl>
                  </Card>

                  {/* Variants Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm text-[#1d2939] mb-3">Variants</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-[#667085] font-medium">Variants Count:</dt>
                        <dd className="text-[#1d2939]">{product.variants?.edges?.length || 0}</dd>
                      </div>
                      {product.variants?.edges?.[0]?.node && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <dt className="text-[#667085] font-medium mb-2 block">First Variant:</dt>
                          <dd className="text-xs space-y-1">
                            <div><span className="text-[#667085]">ID:</span> <span className="font-mono text-[#1d2939] break-all">{product.variants.edges[0].node.id}</span></div>
                            <div><span className="text-[#667085]">Title:</span> <span className="text-[#1d2939]">{product.variants.edges[0].node.title}</span></div>
                            <div><span className="text-[#667085]">Price:</span> <span className="text-[#1d2939]">{product.variants.edges[0].node.price?.amount} {product.variants.edges[0].node.price?.currencyCode}</span></div>
                            <div><span className="text-[#667085]">Available:</span> <span className="text-[#1d2939]">{product.variants.edges[0].node.availableForSale ? 'Yes' : 'No'}</span></div>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Card>

                  {/* Metafields Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm text-[#1d2939] mb-3">Metafields</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-[#667085] font-medium">Metafields Count:</dt>
                        <dd className="text-[#1d2939]">
                          {Array.isArray(product.metafields) 
                            ? product.metafields.length 
                            : product.metafields?.edges?.length || 0}
                        </dd>
                      </div>
                      {(() => {
                        const metafieldsEdges = Array.isArray(product.metafields) 
                          ? product.metafields.map(m => ({ node: m }))
                          : product.metafields?.edges || [];
                        return metafieldsEdges.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/30 max-h-64 overflow-y-auto">
                            <dt className="text-[#667085] font-medium mb-2 block">All Metafields:</dt>
                            <dd className="text-xs space-y-1">
                              {metafieldsEdges.map(({ node: metafield }, idx) => {
                              // Special handling for _raw_document (show as expandable)
                              if (metafield.key === '_raw_document') {
                                try {
                                  const rawDoc = JSON.parse(metafield.value);
                                  return (
                                    <div key={idx} className="p-2 bg-white rounded border border-border/20">
                                      <div className="font-mono text-[#1d2939] mb-2">{metafield.namespace}.{metafield.key}</div>
                                      <details className="text-[#667085]">
                                        <summary className="cursor-pointer hover:text-[#1d2939] mb-1">Click to view raw document</summary>
                                        <pre className="mt-2 p-2 bg-[#f9fafb] rounded text-[10px] overflow-x-auto max-h-48 overflow-y-auto">
                                          {JSON.stringify(rawDoc, null, 2)}
                                        </pre>
                                      </details>
                                    </div>
                                  );
                                } catch {
                                  return (
                                    <div key={idx} className="p-2 bg-white rounded border border-border/20">
                                      <div className="font-mono text-[#1d2939]">{metafield.namespace}.{metafield.key}</div>
                                      <div className="text-[#667085] mt-1 break-all text-[10px]">{String(metafield.value).substring(0, 200)}...</div>
                                    </div>
                                  );
                                }
                              }
                              
                              // Special handling for URLs (make them clickable)
                              const isUrl = metafield.key.includes('url') || metafield.key.includes('link');
                              const value = String(metafield.value);
                              
                              return (
                                <div key={idx} className="p-2 bg-white rounded border border-border/20">
                                  <div className="font-mono text-[#1d2939]">{metafield.namespace}.{metafield.key}</div>
                                  {isUrl && value.startsWith('http') ? (
                                    <a 
                                      href={value} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline break-all mt-1 block"
                                    >
                                      {value}
                                    </a>
                                  ) : (
                                    <div className="text-[#667085] mt-1 break-all">{value}</div>
                                  )}
                                </div>
                              );
                            })}
                          </dd>
                        </div>
                        );
                      })()}
                    </dl>
                  </Card>

                  {/* Collections Info */}
                  <Card className="p-4">
                    <h4 className="font-semibold text-sm text-[#1d2939] mb-3">Collections</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-[#667085] font-medium">Collections Count:</dt>
                        <dd className="text-[#1d2939]">{product.collections?.edges?.length || 0}</dd>
                      </div>
                      {product.collections?.edges && product.collections.edges.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <dt className="text-[#667085] font-medium mb-2 block">Collections:</dt>
                          <dd className="text-xs space-y-1">
                            {product.collections.edges.map(({ node: collection }, idx) => (
                              <div key={idx} className="p-2 bg-white rounded border border-border/20">
                                <div className="text-[#1d2939] font-medium">{collection.title}</div>
                                <div className="text-[#667085] font-mono text-xs">{collection.handle}</div>
                              </div>
                            ))}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Card>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
