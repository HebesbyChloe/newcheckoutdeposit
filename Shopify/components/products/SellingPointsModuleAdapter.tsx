'use client';

import { Product, getMetafield } from '@/types/product';
import SellingPointsModule, { SellingPointsModuleProps } from './SellingPointsModule';
import { Shield, Truck, Award, Heart, Check } from 'lucide-react';

interface SellingPointsModuleAdapterProps {
  product: Product;
  className?: string;
  title?: string;
  showInfoIcon?: boolean;
}

export default function SellingPointsModuleAdapter({
  product,
  className,
  title,
  showInfoIcon,
}: SellingPointsModuleAdapterProps) {
  // Get selling points from metafield or use defaults
  let points: SellingPointsModuleProps['points'] = [];
  
  const sellingPointsMeta = getMetafield(product, 'custom', 'selling_points');
  if (sellingPointsMeta) {
    try {
      const parsed = JSON.parse(sellingPointsMeta);
      if (Array.isArray(parsed)) {
        points = parsed.map((p: any) => ({
          icon: p.icon ? <span dangerouslySetInnerHTML={{ __html: p.icon }} /> : <Check className="h-4 w-4" />,
          title: p.title || p,
        }));
      }
    } catch (e) {
      // If parsing fails, use defaults
    }
  }
  
  // Default selling points if none from metafield
  if (points.length === 0) {
    points = [
      {
        icon: <Shield className="h-4 w-4" />,
        title: getMetafield(product, 'custom', 'certification') || 'Certified Authenticity',
      },
      {
        icon: <Truck className="h-4 w-4" />,
        title: 'Free Shipping on orders over $500',
      },
      {
        icon: <Award className="h-4 w-4" />,
        title: getMetafield(product, 'custom', 'warranty') || 'Lifetime Warranty',
      },
      {
        icon: <Heart className="h-4 w-4" />,
        title: '30-Day Hassle-Free Returns',
      },
    ];
  }

  return (
    <SellingPointsModule
      title={title}
      showInfoIcon={showInfoIcon}
      points={points}
      className={className}
    />
  );
}

