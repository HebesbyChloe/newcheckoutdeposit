'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface ProductDetailHeaderModuleProps {
  title: string;
  specs?: ProductSpec[];
  price: number;
  stockStatus?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  primaryAction: {
    label: string;
    onClick: () => void;
  };
  secondaryActions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  }[];
  shippingDate?: string;
}

export function ProductDetailHeaderModule({
  title,
  specs = [],
  price,
  stockStatus,
  primaryAction,
  secondaryActions = [],
  shippingDate,
}: ProductDetailHeaderModuleProps) {
  return (
    <div className="space-y-6">
      {/* Product Title & Specs */}
      <div className="space-y-2">
        <h1 className="text-[#1d2939]">{title}</h1>
        {specs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[#667085]">
            {specs.map((spec, index) => (
              <span key={index} className="flex items-center">
                <span className="text-sm">{spec.value}</span>
                {index < specs.length - 1 && (
                  <span className="mx-2">•</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="text-[#1d2939] text-2xl">
        ${price.toLocaleString()}
      </div>

      {/* Stock Status */}
      {stockStatus && (
        <div>
          <Badge 
            variant={stockStatus.variant || "secondary"}
            className="uppercase tracking-wide"
          >
            {stockStatus.label}
          </Badge>
        </div>
      )}

      {/* Primary Action */}
      <Button 
        onClick={primaryAction.onClick}
        className="w-full h-14 bg-[#2c5f6f] hover:bg-[#234a56] text-white uppercase tracking-wide"
        size="lg"
      >
        {primaryAction.label}
      </Button>

      {/* Secondary Actions */}
      {secondaryActions.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {secondaryActions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant="outline"
              className="h-12 uppercase tracking-wide text-[#2c5f6f] border-[#2c5f6f] hover:bg-[#2c5f6f]/5"
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Shipping Information */}
      {shippingDate && (
        <div className="text-sm text-[#667085]">
          Order now and your order ships by <span className="font-medium text-[#1d2939]">{shippingDate}</span>.
        </div>
      )}
    </div>
  );
}

export default ProductDetailHeaderModule;
