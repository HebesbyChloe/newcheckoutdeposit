import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/layouts/Header'
import Footer from '@/components/layouts/Footer'
import AuthInitializer from '@/components/auth/AuthInitializer'
import CartInitializer from '@/components/cart/CartInitializer'
import CartSidePanelWrapper from '@/components/cart/CartSidePanelWrapper'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/lib/react-query/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Jewelry Store - Exquisite Handcrafted Jewelry',
  description: 'Discover exquisite handcrafted jewelry and diamonds. Shop our collection of elegant pieces.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthInitializer />
          <CartInitializer />
          <Header />
          <main>{children}</main>
          <Footer />
          <CartSidePanelWrapper />
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}


