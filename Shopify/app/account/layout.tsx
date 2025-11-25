'use client';

import { useAuthStore } from '@/stores/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  User, 
  CreditCard, 
  Heart, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

interface AccountLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/account', icon: LayoutDashboard },
  { name: 'Orders', href: '/account/orders', icon: Package },
  { name: 'Addresses', href: '/account/addresses', icon: MapPin },
  { name: 'Profile', href: '/account/profile', icon: User },
  { name: 'Payment Methods', href: '/account/payments', icon: CreditCard },
  { name: 'Wishlist', href: '/account/wishlist', icon: Heart },
];

export default function AccountLayout({ children }: AccountLayoutProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const logout = useAuthStore((state) => state.logout);
  const customer = useAuthStore((state) => state.customer);
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-64">
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
          <div className="flex-1">
            <Skeleton className="h-9 w-48 mb-6" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="lg:sticky lg:top-4">
            {/* Mobile Menu Toggle */}
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-full"
              >
                {mobileMenuOpen ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Close Menu
                  </>
                ) : (
                  <>
                    <Menu className="h-4 w-4 mr-2" />
                    Menu
                  </>
                )}
              </Button>
            </div>

            {/* Navigation Menu */}
            <nav className={cn(
              "bg-white rounded-lg border border-gray-200 p-4",
              mobileMenuOpen ? "block" : "hidden lg:block"
            )}>
              <div className="mb-4 pb-4 border-b">
                <p className="text-sm font-medium text-[#1d2939]">
                  {customer?.firstName && customer?.lastName
                    ? `${customer.firstName} ${customer.lastName}`
                    : customer?.email || 'Account'}
                </p>
                <p className="text-xs text-[#667085] mt-1">{customer?.email}</p>
              </div>

              <ul className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          "hover:bg-gray-50",
                          isActive
                            ? "bg-[#2c5f6f]/10 text-[#2c5f6f]"
                            : "text-[#667085] hover:text-[#1d2939]"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
                <li className="pt-4 border-t">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

