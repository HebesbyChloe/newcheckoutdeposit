import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, AlertCircle } from 'lucide-react';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1d2939]">Payment Methods</h1>
        <p className="text-[#667085] mt-2">
          Manage your saved payment methods
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-[#1d2939] mb-2">
            Payment Methods Not Available
          </h3>
          <p className="text-[#667085] text-center mb-6 max-w-md">
            Saved payment methods are not available through the Storefront API. 
            Payment information is securely handled during checkout through Shopify's secure payment system.
          </p>
          <p className="text-sm text-[#667085] text-center">
            To save payment methods, you would need to migrate to Shopify's Customer Account API, 
            which provides enhanced payment method management capabilities.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            About Payment Methods
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="space-y-2">
            <p>
              The Shopify Storefront API (which we're currently using) does not support 
              saving or managing payment methods directly. Payment information is collected 
              securely during the checkout process.
            </p>
            <p>
              To enable saved payment methods, you would need to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Migrate to Shopify's Customer Account API</li>
              <li>Implement Shopify Payments or a compatible payment gateway</li>
              <li>Set up tokenization for secure payment storage</li>
            </ul>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}

