'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/services/api-client';
import { useCartStore } from '@/stores/cartStore';
import { GatewayResponse } from '@/types/api.types';

interface DepositPlan {
  id: string;
  name: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED' | 'HYBRID';
  percentage: number | null;
  fixedAmount: number | null;
  numberOfInstalments: number;
  minDeposit: number | null;
  maxDeposit: number | null;
  isDefault: boolean;
  active: boolean;
}

interface PaymentBreakdown {
  paymentNumber: number;
  amount: number;
}

function DepositPlanSelectionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const cartId = searchParams.get('cartId') || useCartStore.getState().getCartId();
  
  const [plans, setPlans] = useState<DepositPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<DepositPlan | null>(null);
  const [cartTotal, setCartTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>([]);

  // Fetch plans and cart total
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch plans - gateway returns { data: [...], error: null }
        const plansResponse = await apiClient.get<GatewayResponse<DepositPlan[]>>('/api/gw/v1/deposit-plans');
        
        // Debug logging
        if (process.env.NODE_ENV !== 'production') {
          console.log('Plans API Response:', {
            hasError: !!plansResponse.error,
            hasData: !!plansResponse.data,
            dataType: typeof plansResponse.data,
            dataKeys: plansResponse.data ? Object.keys(plansResponse.data as any) : [],
            fullResponse: plansResponse
          });
        }
        
        // Handle apiClient error
        if (plansResponse.error) {
          throw new Error(plansResponse.error);
        }

        // Extract data from gateway envelope
        // The response might be directly the envelope, or the data might be the envelope
        let gatewayResponse: GatewayResponse<DepositPlan[]> | undefined;
        let plansData: DepositPlan[] | DepositPlan | undefined;
        
        // Check if plansResponse.data is already the envelope
        if (plansResponse.data && typeof plansResponse.data === 'object' && 'data' in plansResponse.data) {
          gatewayResponse = plansResponse.data as GatewayResponse<DepositPlan[]>;
        } else if (Array.isArray(plansResponse.data)) {
          // Backend might have returned array directly (shouldn't happen with gateway, but handle it)
          plansData = plansResponse.data as DepositPlan[];
        } else {
          // Try to treat plansResponse.data as the envelope
          gatewayResponse = plansResponse.data as GatewayResponse<DepositPlan[]>;
        }
        
        // Debug logging
        if (process.env.NODE_ENV !== 'production') {
          console.log('Gateway Response Debug:', {
            plansResponseDataType: typeof plansResponse.data,
            plansResponseDataIsArray: Array.isArray(plansResponse.data),
            hasGatewayResponse: !!gatewayResponse,
            gatewayResponseKeys: gatewayResponse ? Object.keys(gatewayResponse) : [],
            hasError: !!gatewayResponse?.error,
            hasData: !!gatewayResponse?.data,
            dataType: typeof gatewayResponse?.data,
            isArray: Array.isArray(gatewayResponse?.data),
            dataLength: Array.isArray(gatewayResponse?.data) ? gatewayResponse.data.length : 'not array',
            fullGatewayResponse: gatewayResponse,
            fullPlansResponse: plansResponse
          });
        }
        
        // Handle gateway error
        if (gatewayResponse?.error) {
          throw new Error(gatewayResponse.error.message || 'Failed to fetch deposit plans');
        }

        // Get plans array from gateway response
        if (!plansData) {
          plansData = gatewayResponse?.data;
        }
        
        if (!plansData) {
          throw new Error('No plans data returned from server');
        }

        const fetchedPlans = Array.isArray(plansData) ? plansData : [plansData];
        
        if (fetchedPlans.length === 0) {
          throw new Error('No deposit plans available. Please contact support.');
        }
        
        setPlans(fetchedPlans);
        
        // Set default plan (first plan or plan with isDefault = true)
        const defaultPlan = fetchedPlans.find(p => p.isDefault) || fetchedPlans[0];
        if (defaultPlan) {
          setSelectedPlan(defaultPlan);
        }

        // Fetch cart total
        if (cartId) {
          const cartResponse = await apiClient.get<GatewayResponse<{ cartId: string; cart: any }>>(`/api/gw/v1/cart?cartId=${cartId}`);
          
          // Handle apiClient error
          if (cartResponse.error) {
            console.warn('Failed to fetch cart:', cartResponse.error);
            return;
          }

          // Extract data from gateway envelope
          const cartGatewayResponse = cartResponse.data as GatewayResponse<{ cartId: string; cart: any }> | undefined;
          
          // Handle gateway error
          if (cartGatewayResponse?.error) {
            console.warn('Gateway error fetching cart:', cartGatewayResponse.error.message);
            return;
          }

          const cart = cartGatewayResponse?.data?.cart;
          if (cart) {
            // Calculate total from cart
            let total = 0;
            if (cart.totalAmount) {
              total = typeof cart.totalAmount === 'number' ? cart.totalAmount : parseFloat(cart.totalAmount);
            } else if (cart.lines && cart.lines.length > 0) {
              total = cart.lines.reduce((sum: number, line: any) => {
                const amount = line.price?.amount || line.merchandise?.price?.amount || 0;
                return sum + (parseFloat(amount) * line.quantity);
              }, 0);
            }
            setCartTotal(total);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          error: err
        });
        setError(err instanceof Error ? err.message : 'Failed to load deposit plans');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cartId]);

  // Calculate payment breakdown when plan or cart total changes
  useEffect(() => {
    if (selectedPlan && cartTotal > 0) {
      const breakdown: PaymentBreakdown[] = [];
      
      // Calculate first payment
      let firstAmount: number;
      if (selectedPlan.type === 'PERCENTAGE' && selectedPlan.percentage) {
        firstAmount = cartTotal * (selectedPlan.percentage / 100);
      } else if (selectedPlan.type === 'FIXED' && selectedPlan.fixedAmount) {
        firstAmount = selectedPlan.fixedAmount;
      } else {
        firstAmount = cartTotal * 0.3; // Fallback to 30%
      }

      // Ensure first amount doesn't exceed total
      if (firstAmount > cartTotal) {
        firstAmount = cartTotal;
      }

      breakdown.push({ paymentNumber: 1, amount: firstAmount });

      // Calculate remaining payments
      const remaining = cartTotal - firstAmount;
      const remainingPayments = selectedPlan.numberOfInstalments - 1;
      
      if (remainingPayments > 0) {
        const remainingAmountPerPayment = remaining / remainingPayments;
        for (let i = 0; i < remainingPayments; i++) {
          breakdown.push({ paymentNumber: i + 2, amount: remainingAmountPerPayment });
        }
      }

      setPaymentBreakdown(breakdown);
    }
  }, [selectedPlan, cartTotal]);

  const handleConfirmPlan = async () => {
    if (!selectedPlan || !cartId) {
      alert('Please select a plan and ensure you have a cart');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post<GatewayResponse<{ 
        session_id: string; 
        checkout_url?: string;
        deposit_session_url?: string;
      }>>('/api/gw/v1/deposit-sessions', {
        cartId,
        plan_id: selectedPlan.id
      });

      // Debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('Deposit Session Creation Response:', {
          hasError: !!response.error,
          hasData: !!response.data,
          responseDataType: typeof response.data,
          responseDataKeys: response.data ? Object.keys(response.data) : [],
          fullResponse: response
        });
      }

      // Handle apiClient error
      if (response.error) {
        throw new Error(response.error);
      }

      // The apiClient returns { data: gatewayEnvelope }
      // The gateway envelope is { data: {...}, error: null }
      // So response.data is the gateway envelope
      const gatewayResponse = response.data as GatewayResponse<{ 
        session_id: string; 
        checkout_url?: string;
        deposit_session_url?: string;
        draft_order_ids?: string[];
        payment_amounts?: number[];
      }> | undefined;

      // Debug logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('Gateway Deposit Session Response:', {
          hasError: !!gatewayResponse?.error,
          hasData: !!gatewayResponse?.data,
          errorCode: gatewayResponse?.error?.code,
          errorMessage: gatewayResponse?.error?.message,
          dataKeys: gatewayResponse?.data ? Object.keys(gatewayResponse.data) : [],
          fullGatewayResponse: gatewayResponse
        });
      }

      // Handle gateway error
      if (gatewayResponse?.error) {
        const errorMessage = gatewayResponse.error.message || gatewayResponse.error.code || 'Failed to create deposit session';
        throw new Error(errorMessage);
      }

      // Extract data from gateway envelope
      // If gatewayResponse.data exists, use it; otherwise, try response.data directly (in case gateway returns data directly)
      let data = gatewayResponse?.data;
      if (!data && response.data && typeof response.data === 'object' && 'session_id' in response.data) {
        // Gateway might have returned data directly without envelope
        data = response.data as any;
      }
      
      if (!data) {
        console.error('No data in response:', { response, gatewayResponse });
        throw new Error('No data returned from server');
      }
      
      // Redirect to checkout URL if available, otherwise show success message
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data.session_id) {
        // Fallback: redirect to deposit session page
        router.push(`/deposit-session/${data.session_id}`);
      } else {
        throw new Error('No checkout URL or session ID returned');
      }
    } catch (err) {
      console.error('Error creating deposit session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create deposit session. Please try again.';
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && plans.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6">
            <h1 className="text-2xl font-semibold text-[#1d2939] mb-4">Select Deposit Plan</h1>
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={() => router.back()}>Go Back</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold text-[#1d2939] mb-2">Select Deposit Plan</h1>
        <p className="text-[#667085] mb-8">Choose a payment plan that works for you</p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            {error}
          </div>
        )}

        {/* Plan Selection */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#1d2939] mb-4">Available Plans</h2>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  selectedPlan?.id === plan.id
                    ? 'border-[#2c5f6f] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-[#1d2939]">{plan.name}</h3>
                      {plan.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-sm text-[#667085] mb-2">{plan.description}</p>
                    )}
                    <div className="text-sm text-[#667085]">
                      <span className="font-medium">Payment Schedule: </span>
                      {plan.numberOfInstalments} payment{plan.numberOfInstalments > 1 ? 's' : ''}
                    </div>
                  </div>
                  <input
                    type="radio"
                    checked={selectedPlan?.id === plan.id}
                    onChange={() => setSelectedPlan(plan)}
                    className="mt-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Payment Breakdown */}
        {selectedPlan && paymentBreakdown.length > 0 && (
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-[#1d2939] mb-4">Payment Breakdown</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-[#667085]">Cart Total</span>
                <span className="text-lg font-semibold text-[#1d2939]">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(cartTotal)}
                </span>
              </div>
              {paymentBreakdown.map((payment) => (
                <div key={payment.paymentNumber} className="flex justify-between items-center">
                  <span className="text-[#667085]">
                    Payment {payment.paymentNumber} of {selectedPlan.numberOfInstalments}
                  </span>
                  <span className="font-semibold text-[#1d2939]">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmPlan}
            disabled={!selectedPlan || submitting || !cartId}
            className="flex-1 bg-[#2c5f6f] hover:bg-[#234a56] text-white"
          >
            {submitting ? 'Creating...' : 'Confirm Plan & Pay'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DepositPlanSelectionPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <DepositPlanSelectionContent />
    </Suspense>
  );
}

