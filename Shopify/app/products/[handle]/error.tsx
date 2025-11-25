'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-[#101828] mb-4">Something went wrong</h1>
      <p className="text-[#667085] mb-8">
        {error.message || 'An error occurred while loading the product.'}
      </p>
      <div className="flex gap-4 justify-center">
        <Button onClick={reset}>Try again</Button>
        <Link href="/diamonds-external">
          <Button variant="outline">Browse Diamonds</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}

