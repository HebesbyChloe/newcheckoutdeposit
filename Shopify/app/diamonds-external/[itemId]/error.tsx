'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; details?: any };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('External Diamond Page Error:', error);
    if ((error as any).details) {
      console.error('Error details:', (error as any).details);
    }
  }, [error]);

  const errorDetails = (error as any).details || null;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-[#101828] mb-4">Something went wrong!</h1>
        <p className="text-[#667085] mb-8 text-lg">
          {error.message || 'An error occurred while loading the diamond details.'}
        </p>
        
        {errorDetails && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8 text-left">
            <p className="font-semibold text-sm text-gray-700 mb-2">API Response Details:</p>
            <pre className="text-xs overflow-auto max-h-96 bg-white p-3 rounded border border-gray-300">
              {JSON.stringify(errorDetails, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Link href="/diamonds-external">
            <Button variant="outline">Browse All Diamonds</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
