'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    const success = await login(email, password);
    
    if (success) {
      router.push('/account');
      router.refresh();
    } else {
      // Check if it's a verification error
      if (error?.includes('email verification') || error?.includes('verification')) {
        setLocalError(error);
      } else {
        setLocalError(error || 'Login failed. Please check your credentials.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(localError || error) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{localError || error}</p>
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
          disabled={loading}
          placeholder="your@email.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-[#1d2939]">
            Password
          </label>
          <Link href="/forgot-password" className="text-sm text-[#2c5f6f] hover:underline">
            Forgot Password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#2c5f6f] hover:bg-[#234a56] text-white"
      >
        {loading ? 'Logging in...' : 'Log In'}
      </Button>

      <div className="text-center text-sm text-[#667085]">
        Don't have an account?{' '}
        <Link href="/register" className="text-[#2c5f6f] hover:underline font-medium">
          Sign up
        </Link>
      </div>
    </form>
  );
}

