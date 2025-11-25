import { Suspense } from 'react';
import ExternalDiamondsPageClient from './DiamondsPageClient';

export default function ExternalDiamondsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-[#667085]">Loading...</p>
        </div>
      </div>
    }>
      <ExternalDiamondsPageClient />
    </Suspense>
  );
}
