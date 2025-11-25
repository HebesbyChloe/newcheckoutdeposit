'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    const result = await register(email, password, firstName, lastName, phone);
    
    if (result.success) {
      if (result.requiresVerification) {
        // Show verification message instead of redirecting
        setVerificationMessage(result.message || 'Please check your email to verify your account.');
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setFirstName('');
        setLastName('');
        setPhone('');
      } else {
        // Account created and logged in, redirect to account
        router.push('/account');
        router.refresh();
      }
    } else {
      setLocalError(error || 'Registration failed. Please try again.');
    }
  };

  // Show verification message if account was created but needs verification
  if (verificationMessage) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Account Created!</h3>
          <p className="text-sm text-green-700 mb-4">{verificationMessage}</p>
          <p className="text-xs text-green-600">
            After verifying your email, you can log in to your account.
          </p>
        </div>
        <div className="text-center">
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(localError || error) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{localError || error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-[#1d2939] mb-2">
            First Name
          </label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
            placeholder="John"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-[#1d2939] mb-2">
            Last Name
          </label>
          <Input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[#1d2939] mb-2">
          Email *
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
        <label htmlFor="phone" className="block text-sm font-medium text-[#1d2939] mb-2">
          Phone <span className="text-xs text-[#667085]">(optional)</span>
        </label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={loading}
          placeholder="+1 (555) 123-4567"
        />
        <p className="text-xs text-[#667085] mt-1">
          Format: +1XXXXXXXXXX or leave blank
        </p>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#1d2939] mb-2">
          Password *
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          placeholder="••••••••"
          minLength={8}
        />
        <p className="text-xs text-[#667085] mt-1">Must be at least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1d2939] mb-2">
          Confirm Password *
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>

      <div className="text-center text-sm text-[#667085]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#2c5f6f] hover:underline font-medium">
          Log in
        </Link>
      </div>
    </form>
  );
}

