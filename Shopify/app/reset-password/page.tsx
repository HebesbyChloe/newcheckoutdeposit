'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';
import { Suspense } from 'react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

function ResetPasswordContent() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-12 max-w-md">
        <CardSkeleton />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

