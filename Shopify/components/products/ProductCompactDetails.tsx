'use client';

import { Product, getMetafield, getDiamondSpecs } from '@/types/product';
import { cn } from '@/utils/cn';

interface ProductCompactDetailsProps {
  product: Product;
  className?: string;
  showSpecs?: boolean;
}

export default function ProductCompactDetails({ 
  product, 
  className,
  showSpecs = true
}: ProductCompactDetailsProps) {
  const specs = getDiamondSpecs(product);
  const hasDiamondSpecs = showSpecs && (specs.carat > 0 || specs.shape || specs.cut || specs.color || specs.clarity || specs.gradingLab);

  // Get key details from metafields
  const keyDetails: Array<{ label: string; value: string }> = [];
  
  if (specs.shape) keyDetails.push({ label: 'Shape', value: specs.shape });
  if (specs.carat > 0) keyDetails.push({ label: 'Carat', value: `${specs.carat} ct` });
  if (specs.cut) keyDetails.push({ label: 'Cut Grade', value: specs.cut });
  if (specs.color) keyDetails.push({ label: 'Color', value: specs.color });
  if (specs.clarity) keyDetails.push({ label: 'Clarity', value: specs.clarity });
  if (specs.gradingLab) keyDetails.push({ label: 'Grading Lab', value: specs.gradingLab });
  
  const certification = getMetafield(product, 'custom', 'certification');
  if (certification && !specs.gradingLab) keyDetails.push({ label: 'Certification', value: certification });

  const metal = getMetafield(product, 'custom', 'metal');
  if (metal) keyDetails.push({ label: 'Metal', value: metal });

  return (
    <div className={cn("space-y-2", className)}>
      {keyDetails.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {keyDetails.slice(0, 4).map((detail, index) => (
            <div key={index} className="flex flex-col">
              <span className="text-xs text-[#667085]">{detail.label}</span>
              <span className="font-medium text-[#1d2939]">{detail.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#667085] line-clamp-2">
          {product.description?.replace(/<[^>]*>/g, '').substring(0, 100) || 'No details available.'}
        </p>
      )}
    </div>
  );
}

