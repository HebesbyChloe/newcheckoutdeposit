'use client';

import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';

export default function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <ShoppingBag className="h-12 w-12 text-gray-400" />
      </div>
      
      <h2 className="text-2xl font-semibold text-[#1d2939] mb-2">Your cart is empty</h2>
      <p className="text-[#667085] mb-8 text-center max-w-md">
        Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
      </p>

      <Link href="/">
        <Button className="bg-[#2c5f6f] hover:bg-[#234a56] text-white">
          Continue Shopping
        </Button>
      </Link>
    </div>
  );
}

