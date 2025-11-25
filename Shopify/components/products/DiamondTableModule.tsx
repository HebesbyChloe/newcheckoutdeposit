'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product, getDiamondSpecs, getMetafield } from '@/types/product';

export interface DiamondTableModuleProps {
  products: Product[];
  onSelect: (product: Product) => void;
  onWishlist?: (product: Product) => void;
  selectedProductId?: string;
  badges?: (product: Product) => {
    label: string;
    variant?: "default" | "secondary" | "outline";
    className?: string;
  }[];
}

export function DiamondTableModule({
  products,
  onSelect,
  onWishlist,
  selectedProductId,
  badges
}: DiamondTableModuleProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-[#f9fafb] border-b grid grid-cols-12 gap-4 px-6 py-4">
        <div className="col-span-1"></div>
        <div className="col-span-2 font-['SFU_Futura:Regular',_sans-serif] text-[#667085] text-sm">
          Shape
        </div>
        <div className="col-span-1 font-['SFU_Futura:Regular',_sans-serif] text-[#667085] text-sm">
          Carat
        </div>
        <div className="col-span-1 font-['SFU_Futura:Regular',_sans-serif] text-[#667085] text-sm">
          Cut Grade
        </div>
        <div className="col-span-1 font-['SFU_Futura:Regular',_sans-serif] text-[#667085] text-sm">
          Color
        </div>
        <div className="col-span-1 font-['SFU_Futura:Regular',_sans-serif] text-[#667085] text-sm">
          Clarity
        </div>
        <div className="col-span-1 font-['SFU_Futura:Regular',_sans-serif] text-[#667085] text-sm">
          Grading Lab
        </div>
        <div className="col-span-2 font-['SFU_Futura:Regular',_sans-serif] text-[#667085] text-sm">
          Price
        </div>
        <div className="col-span-2"></div>
      </div>

      {/* Table Rows */}
      <div className="divide-y">
        {products.map((product) => {
          const isExpanded = expandedId === product.id;
          const isSelected = selectedProductId === product.id;
          const productBadges = badges?.(product) || [];
          
          const specs = getDiamondSpecs(product);
          const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
          const image = product.images?.edges?.[0]?.node?.url;
          const stockNumber = getMetafield(product, 'custom', 'stock_number') || 
                            getMetafield(product, 'custom', 'sku') || '';
          
          const additionalDetails = {
            table: getMetafield(product, 'custom', 'table'),
            depth: getMetafield(product, 'custom', 'depth'),
            polish: getMetafield(product, 'custom', 'polish'),
            symmetry: getMetafield(product, 'custom', 'symmetry'),
            fluorescence: getMetafield(product, 'custom', 'fluorescence'),
            measurements: getMetafield(product, 'custom', 'measurements'),
            certification: getMetafield(product, 'custom', 'certification'),
          };

          return (
            <div key={product.id}>
              {/* Main Row */}
              <div
                className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[#f9fafb] transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#f0f9ff] border-l-4 border-l-[#2c5f6f]' : ''
                }`}
                onClick={() => toggleExpand(product.id)}
              >
                {/* Expand/Collapse Button */}
                <div className="col-span-1 flex items-center">
                  <button className="text-[#667085] hover:text-[#1d2939]">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Shape */}
                <div className="col-span-2 flex items-center gap-2">
                  <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                    {specs.shape || 'Round'}
                  </span>
                  {productBadges.length > 0 && (
                    <Badge
                      variant={productBadges[0].variant || "secondary"}
                      className={`text-xs ${productBadges[0].className || ''}`}
                    >
                      {productBadges[0].label}
                    </Badge>
                  )}
                </div>

                {/* Carat */}
                <div className="col-span-1 flex items-center">
                  <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                    {specs.carat > 0 ? specs.carat : 'N/A'}
                  </span>
                </div>

                {/* Cut */}
                <div className="col-span-1 flex items-center">
                  <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#667085]">
                    {specs.cut || 'N/A'}
                  </span>
                </div>

                {/* Color */}
                <div className="col-span-1 flex items-center">
                  <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#667085]">
                    {specs.color || 'N/A'}
                  </span>
                </div>

                {/* Clarity */}
                <div className="col-span-1 flex items-center">
                  <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#667085]">
                    {specs.clarity || 'N/A'}
                  </span>
                </div>

                {/* Grading Lab */}
                <div className="col-span-1 flex items-center">
                  <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#667085]">
                    {specs.gradingLab || 'N/A'}
                  </span>
                </div>

                {/* Price */}
                <div className="col-span-2 flex items-center">
                  <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#2c5f6f] text-lg">
                    ${price.toLocaleString()}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-3 flex items-center justify-end gap-2">
                  {onWishlist && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onWishlist(product);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition-colors"
                      aria-label="Add to wishlist"
                    >
                      <Heart className="h-5 w-5 text-[#667085] hover:text-[#2c5f6f]" />
                    </button>
                  )}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(product);
                    }}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className={
                      isSelected
                        ? 'bg-[#2c5f6f] hover:bg-[#234a56] text-white'
                        : 'border-[#2c5f6f] text-[#2c5f6f] hover:bg-[#2c5f6f] hover:text-white'
                    }
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </Button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="bg-[#f9fafb] border-t px-6 py-6">
                  <div className="grid grid-cols-12 gap-6">
                    {/* Image */}
                    <div className="col-span-3">
                      {image && (
                        <img
                          src={image}
                          alt={`${specs.shape || 'Round'} Diamond`}
                          className="w-full h-48 object-cover rounded-lg bg-white"
                        />
                      )}
                      {stockNumber && (
                        <p className="text-xs text-[#667085] mt-2">
                          Stock #: {stockNumber}
                        </p>
                      )}
                    </div>

                    {/* Additional Details */}
                    <div className="col-span-6">
                      <h4 className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939] mb-4">
                        Diamond Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {additionalDetails.table && (
                          <div>
                            <p className="text-xs text-[#667085]">Table</p>
                            <p className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                              {additionalDetails.table}
                            </p>
                          </div>
                        )}
                        {additionalDetails.depth && (
                          <div>
                            <p className="text-xs text-[#667085]">Depth</p>
                            <p className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                              {additionalDetails.depth}
                            </p>
                          </div>
                        )}
                        {additionalDetails.polish && (
                          <div>
                            <p className="text-xs text-[#667085]">Polish</p>
                            <p className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                              {additionalDetails.polish}
                            </p>
                          </div>
                        )}
                        {additionalDetails.symmetry && (
                          <div>
                            <p className="text-xs text-[#667085]">Symmetry</p>
                            <p className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                              {additionalDetails.symmetry}
                            </p>
                          </div>
                        )}
                        {additionalDetails.fluorescence && (
                          <div>
                            <p className="text-xs text-[#667085]">Fluorescence</p>
                            <p className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                              {additionalDetails.fluorescence}
                            </p>
                          </div>
                        )}
                        {additionalDetails.measurements && (
                          <div>
                            <p className="text-xs text-[#667085]">Measurements</p>
                            <p className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                              {additionalDetails.measurements}
                            </p>
                          </div>
                        )}
                      </div>
                      {additionalDetails.certification && (
                        <div className="mt-4">
                          <Badge className="bg-[#a8d5ba] text-[#1d2939]">
                            {additionalDetails.certification}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Quick Summary */}
                    <div className="col-span-3 bg-white rounded-lg p-4">
                      <h4 className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939] mb-3">
                        Summary
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Shape:</span>
                          <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                            {specs.shape || 'Round'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Carat:</span>
                          <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                            {specs.carat > 0 ? specs.carat : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Cut Grade:</span>
                          <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                            {specs.cut || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Color:</span>
                          <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                            {specs.color || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Clarity:</span>
                          <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                            {specs.clarity || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Grading Lab:</span>
                          <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#1d2939]">
                            {specs.gradingLab || 'N/A'}
                          </span>
                        </div>
                        <div className="pt-2 mt-2 border-t flex justify-between">
                          <span className="text-[#667085]">Price:</span>
                          <span className="font-['SFU_Futura:Regular',_sans-serif] text-[#2c5f6f] text-lg">
                            ${price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => onSelect(product)}
                        className="w-full mt-4 bg-[#2c5f6f] hover:bg-[#234a56] text-white"
                        disabled={isSelected}
                      >
                        {isSelected ? 'Selected' : 'Select This Diamond'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DiamondTableModule;

