'use client';

import { Product, getMetafield, getDiamondSpecs } from '@/types/product';
import AccordionModule, { AccordionModuleProps } from './AccordionModule';

interface AccordionModuleAdapterProps {
  product: Product;
  className?: string;
  allowMultiple?: boolean;
  sections?: AccordionModuleProps['items'];
}

export default function AccordionModuleAdapter({
  product,
  className,
  allowMultiple,
  sections,
}: AccordionModuleAdapterProps) {
  const specs = getDiamondSpecs(product);
  const hasDiamondSpecs = specs.carat > 0 || specs.shape || specs.cut || specs.color || specs.clarity;

  // Default sections if not provided
  const defaultSections: AccordionModuleProps['items'] = sections || [
    {
      title: 'Description',
      content: (
        <div className="prose prose-sm max-w-none text-[#667085]">
          {product.description ? (
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          ) : (
            <p>No description available.</p>
          )}
        </div>
      ),
    },
    ...(hasDiamondSpecs ? [{
      title: 'Specifications',
      content: (
        <div className="space-y-3">
          {specs.shape && (
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm font-medium text-[#1d2939]">Shape</span>
              <span className="text-sm text-[#667085]">{specs.shape}</span>
            </div>
          )}
          {specs.carat > 0 && (
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm font-medium text-[#1d2939]">Carat</span>
              <span className="text-sm text-[#667085]">{specs.carat} ct</span>
            </div>
          )}
          {specs.cut && (
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm font-medium text-[#1d2939]">Cut</span>
              <span className="text-sm text-[#667085]">{specs.cut}</span>
            </div>
          )}
          {specs.color && (
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm font-medium text-[#1d2939]">Color</span>
              <span className="text-sm text-[#667085]">{specs.color}</span>
            </div>
          )}
          {specs.clarity && (
            <div className="flex justify-between py-2 border-b border-border/30">
              <span className="text-sm font-medium text-[#1d2939]">Clarity</span>
              <span className="text-sm text-[#667085]">{specs.clarity}</span>
            </div>
          )}
        </div>
      ),
    }] : []),
    {
      title: 'Shipping & Returns',
      content: (
        <div className="space-y-3 text-sm text-[#667085]">
          <div>
            <h4 className="font-semibold text-[#1d2939] mb-1">Shipping</h4>
            <p>{getMetafield(product, 'custom', 'shipping_info') || 'Free shipping on orders over $500. Standard shipping takes 5-7 business days. Express shipping available.'}</p>
          </div>
          <div>
            <h4 className="font-semibold text-[#1d2939] mb-1">Returns</h4>
            <p>{getMetafield(product, 'custom', 'return_info') || '30-day hassle-free returns. Items must be in original condition with all tags attached.'}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Care Instructions',
      content: (
        <div className="text-sm text-[#667085]">
          <p>{getMetafield(product, 'custom', 'care_instructions') || 'Clean with a soft cloth and mild soap. Avoid harsh chemicals. Store in a soft pouch or jewelry box when not in use.'}</p>
        </div>
      ),
    },
  ];

  return (
    <AccordionModule
      items={defaultSections}
      allowMultiple={allowMultiple}
      className={className}
    />
  );
}

