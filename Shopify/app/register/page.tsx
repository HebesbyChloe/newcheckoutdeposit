'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import RegisterForm from '@/components/auth/RegisterForm';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function RegisterPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/account');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>
            Sign up to track your orders and manage your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}

