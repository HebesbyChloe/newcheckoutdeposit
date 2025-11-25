import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function WishlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1d2939]">Wishlist</h1>
        <p className="text-[#667085] mt-2">
          Your saved favorite items
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-[#1d2939] mb-2">Your wishlist is empty</h3>
          <p className="text-[#667085] text-center mb-6 max-w-md">
            Save items you love for later. Click the heart icon on any product to add it to your wishlist.
          </p>
          <Link href="/">
            <Button className="bg-[#2c5f6f] hover:bg-[#234a56] text-white">
              Start Shopping
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Wishlist Feature
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#667085]">
            Wishlist functionality requires custom implementation. You can:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4 mt-2 text-sm text-[#667085]">
            <li>Store wishlist items in localStorage for client-side persistence</li>
            <li>Use Shopify metafields to store wishlists per customer</li>
            <li>Create a custom database table for wishlist management</li>
            <li>Use Shopify's Customer Account API (when migrated) for server-side storage</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

