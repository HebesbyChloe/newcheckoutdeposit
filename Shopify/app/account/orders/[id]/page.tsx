'use client';

import { useAuthStore } from '@/stores/authStore';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ArrowLeft, Calendar, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CustomerOrder } from '@/types/shopify';
import { CardSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton';

export default function OrderDetailPage() {
  const customer = useAuthStore((state) => state.customer);
  const loading = useAuthStore((state) => state.loading);
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
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

  const order = customer.orders.find((o: CustomerOrder) => o.id === orderId);

  if (!order) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-[#1d2939] mb-2">Order not found</h3>
            <p className="text-[#667085] text-center mb-6">
              We couldn't find this order. It may have been deleted or you don't have access to it.
            </p>
            <Link href="/account/orders">
              <Button>View All Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-[#1d2939]">Order {order.name}</h1>
          <p className="text-[#667085] mt-1">
            Order #{order.orderNumber}
          </p>
        </div>
      </div>

      {/* Order Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-[#667085]">Fulfillment</p>
                <p className="font-medium text-[#1d2939]">{order.fulfillmentStatus}</p>
              </div>
              <div>
                <p className="text-sm text-[#667085]">Payment</p>
                <p className="font-medium text-[#1d2939]">{order.financialStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Order Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#1d2939]">
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.lineItems.map((item: CustomerOrder['lineItems'][0], index: number) => (
              <div
                key={index}
                className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-[#1d2939]">{item.title}</p>
                  {item.variant && item.variant.title !== 'Default Title' && (
                    <p className="text-sm text-[#667085] mt-1">
                      Variant: {item.variant.title}
                    </p>
                  )}
                  <p className="text-sm text-[#667085] mt-1">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  {item.originalUnitPrice && (
                    <>
                      <p className="font-semibold text-[#1d2939]">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: item.originalUnitPrice.currencyCode,
                        }).format(parseFloat(item.originalUnitPrice.amount))}
                      </p>
                      <p className="text-sm text-[#667085]">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: item.originalUnitPrice.currencyCode,
                        }).format(parseFloat(item.originalUnitPrice.amount) * item.quantity)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Order Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-[#667085]">
              <span>Subtotal</span>
              <span>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: order.totalPrice.currencyCode,
                }).format(parseFloat(order.totalPrice.amount))}
              </span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-[#1d2939] pt-4 border-t">
              <span>Total</span>
              <span>
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: order.totalPrice.currencyCode,
                }).format(parseFloat(order.totalPrice.amount))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

