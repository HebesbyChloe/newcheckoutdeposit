'use client';

import Link from 'next/link';
import { User, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useCallback } from 'react';
import CartIcon from '@/components/common/CartIcon';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, usePathname } from 'next/navigation';
import SearchBar from '@/components/search/SearchBar';
import { cn } from '@/utils/cn';

// Extract navigation links to constant
const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/jewelry', label: 'Jewelry' },
  { href: '/diamonds-external', label: 'External Diamonds' },
  { href: '/components-demo', label: 'Components' },
  { href: '/about', label: 'About' },
] as const;

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const customer = useAuthStore((state) => state.customer);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();

  // Memoize logout handler
  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/');
    router.refresh();
  }, [logout, router]);

  // Close mobile menu handler
  const closeMobileMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="banner">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2 rounded"
          aria-label="RITAMIE Home"
        >
          <span className="text-2xl font-bold">💎 Jewelry Store</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6" role="navigation" aria-label="Main navigation">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className={cn(
                  "text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2 rounded px-2",
                  isActive 
                    ? "text-primary font-semibold" 
                    : "hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4" role="toolbar" aria-label="User actions">
          <div className="hidden md:block">
            <SearchBar />
          </div>
          {isAuthenticated ? (
            <>
              <Link href="/account">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title={customer?.email || 'Account'}
                  className="focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2"
                  aria-label={`Account: ${customer?.email || 'User account'}`}
                >
                  <User className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">User account</span>
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout} 
                title="Logout"
                className="focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Logout</span>
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button 
                variant="ghost" 
                size="icon" 
                title="Login"
                className="focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2"
                aria-label="Login"
              >
                <User className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Login</span>
              </Button>
            </Link>
          )}
          <CartIcon />
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{isMenuOpen ? 'Close' : 'Open'} navigation menu</span>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div 
          className="md:hidden border-t"
          id="mobile-menu"
          role="menu"
          aria-label="Mobile navigation menu"
        >
          <div className="container px-4 py-4">
            <div className="mb-4">
              <SearchBar />
            </div>
            <nav className="flex flex-col space-y-4" role="navigation">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.href}
                    href={link.href} 
                    className={cn(
                      "text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#3d6373] focus:ring-offset-2 rounded px-2",
                      isActive && "text-primary font-semibold"
                    )}
                    role="menuitem"
                    onClick={closeMobileMenu}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

