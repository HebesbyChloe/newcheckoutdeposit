'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Order } from '@/services/shopify/admin/order.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PartialPaymentData {
  order: Order;
  depositAmount: number;
  remainingAmount: number;
  depositPaid: boolean;
  remainingPaid: boolean;
  paymentStatus: string;
  paymentLink?: string;
}

export default function PartialPaymentPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [data, setData] = useState<PartialPaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        // Fetch order data from server-side API
        const response = await fetch(`/api/orders/${orderId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch order');
        }
        const orderData = await response.json();
        setData(orderData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const handlePayRemaining = () => {
    if (data?.paymentLink) {
      window.location.href = data.paymentLink;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-600">{error || 'Order not found'}</p>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_deposit':
        return <Badge variant="outline">Pending Deposit</Badge>;
      case 'partial_paid':
        return <Badge variant="default">Partially Paid</Badge>;
      case 'fully_paid':
        return <Badge className="bg-green-600">Fully Paid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Payment Status</h1>
          {getStatusBadge(data.paymentStatus)}
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-semibold">{data.order.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold">
                ${parseFloat(data.order.totalPriceSet.shopMoney.amount).toFixed(2)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Payment Timeline</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                data.depositPaid ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {data.depositPaid ? '✓' : '1'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Deposit Payment</h3>
                  {data.depositPaid && <Badge className="bg-green-600">Paid</Badge>}
                </div>
                <p className="text-gray-600">${data.depositAmount.toFixed(2)}</p>
                {data.depositPaid && (
                  <p className="text-sm text-green-600 mt-1">Completed</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                data.remainingPaid ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {data.remainingPaid ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Remaining Balance</h3>
                  {data.remainingPaid && <Badge className="bg-green-600">Paid</Badge>}
                </div>
                <p className="text-gray-600">${data.remainingAmount.toFixed(2)}</p>
                {data.remainingPaid ? (
                  <p className="text-sm text-green-600 mt-1">Completed</p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">Pending</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {!data.remainingPaid && data.paymentLink && (
          <Card className="p-6 mb-6 bg-blue-50">
            <h2 className="text-xl font-semibold mb-4">Pay Remaining Balance</h2>
            <p className="text-gray-600 mb-4">
              Complete your payment by paying the remaining balance of{' '}
              <strong>${data.remainingAmount.toFixed(2)}</strong>.
            </p>
            <Button onClick={handlePayRemaining} className="w-full" size="lg">
              Pay Remaining ${data.remainingAmount.toFixed(2)}
            </Button>
          </Card>
        )}

        {data.remainingPaid && (
          <Card className="p-6 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">✓</span>
              <h2 className="text-xl font-semibold text-green-800">Payment Complete</h2>
            </div>
            <p className="text-green-700">Your order has been fully paid. Thank you!</p>
          </Card>
        )}
      </div>
    </div>
  );
}

