'use client';

import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CustomerOrder } from '@/types/shopify';
import { CardSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton';

export default function AccountDashboard() {
  const customer = useAuthStore((state) => state.customer);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const recentOrders = customer.orders.slice(0, 3);
  const totalOrders = customer.orders.length;
  const totalSpent = customer.orders.reduce((sum: number, order: CustomerOrder) => {
    return sum + parseFloat(order.totalPrice.amount);
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1d2939]">Account Dashboard</h1>
        <p className="text-[#667085] mt-2">
          Welcome back, {customer.firstName || customer.email}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#667085]">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-[#667085]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1d2939]">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#667085]">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-[#667085]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1d2939]">
              ${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[#667085]">Saved Addresses</CardTitle>
            <Calendar className="h-4 w-4 text-[#667085]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1d2939]">{customer.addresses.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/account/orders">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order: CustomerOrder) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-[#1d2939]">Order {order.name}</p>
                    <p className="text-sm text-[#667085]">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-[#667085] mt-1">
                      Status: {order.fulfillmentStatus} • {order.financialStatus}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#1d2939]">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: order.totalPrice.currencyCode,
                      }).format(parseFloat(order.totalPrice.amount))}
                    </p>
                    <Link href={`/account/orders/${order.id}`}>
                      <Button variant="ghost" size="sm" className="mt-2">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#667085] mb-4">No orders yet</p>
              <Link href="/">
                <Button>Start Shopping</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#667085] mb-4">
              Update your personal information and preferences
            </p>
            <Link href="/account/profile">
              <Button variant="outline" className="w-full">Edit Profile</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shipping Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#667085] mb-4">
              Manage your shipping and billing addresses
            </p>
            <Link href="/account/addresses">
              <Button variant="outline" className="w-full">Manage Addresses</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

