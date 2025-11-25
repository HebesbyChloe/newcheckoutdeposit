'use client';

import { useState } from 'react';
import { Cart } from '@/types/api.types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/services/api-client';
import { useCartStore } from '@/stores/cartStore';
import { DepositSessionResponse } from '@/types/partial-payment.types';

interface CartSummaryProps {
  cart: Cart;
  onCheckout: () => void;
  loading?: boolean;
}

export default function CartSummary({ cart, onCheckout, loading }: CartSummaryProps) {
  const [partialPaymentLoading, setPartialPaymentLoading] = useState(false);
  
  // Handle both Shopify cart structure and custom backend structure
  const isShopifyCart = cart.cost?.subtotalAmount !== undefined;
  let subtotal = 0;
  let total = 0;
  let tax = 0;
  let currency = 'USD';
  
  if (isShopifyCart) {
    // Shopify cart structure
    subtotal = parseFloat(cart.cost.subtotalAmount.amount);
    total = parseFloat(cart.cost.totalAmount.amount);
    tax = cart.cost.totalTaxAmount ? parseFloat(cart.cost.totalTaxAmount.amount) : 0;
    currency = cart.cost.totalAmount.currencyCode;
  } else {
    // Custom backend structure - calculate from lines
    if (cart.lines && cart.lines.length > 0) {
      // Calculate subtotal from all lines
      subtotal = cart.lines.reduce((sum, line) => {
        if (line.price?.amount) {
          return sum + (parseFloat(line.price.amount) * line.quantity);
        } else if (line.merchandise?.price?.amount) {
          return sum + (parseFloat(line.merchandise.price.amount) * line.quantity);
        }
        return sum;
      }, 0);
      
      // Get currency from first line
      const firstLine = cart.lines[0];
      currency = firstLine?.price?.currencyCode || 
                 firstLine?.merchandise?.price?.currencyCode || 
                 'USD';
      
      // For now, total = subtotal (no tax or discounts in custom structure)
      total = subtotal;
      tax = 0;
    }
  }
  
  const hasDiscount = cart.discountCodes && cart.discountCodes.length > 0;
  const discount = hasDiscount ? subtotal - total + tax : 0;

  // Calculate deposit amount (30% of total, minimum $50)
  const depositAmount = Math.max(total * 0.3, 50);
  const remainingAmount = total - depositAmount;

  const handlePartialPayment = () => {
    const cartId =
      typeof window !== 'undefined'
        ? useCartStore.getState().getCartId()
        : null;

    if (!cartId) {
      alert('Internal cart not found');
      return;
    }

    // Navigate to deposit plan selection page
    window.location.href = `/deposit/select-plan?cartId=${cartId}`;
  };

  return (
    <Card className="p-6 sticky top-4">
      <h2 className="text-xl font-semibold text-[#1d2939] mb-6">Order Summary</h2>

      <div className="space-y-4 mb-6">
        {/* Subtotal */}
        <div className="flex justify-between text-[#667085]">
          <span>Subtotal</span>
          <span>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency,
            }).format(subtotal)}
          </span>
        </div>

        {/* Discount */}
        {hasDiscount && discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>
              -{new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
              }).format(discount)}
            </span>
          </div>
        )}

        {/* Tax */}
        {tax > 0 && (
          <div className="flex justify-between text-[#667085]">
            <span>Tax</span>
            <span>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency,
              }).format(tax)}
            </span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-lg font-semibold text-[#1d2939] pt-4 border-t">
          <span>Total</span>
          <span>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency,
            }).format(total)}
          </span>
        </div>
      </div>

      {/* Partial Payment Option */}
      {total > 50 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-semibold text-[#1d2939] mb-2">Payment Options</h3>
          <div className="space-y-2 text-xs text-[#667085] mb-3">
            <div className="flex justify-between">
              <span>Pay Deposit (30%):</span>
              <span className="font-medium">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                }).format(depositAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Remaining Balance:</span>
              <span className="font-medium">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency,
                }).format(remainingAmount)}
              </span>
            </div>
          </div>
          <Button
            onClick={handlePartialPayment}
            disabled={partialPaymentLoading || loading || cart.lines.length === 0}
            className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm"
            size="sm"
          >
            {partialPaymentLoading ? 'Creating...' : 'Pay Deposit Now'}
          </Button>
        </div>
      )}

      {/* Full Checkout Button */}
      <Button
        onClick={onCheckout}
        disabled={loading || cart.lines.length === 0}
        className="w-full h-12 bg-[#2c5f6f] hover:bg-[#234a56] text-white uppercase tracking-wide"
        size="lg"
      >
        {loading ? 'Processing...' : 'Pay Full Amount'}
      </Button>

      {/* Continue Shopping Link */}
      <Button
        variant="outline"
        className="w-full mt-3"
        onClick={() => window.location.href = '/'}
      >
        Continue Shopping
      </Button>
    </Card>
  );
}

