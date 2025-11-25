'use client';

import { useState } from 'react';
import { Share2, Check, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface ShareCartProps {
  checkoutUrl: string;
  disabled?: boolean;
}

export default function ShareCart({ checkoutUrl, disabled }: ShareCartProps) {
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert(`Cart link: ${checkoutUrl}`);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Check if it's a valid phone number (10-15 digits)
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Format as +1XXXXXXXXXX if it starts with 1, or add +1 if it doesn't
    if (cleaned.length >= 10) {
      if (cleaned.startsWith('1') && cleaned.length === 11) {
        return `+${cleaned}`;
      } else if (cleaned.length === 10) {
        return `+1${cleaned}`;
      }
      return `+${cleaned}`;
    }
    return phone;
  };

  const handleShareViaText = () => {
    if (!phoneNumber.trim()) {
      setPhoneError('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    setPhoneError('');
    const formattedPhone = formatPhoneNumber(phoneNumber);
    const smsUrl = `sms:${formattedPhone}?body=${encodeURIComponent(`Check out my cart: ${checkoutUrl}`)}`;
    
    // Try to open SMS app
    window.location.href = smsUrl;
    
    // Fallback: copy link with phone number context
    navigator.clipboard.writeText(checkoutUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    try {
      // Try Web Share API first (mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: 'Checkout Cart',
          text: 'Check out my cart',
          url: checkoutUrl,
        });
        return;
      }

      // Fallback to clipboard copy
      await handleCopy();
    } catch (error) {
      // User cancelled share
      if (error instanceof Error && error.name !== 'AbortError') {
        await handleCopy();
      }
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-[#1d2939] flex items-center gap-2">
          <Share2 className="h-5 w-5 text-[#2c5f6f]" />
          Share Cart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-[#667085]">
          Share your cart link with others. Click the button below to copy the link automatically.
        </p>

        {/* Copy Link Button - Auto copies on click */}
        <Button
          onClick={handleCopy}
          disabled={disabled || !checkoutUrl}
          className="w-full bg-[#2c5f6f] hover:bg-[#234a56] text-white h-12"
          variant="default"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Link Copied!
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 mr-2" />
              Copy Cart Link
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-[#667085]">Or share via text</span>
          </div>
        </div>

        {/* Phone Number Input for SMS */}
        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-medium text-[#1d2939]">
            Phone Number
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#667085]" />
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError('');
                }}
                placeholder="+1 (555) 123-4567"
                className="pl-10"
                disabled={disabled || !checkoutUrl}
              />
            </div>
            <Button
              onClick={handleShareViaText}
              disabled={disabled || !checkoutUrl || !phoneNumber.trim()}
              className="bg-[#2c5f6f] hover:bg-[#234a56] text-white shrink-0"
              variant="default"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
          {phoneError && (
            <p className="text-sm text-red-600">{phoneError}</p>
          )}
          <p className="text-xs text-[#667085]">
            Enter a phone number to share via text message
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

