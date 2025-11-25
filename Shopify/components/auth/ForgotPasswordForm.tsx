'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/services/api-client';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });

      if (response.error) {
        setError(response.error || 'Failed to send password reset email');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">
            If an account exists with this email, you will receive a password reset link.
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#1d2939] mb-2">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading || success}
          placeholder="your@email.com"
        />
      </div>

      <Button
        type="submit"
        disabled={loading || success}
        className="w-full bg-[#2c5f6f] hover:bg-[#234a56] text-white"
      >
        {loading ? 'Sending...' : success ? 'Email Sent' : 'Send Reset Link'}
      </Button>

      <div className="text-center text-sm text-[#667085]">
        Remember your password?{' '}
        <Link href="/login" className="text-[#2c5f6f] hover:underline font-medium">
          Log in
        </Link>
      </div>
    </form>
  );
}

