'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/services/api-client';

export default function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  useEffect(() => {
    // Get reset URL from query params or hash
    const urlFromQuery = searchParams.get('token');
    const urlFromHash = typeof window !== 'undefined' ? window.location.hash.substring(1) : '';
    
    if (urlFromQuery) {
      // If token is in query, construct the reset URL
      // Shopify reset URLs typically look like: https://shop.myshopify.com/account/reset/{token}
      const shopDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
      if (shopDomain) {
        setResetUrl(`https://${shopDomain}/account/reset/${urlFromQuery}`);
      } else {
        setResetUrl(urlFromQuery);
      }
    } else if (urlFromHash) {
      setResetUrl(urlFromHash);
    } else {
      // Try to get from full URL
      if (typeof window !== 'undefined') {
        const fullUrl = window.location.href;
        setResetUrl(fullUrl);
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!resetUrl) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/api/auth/reset-password', { resetUrl, password });

      if (response.error) {
        setError(response.error || 'Failed to reset password');
        return;
      }

      setSuccess(true);
      // Redirect to account page after 2 seconds
      setTimeout(() => {
        router.push('/account');
        router.refresh();
      }, 2000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!resetUrl) {
    return (
      <div className="space-y-4">
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-600">
            Invalid or missing reset link. Please request a new password reset.
          </p>
        </div>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Request New Reset Link
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">
            Password reset successfully! Redirecting to your account...
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#1d2939] mb-2">
          New Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading || success}
          placeholder="••••••••"
          minLength={8}
        />
        <p className="text-xs text-[#667085] mt-1">Must be at least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1d2939] mb-2">
          Confirm New Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={loading || success}
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        disabled={loading || success}
        className="w-full bg-[#2c5f6f] hover:bg-[#234a56] text-white"
      >
        {loading ? 'Resetting...' : success ? 'Password Reset!' : 'Reset Password'}
      </Button>

      <div className="text-center text-sm text-[#667085]">
        <Link href="/login" className="text-[#2c5f6f] hover:underline font-medium">
          Back to Login
        </Link>
      </div>
    </form>
  );
}

