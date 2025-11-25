'use client';

import { useState, Fragment as ReactFragment } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Product, getDiamondSpecs } from '@/types/product';
import { Heart, ChevronDown, ChevronRight } from 'lucide-react';
import InlineProductDetail from '@/components/modules/InlineProductDetail';

interface DiamondTableProps {
  products: Product[];
  onView?: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  // Which external collection these diamonds belong to (labgrown by default)
  collection?: 'natural' | 'labgrown';
}

// Shape icon mapping
const getShapeIcon = (shape: string) => {
  const shapeLower = shape.toLowerCase();
  if (shapeLower.includes('round')) return '/images/icons/shapes/shape-round.png';
  if (shapeLower.includes('cushion')) return '/images/icons/shapes/shape-cushion.png';
  if (shapeLower.includes('pear')) return '/images/icons/shapes/shape-pear.png';
  if (shapeLower.includes('oval')) return '/images/icons/shapes/shape-oval.png';
  if (shapeLower.includes('asscher') || shapeLower.includes('emerald')) return '/images/icons/shapes/shape-asscher.png';
  if (shapeLower.includes('heart')) return '/images/icons/shapes/shape-heart.png';
  if (shapeLower.includes('marquise')) return '/images/icons/shapes/shape-marquise.png';
  if (shapeLower.includes('princess')) return '/images/icons/shapes/shape-princess.png';
  return '/images/icons/shapes/shape-round.png'; // default
};

export default function DiamondTable({
  products,
  onView,
  onAddToCart,
  collection = 'labgrown',
}: DiamondTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (productId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleRowClick = (e: React.MouseEvent, productId: string) => {
    // Don't toggle if clicking on a button or link
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    toggleRow(productId);
  };

  return (
    <Card className="overflow-hidden border border-border/50 shadow-lg bg-white">
      <div className="overflow-x-auto">
        <Table role="table" aria-label="Diamond products comparison table">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-[#f9fafb] to-[#f2f4f7] hover:bg-[#f2f4f7] border-b-2 border-[#DEC481]/30" role="row">
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider w-[50px]" role="columnheader" aria-label="Expand or collapse row">
                <span className="sr-only">Expand or collapse</span>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider" role="columnheader" aria-sort="none">
                <div className="flex items-center gap-2">
                  Shape
                  <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider" role="columnheader" aria-sort="none">
                <div className="flex items-center gap-2">
                  Price
                  <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider" role="columnheader" aria-sort="none">
                <div className="flex items-center gap-2">
                  Carat
                  <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider" role="columnheader" aria-sort="none">
                <div className="flex items-center gap-2">
                  Cut Grade
                  <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider" role="columnheader" aria-sort="none">
                <div className="flex items-center gap-2">
                  Color
                  <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider" role="columnheader" aria-sort="none">
                <div className="flex items-center gap-2">
                  Clarity
                  <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider cursor-pointer hover:text-[#3d6373]" role="columnheader" aria-sort="none">
                <div className="flex items-center gap-2">
                  Grading Lab
                  <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1d2939] text-sm uppercase tracking-wider text-center" role="columnheader">
                Compare
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const price = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
              const currency = product.priceRange?.minVariantPrice?.currencyCode || 'USD';
              const firstVariant = product.variants?.edges?.[0]?.node;
              
              // Get diamond specs from metafields
              const specs = getDiamondSpecs(product);
              
              
              const shape = specs.shape || product.title.split(' ')[0] || 'Round';
              const shapeIcon = getShapeIcon(shape);
              
              const carat = specs.carat > 0 ? specs.carat.toFixed(2) : 'N/A';
              const cut = specs.cut || 'N/A';
              const color = specs.color || 'N/A';
              const clarity = specs.clarity || 'N/A';
              const gradingLab = specs.gradingLab || 'N/A';
              
              const isExpanded = expandedRows.has(product.id);
              
              return (
                <ReactFragment key={product.id}>
                  <TableRow 
                    key={product.id} 
                    className="hover:bg-gradient-to-r hover:from-[#f9fafb] hover:to-[#f2f4f7] transition-all duration-200 border-b border-border/20 group cursor-pointer"
                    onClick={(e) => handleRowClick(e, product.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleRow(product.id);
                      }
                    }}
                    role="row"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    aria-label={`${product.title} - ${shape}, ${carat} carat, ${cut} cut, ${color} color, ${clarity} clarity. Click to ${isExpanded ? 'collapse' : 'expand'} details.`}
                  >
                    <TableCell className="py-4" role="gridcell">
                      <div className="flex items-center justify-center" aria-hidden="true">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-[#3d6373] transition-transform" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-[#667085] transition-transform" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4" role="gridcell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 relative flex-shrink-0" role="img" aria-label={`${shape} diamond shape icon`}>
                          <img
                            src={shapeIcon}
                            alt=""
                            className="w-full h-full object-contain"
                            aria-hidden="true"
                          />
                        </div>
                        <span className="font-medium text-[#1d2939] group-hover:text-[#3d6373] transition-colors">
                          {shape}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-[#3d6373] text-lg py-4" role="gridcell">
                      <span aria-label={`Price: ${new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)}`}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currency,
                          maximumFractionDigits: 0,
                        }).format(price)}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#667085] py-4" role="gridcell">
                      <span aria-label={`Carat weight: ${carat} carats`}>{carat} ct</span>
                    </TableCell>
                    <TableCell className="text-[#667085] py-4" role="gridcell">
                      <span aria-label={`Cut grade: ${cut}`}>{cut}</span>
                    </TableCell>
                    <TableCell className="text-[#667085] py-4" role="gridcell">
                      <span aria-label={`Color grade: ${color}`}>{color}</span>
                    </TableCell>
                    <TableCell className="text-[#667085] py-4" role="gridcell">
                      <span aria-label={`Clarity grade: ${clarity}`}>{clarity}</span>
                    </TableCell>
                    <TableCell className="text-[#667085] py-4" role="gridcell">
                      <span aria-label={`Grading lab: ${gradingLab}`}>{gradingLab}</span>
                    </TableCell>
                    <TableCell className="text-center py-4" role="gridcell">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle compare/favorite functionality
                        }}
                        aria-label={`Add ${product.title} to favorites`}
                      >
                        <Heart className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">Add to favorites</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                  <InlineProductDetail 
                    key={`${product.id}-detail`}
                    product={product} 
                    isOpen={isExpanded}
                    collection={collection}
                  />
                </ReactFragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
