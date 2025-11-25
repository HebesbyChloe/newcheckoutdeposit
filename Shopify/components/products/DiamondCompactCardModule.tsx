'use client';

import { Heart, Diamond, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { Product, getDiamondSpecs, getMetafield } from '@/types/product';

export interface DiamondCompactCardModuleProps {
  product: Product;
  onSelect: (product: Product) => void;
  onWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
  badges?: {
    label: string;
    variant?: "default" | "secondary" | "outline";
    className?: string;
  }[];
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  shapeIcon?: React.ReactNode;
  className?: string;
}

export function DiamondCompactCardModule({
  product,
  onSelect,
  onWishlist,
  isWishlisted = false,
  badges = [],
  secondaryAction,
  shapeIcon,
  className = "",
}: DiamondCompactCardModuleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get diamond data from product
  const specs = getDiamondSpecs(product);
  const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
  const image = product.images?.edges?.[0]?.node?.url || '';
  const stockNumber = getMetafield(product, 'custom', 'stock_number') || 
                      getMetafield(product, 'custom', 'sku') || 
                      product.id.split('/').pop()?.slice(-8) || '';
  
  // Additional details from metafields
  const additionalDetails = {
    table: getMetafield(product, 'custom', 'table'),
    depth: getMetafield(product, 'custom', 'depth'),
    polish: getMetafield(product, 'custom', 'polish'),
    symmetry: getMetafield(product, 'custom', 'symmetry'),
    fluorescence: getMetafield(product, 'custom', 'fluorescence'),
    measurements: getMetafield(product, 'custom', 'measurements'),
    certification: getMetafield(product, 'custom', 'certification'),
  };

  const hasAdditionalDetails = Object.values(additionalDetails).some(v => v);

  return (
    <div className={`border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="bg-[#2c5f6f] text-white px-6 py-3 flex items-center justify-between">
        {/* Left side - Shape */}
        <div className="flex items-center gap-2">
          {shapeIcon || <Diamond className="h-5 w-5" />}
          <span className="text-sm">{specs.shape || 'Round'}</span>
        </div>

        {/* Right side - Wishlist */}
        <button
          onClick={() => onWishlist?.(product)}
          className="hover:scale-110 transition-transform"
          aria-label="Add to wishlist"
        >
          <Heart 
            className={`h-5 w-5 ${isWishlisted ? 'fill-white' : ''}`}
          />
        </button>
      </div>

      {/* Details */}
      <div className="bg-[#f5f5f5] p-6">
        <div className="flex gap-6">
          {/* Left side - Image */}
          <div className="flex-shrink-0">
            <div className="w-64 h-64 bg-white rounded-lg overflow-hidden relative">
              {image ? (
                <img
                  src={image}
                  alt={`${specs.carat} ct. ${specs.shape || 'Round'} Diamond`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              {/* 360° indicator */}
              <div className="absolute bottom-2 left-2 bg-white/90 rounded-full px-2 py-1 text-xs">
                360°
              </div>
            </div>
          </div>

          {/* Right side - Details */}
          <div className="flex-1 space-y-4">
            {/* Title & Price */}
            <div>
              <h3 className="text-[#1d2939] text-xl mb-1">
                {specs.carat > 0 ? `${specs.carat} ct.` : ''} {specs.shape || 'Round'} Diamond
              </h3>
              {stockNumber && (
                <p className="text-[#667085] text-sm mb-2">#{stockNumber}</p>
              )}
              <p className="text-[#1d2939] text-2xl">${price.toLocaleString()}</p>
            </div>

            {/* Specifications */}
            <div className="space-y-2">
              {specs.carat > 0 && (
                <div className="flex items-baseline">
                  <span className="text-[#1d2939] text-sm min-w-[80px]">Carat:</span>
                  <span className="text-[#667085] text-sm ml-2">{specs.carat}</span>
                </div>
              )}
              {specs.cut && (
                <div className="flex items-baseline">
                  <span className="text-[#1d2939] text-sm min-w-[80px]">Cut Grade:</span>
                  <span className="text-[#667085] text-sm ml-2">{specs.cut}</span>
                </div>
              )}
              {specs.color && (
                <div className="flex items-baseline">
                  <span className="text-[#1d2939] text-sm min-w-[80px]">Color:</span>
                  <span className="text-[#667085] text-sm ml-2">{specs.color}</span>
                </div>
              )}
              {specs.clarity && (
                <div className="flex items-baseline">
                  <span className="text-[#1d2939] text-sm min-w-[80px]">Clarity:</span>
                  <span className="text-[#667085] text-sm ml-2">{specs.clarity}</span>
                </div>
              )}
              {specs.gradingLab && (
                <div className="flex items-baseline">
                  <span className="text-[#1d2939] text-sm min-w-[80px]">Grading Lab:</span>
                  <span className="text-[#667085] text-sm ml-2">{specs.gradingLab}</span>
                </div>
              )}
            </div>

            {/* Additional Details Accordion */}
            {hasAdditionalDetails && (
              <div className="border-t pt-4 mt-4">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center justify-between w-full text-left text-[#1d2939] text-sm hover:text-[#2c5f6f] transition-colors"
                >
                  <span>Additional Details:</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isExpanded && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      {additionalDetails.table && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Table</p>
                          <p className="text-sm text-gray-900">{additionalDetails.table}</p>
                        </div>
                      )}
                      {additionalDetails.depth && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Depth</p>
                          <p className="text-sm text-gray-900">{additionalDetails.depth}</p>
                        </div>
                      )}
                      {additionalDetails.polish && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Polish</p>
                          <p className="text-sm text-gray-900">{additionalDetails.polish}</p>
                        </div>
                      )}
                      {additionalDetails.symmetry && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Symmetry</p>
                          <p className="text-sm text-gray-900">{additionalDetails.symmetry}</p>
                        </div>
                      )}
                      {additionalDetails.fluorescence && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Fluorescence</p>
                          <p className="text-sm text-gray-900">{additionalDetails.fluorescence}</p>
                        </div>
                      )}
                      {additionalDetails.measurements && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Measurements</p>
                          <p className="text-sm text-gray-900">{additionalDetails.measurements}</p>
                        </div>
                      )}
                      {additionalDetails.certification && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 mb-1">Certification</p>
                          <p className="text-sm text-gray-900">{additionalDetails.certification}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-[#f5f5f5] px-6 pb-6">
        <div className="flex items-center justify-end gap-4">
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex gap-2 mr-auto">
              {badges.map((badge, index) => (
                <Badge
                  key={index}
                  variant={badge.variant || "secondary"}
                  className={`uppercase text-xs px-3 py-1 ${badge.className || ''}`}
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Secondary Action */}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              className="text-[#2c5f6f] hover:text-[#234a56] underline underline-offset-4"
            >
              {secondaryAction.label}
            </Button>
          )}

          {/* Primary Action */}
          <Button
            onClick={() => onSelect(product)}
            variant="outline"
            className="border-2 border-[#2c5f6f] text-[#2c5f6f] hover:bg-[#2c5f6f] hover:text-white px-8"
          >
            Select Diamond
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DiamondCompactCardModule;

