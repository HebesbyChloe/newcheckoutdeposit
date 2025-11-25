import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProductNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold text-[#101828] mb-4">Product Not Found</h1>
      <p className="text-[#667085] mb-8">
        Sorry, we couldn't find the product you're looking for.
      </p>
      <div className="flex gap-4 justify-center">
        <Link href="/diamonds-external">
          <Button>Browse Diamonds</Button>
        </Link>
        <Link href="/jewelry">
          <Button variant="outline">Browse Jewelry</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}

