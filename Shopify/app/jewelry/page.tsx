import type { Metadata } from 'next';
import JewelryPageClient from './JewelryPageClient';
import { productsService } from '@/services/shopify/products.service';
import { collectionsService } from '@/services/shopify/collections.service';

/**
 * SEO Metadata for Jewelry Collection Page
 */
export const metadata: Metadata = {
  title: 'Jewelry Collection | RITAMIE - Exquisite Handcrafted Jewelry',
  description: 'Discover our stunning jewelry collection featuring rings, necklaces, earrings, and bracelets. Shop elegant pieces crafted with precision and care.',
  keywords: ['jewelry', 'rings', 'necklaces', 'earrings', 'bracelets', 'handcrafted jewelry', 'RITAMIE'],
  openGraph: {
    title: 'Jewelry Collection | RITAMIE',
    description: 'Discover our stunning jewelry collection featuring elegant pieces crafted with precision.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jewelry Collection | RITAMIE',
    description: 'Discover our stunning jewelry collection featuring elegant pieces.',
  },
};

export default async function JewelryPage() {
  const possibleHandles = ['jewelry', 'jewellery', 'rings', 'necklaces', 'earrings', 'bracelets'];
  const [products, collections] = await Promise.all([
    (async () => {
      try {
        return await productsService.getProductsByMultipleHandles(possibleHandles);
      } catch (error) {
        return [];
      }
    })(),
    (async () => {
      try {
        return await collectionsService.getJewelryCollections();
      } catch (error) {
        return [];
      }
    })(),
  ]);

  return (
    <JewelryPageClient 
      initialProducts={products}
      initialCollections={collections}
    />
  );
}

