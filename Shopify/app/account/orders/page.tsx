'use client';

import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CustomerOrder } from '@/types/shopify';
import { CardSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton';

export default function OrdersPage() {
  const customer = useAuthStore((state) => state.customer);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const orders = customer.orders;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1d2939]">Order History</h1>
        <p className="text-[#667085] mt-2">
          View and track all your orders
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order: CustomerOrder) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">Order {order.name}</CardTitle>
                    <p className="text-sm text-[#667085] mt-1">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#1d2939]">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: order.totalPrice.currencyCode,
                      }).format(parseFloat(order.totalPrice.amount))}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.fulfillmentStatus === 'FULFILLED'
                          ? 'bg-green-100 text-green-700'
                          : order.fulfillmentStatus === 'PARTIAL'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {order.fulfillmentStatus}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.financialStatus === 'PAID'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {order.financialStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-[#667085]">
                    <Package className="h-4 w-4" />
                    <span>{order.lineItems.length} item{order.lineItems.length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="space-y-2">
                    {order.lineItems.slice(0, 3).map((item: CustomerOrder['lineItems'][0], index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-[#1d2939]">
                          {item.title}
                          {item.variant && item.variant.title !== 'Default Title' && (
                            <span className="text-[#667085] ml-2">({item.variant.title})</span>
                          )}
                          <span className="text-[#667085] ml-2">× {item.quantity}</span>
                        </span>
                        {item.originalUnitPrice && (
                          <span className="text-[#1d2939] font-medium">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: item.originalUnitPrice.currencyCode,
                            }).format(parseFloat(item.originalUnitPrice.amount))}
                          </span>
                        )}
                      </div>
                    ))}
                    {order.lineItems.length > 3 && (
                      <p className="text-sm text-[#667085]">
                        +{order.lineItems.length - 3} more item{order.lineItems.length - 3 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <Link href={`/account/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-[#1d2939] mb-2">No orders yet</h3>
            <p className="text-[#667085] text-center mb-6 max-w-md">
              You haven't placed any orders yet. Start shopping to see your order history here.
            </p>
            <Link href="/">
              <Button className="bg-[#2c5f6f] hover:bg-[#234a56] text-white">
                Start Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

