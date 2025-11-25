import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DiamondIcon from '@/components/ui/DiamondIcon';
import { Home, Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: '404 - Page Not Found | RITAMIE',
  description: 'The page you are looking for could not be found. Return to our jewelry collection.',
};

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-[#f9fafb] via-white to-[#f2f4f7]">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Diamond Icon with Animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <DiamondIcon size="lg" color="#3d6373" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-bold text-[#3d6373] opacity-20">404</span>
              </div>
            </div>
          </div>

          {/* Main Message */}
          <h1 className="font-serif text-[#101828] text-4xl sm:text-5xl lg:text-6xl font-semibold mb-4 tracking-tight">
            Page Not Found
          </h1>
          
          <p className="text-[#667085] text-lg sm:text-xl mb-2">
            Oops! The page you're looking for seems to have vanished like a rare gem.
          </p>
          
          <p className="text-[#667085] text-base mb-12">
            Don't worry, we'll help you find your way back to our exquisite collection.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              asChild
              size="lg"
              className="bg-[#3d6373] hover:bg-[#2d4d5a] text-white px-8 py-6 text-base font-medium transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Back to Home
              </Link>
            </Button>
            
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-[#3d6373] text-[#3d6373] hover:bg-[#3d6373] hover:text-white px-8 py-6 text-base font-medium transition-all duration-300"
            >
              <Link href="/jewelry" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Browse Jewelry
              </Link>
            </Button>
          </div>

          {/* Quick Links */}
          <div className="border-t border-[#DEC481]/30 pt-8">
            <p className="text-[#1d2939] text-sm font-medium mb-4">Quick Links:</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link
                href="/"
                className="text-[#3d6373] hover:text-[#2d4d5a] transition-colors underline-offset-4 hover:underline"
              >
                Home
              </Link>
              <span className="text-[#DEC481]">•</span>
              <Link
                href="/jewelry"
                className="text-[#3d6373] hover:text-[#2d4d5a] transition-colors underline-offset-4 hover:underline"
              >
                Jewelry
              </Link>
              <span className="text-[#DEC481]">•</span>
              <Link
                href="/diamonds-external"
                className="text-[#3d6373] hover:text-[#2d4d5a] transition-colors underline-offset-4 hover:underline"
              >
                External Diamonds
              </Link>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="mt-16 flex justify-center gap-2 opacity-20">
            <DiamondIcon size="sm" color="#DEC481" />
            <DiamondIcon size="sm" color="#3d6373" />
            <DiamondIcon size="sm" color="#DEC481" />
          </div>
        </div>
      </div>
    </div>
  );
}

