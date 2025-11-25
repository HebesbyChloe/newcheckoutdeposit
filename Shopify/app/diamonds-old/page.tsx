import type { Metadata } from 'next';
import DiamondsPageClient from './DiamondsPageClient';
import { productsService } from '@/services/shopify/products.service';
import { collectionsService } from '@/services/shopify/collections.service';

/**
 * SEO Metadata for Loose Diamonds Page
 */
export const metadata: Metadata = {
  title: 'Loose Diamonds | RITAMIE - Natural & Lab-Grown Diamonds',
  description: 'Browse our exquisite collection of loose diamonds. Choose from natural and lab-grown diamonds in various shapes, sizes, and grades. Find the perfect diamond for your jewelry.',
  keywords: ['loose diamonds', 'diamonds', 'natural diamonds', 'lab-grown diamonds', 'diamond shapes', 'diamond grades', 'RITAMIE'],
  openGraph: {
    title: 'Loose Diamonds | RITAMIE',
    description: 'Browse our exquisite collection of loose diamonds. Choose from natural and lab-grown diamonds.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Loose Diamonds | RITAMIE',
    description: 'Browse our exquisite collection of loose diamonds.',
  },
};

// Force dynamic rendering for this page
//export const dynamic = 'force-dynamic';

export default async function DiamondsPage() {
  const possibleHandles = ['diamonds', 'diamond', 'loose-diamonds', 'natural-diamonds', 'lab-grown-diamonds'];
  const [products, collections] = await Promise.all([
    (async () => {
      try {
        return await productsService.getProductsByMultipleHandles(possibleHandles, {
          first: 250,
          deduplicate: true,
        });
      } catch (error) {
        return [];
      }
    })(),
    (async () => {
      try {
        return await collectionsService.getDiamondCollections();
      } catch (error) {
        return [];
      }
    })(),
  ]);

  return (
    <DiamondsPageClient 
      initialProducts={products}
      initialCollections={collections}
    />
  );
}
