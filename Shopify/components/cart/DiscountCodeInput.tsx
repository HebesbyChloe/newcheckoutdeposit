'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tag, X } from 'lucide-react';

interface DiscountCodeInputProps {
  appliedCodes: Array<{ code: string; applicable: boolean }>;
  onApply: (code: string) => void;
  onRemove: () => void;
  loading?: boolean;
}

export default function DiscountCodeInput({ 
  appliedCodes, 
  onApply, 
  onRemove, 
  loading 
}: DiscountCodeInputProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Please enter a discount code');
      return;
    }

    setError(null);
    await onApply(code.trim().toUpperCase());
    setCode('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApply();
    }
  };

  const hasAppliedCodes = appliedCodes.length > 0;

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-[#1d2939]">
          <Tag className="h-4 w-4" />
          <span>Discount Code</span>
        </div>

        {/* Applied Codes */}
        {hasAppliedCodes && (
          <div className="flex flex-wrap gap-2">
            {appliedCodes.map((discount, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                  discount.applicable
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                <span>{discount.code}</span>
                {discount.applicable && (
                  <button
                    onClick={onRemove}
                    disabled={loading}
                    className="hover:opacity-70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Field */}
        {!hasAppliedCodes && (
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter discount code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleApply}
              disabled={loading || !code.trim()}
              variant="outline"
            >
              Apply
            </Button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600">
            {typeof error === 'string' ? error : (error?.message || 'An error occurred')}
          </p>
        )}
      </div>
    </Card>
  );
}

