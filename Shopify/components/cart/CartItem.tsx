'use client';

import { CartLine } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Minus, Plus, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface CartItemProps {
  item: CartLine;
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  loading?: boolean;
}

export default function CartItem({ item, onUpdateQuantity, onRemove, loading }: CartItemProps) {
  // Get image from product images first, then fallback to attributes (for external products)
  const getAttribute = (key: string) => item.attributes?.find(attr => attr.key === key)?.value;
  const imageUrlFromAttributes = getAttribute('Image URL') || getAttribute('imageUrl');
  
  // Handle both Shopify cart structure and custom backend structure
  const isShopifyCart = item.merchandise?.product !== undefined;
  const isCustomCart = item.imageUrl !== undefined || item.title !== undefined;
  
  let productImage = null;
  let productTitle = '';
  let productHandle = '';
  let price = 0;
  let lineTotal = 0;
  let currency = 'USD';
  
  if (isShopifyCart) {
    // Shopify cart structure
    productImage = item.merchandise.product.images?.[0];
    productTitle = item.merchandise.product.title;
    productHandle = item.merchandise.product.handle;
    price = parseFloat(item.merchandise.price.amount);
    lineTotal = parseFloat(item.cost.totalAmount.amount);
    currency = item.merchandise.price.currencyCode;
  } else if (isCustomCart) {
    // Custom backend cart structure
    productTitle = item.title || 'Product';
    productHandle = item.productHandle || `product-${item.id}`;
    price = parseFloat(item.price?.amount || '0');
    lineTotal = price * item.quantity;
    currency = item.price?.currencyCode || 'USD';
  } else {
    // Fallback - try to extract from attributes
    productTitle = getAttribute('title') || getAttribute('Title') || 'Product';
    productHandle = getAttribute('productHandle') || `product-${item.id}`;
    price = parseFloat(getAttribute('price') || getAttribute('Price') || '0');
    lineTotal = price * item.quantity;
    currency = getAttribute('currencyCode') || 'USD';
  }
  
  const image = productImage || (imageUrlFromAttributes ? { url: imageUrlFromAttributes, altText: productTitle } : (item.imageUrl ? { url: item.imageUrl, altText: productTitle } : null));

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    onUpdateQuantity(item.id, newQuantity);
  };

  // Calculate lineTotal if not provided (for custom cart structure)
  if (lineTotal === 0 && price > 0) {
    lineTotal = price * item.quantity;
  }

  return (
    <div className="flex gap-4 py-6 border-b border-gray-200 last:border-b-0">
      {/* Product Image */}
      <Link href={`/products/${productHandle}`} className="flex-shrink-0">
        <div className="w-24 h-24 md:w-32 md:h-32 relative bg-gray-100 rounded-lg overflow-hidden">
          {image ? (
            <Image
              src={image.url}
              alt={image.altText || productTitle}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 96px, 128px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              No Image
            </div>
          )}
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <Link href={`/products/${productHandle}`}>
            <h3 className="font-semibold text-[#1d2939] hover:text-[#3d6373] transition-colors line-clamp-2">
              {productTitle}
            </h3>
          </Link>
          {isShopifyCart && item.merchandise.title !== 'Default Title' && (
            <p className="text-sm text-[#667085] mt-1">{item.merchandise.title}</p>
          )}
          
          {/* Display diamond metadata from cart line attributes */}
          {(() => {
            // Only log on client-side in development
            if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
              console.log('CartItem - attributes:', item.attributes);
            }
            return null; // Don't render anything to avoid hydration issues
          })()}
          {item.attributes && item.attributes.length > 0 && (
            <div className="mt-2 space-y-1">
              {(() => {
                const carat = getAttribute('Carat');
                const color = getAttribute('Color');
                const clarity = getAttribute('Clarity');
                const cutGrade = getAttribute('Cut Grade');
                const gradingLab = getAttribute('Grading Lab');
                const certType = getAttribute('Certificate Type');
                const certNumber = getAttribute('Certificate Number');
                const itemId = getAttribute('Item ID');
                
                const specs: string[] = [];
                
                // Core specs
                if (carat) specs.push(`${carat}ct`);
                if (color) specs.push(`Color: ${color}`);
                if (clarity) specs.push(`Clarity: ${clarity}`);
                if (cutGrade) specs.push(`Cut: ${cutGrade}`);
                
                // Certificate info (prioritize Grading Lab, then Certificate Type)
                const lab = gradingLab || certType;
                if (lab || certNumber) {
                  const certParts = [lab, certNumber].filter(Boolean);
                  if (certParts.length > 0) {
                    specs.push(`Cert: ${certParts.join(' ')}`);
                  }
                }
                
                // Item ID
                if (itemId) specs.push(`ID: ${itemId}`);
                
                return specs.length > 0 ? (
                  <div className="text-xs text-[#667085] space-y-0.5">
                    {specs.map((spec, idx) => (
                      <div key={idx}>{spec}</div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Quantity and Price Controls */}
        <div className="flex items-center justify-between mt-4">
          {/* Quantity Selector */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={loading || item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center font-medium">{item.quantity}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={loading}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Price and Remove */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold text-[#1d2939]">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                }).format(lineTotal)}
              </p>
              {item.quantity > 1 && (
                <p className="text-xs text-[#667085]">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency,
                  }).format(price)} each
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#667085] hover:text-red-600"
              onClick={() => onRemove(item.id)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

