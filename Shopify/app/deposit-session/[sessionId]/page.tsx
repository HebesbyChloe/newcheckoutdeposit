'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DepositSession } from '@/types/partial-payment.types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function DepositSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<DepositSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/deposit-session/${sessionId}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch session');
        }
        const data = await response.json();
        setSession(data.session);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handlePayDeposit = async () => {
    if (!session) return;

    setCheckoutLoading(true);
    try {
      const response = await fetch(`/api/deposit-session/${sessionId}/checkout`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout');
      }

      const data = await response.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-red-600">{error || 'Session not found'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Deposit Payment</h1>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-semibold">${session.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit Amount:</span>
              <span className="font-semibold text-blue-600">${session.deposit_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining Amount:</span>
              <span className="font-semibold">${session.remaining_amount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between">
                <span className="font-semibold">Items:</span>
                <span className="text-gray-600">{session.items.length} item(s)</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
          <p className="text-gray-600 mb-4">
            You are paying a deposit of <strong>${session.deposit_amount.toFixed(2)}</strong> now. The remaining
            balance of <strong>${session.remaining_amount.toFixed(2)}</strong> will be due after your deposit is
            processed.
          </p>
        </Card>

        <div className="flex gap-4">
          <Button
            onClick={handlePayDeposit}
            disabled={checkoutLoading}
            className="flex-1"
            size="lg"
          >
            {checkoutLoading ? 'Processing...' : `Pay Deposit $${session.deposit_amount.toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

