import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-[#101828] mb-4">Diamond Not Found</h1>
      <p className="text-[#667085] mb-8">
        The diamond you're looking for doesn't exist or has been removed.
      </p>
      <div className="flex gap-4 justify-center">
        <Link href="/diamonds-external">
          <Button>Browse All Diamonds</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
