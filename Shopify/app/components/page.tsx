'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';

export default function ComponentsGalleryPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#1d2939] mb-6">Components</h1>
      <p className="text-sm text-[#667085] mb-8">
        This page is a simple index for UI components and demo layouts in your storefront.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1d2939] mb-1">
              Product Card
            </h2>
            <p className="text-xs text-[#667085] mb-2">
              Standard product card used on collection and search pages.
            </p>
          </div>
          <Link
            href="/jewelry"
            className="mt-2 text-sm text-[#2c5f6f] hover:underline"
          >
            View in jewelry collection
          </Link>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1d2939] mb-1">
              Diamonds Table (External)
            </h2>
            <p className="text-xs text-[#667085] mb-2">
              Table-based view of external diamonds with filters and compact details.
            </p>
          </div>
          <Link
            href="/diamonds-external"
            className="mt-2 text-sm text-[#2c5f6f] hover:underline"
          >
            View external diamonds
          </Link>
        </Card>

        <Card className="p-4 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1d2939] mb-1">
              Cart Side Panel
            </h2>
            <p className="text-xs text-[#667085] mb-2">
              Slide-out cart panel showing internal cart items and payment options.
            </p>
          </div>
          <Link
            href="/cart"
            className="mt-2 text-sm text-[#2c5f6f] hover:underline"
          >
            Open cart
          </Link>
        </Card>
      </div>
    </div>
  );
}


