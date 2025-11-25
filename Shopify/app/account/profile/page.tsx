'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton';

export default function ProfilePage() {
  const customer = useAuthStore((state) => state.customer);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const loading = useAuthStore((state) => state.loading);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setFirstName(customer.firstName || '');
      setLastName(customer.lastName || '');
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
    }
  }, [customer]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const success = await updateProfile({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phone: phone || undefined,
    });

    if (success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError('Failed to update profile. Please try again.');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1d2939]">Profile Settings</h1>
        <p className="text-[#667085] mt-2">
          Manage your personal information and account details
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your name, email, and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-600">Profile updated successfully!</p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-[#1d2939] mb-2">
                  First Name
                </label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={saving}
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
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1d2939] mb-2">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#1d2939] mb-2">
                Phone
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#2c5f6f] hover:bg-[#234a56] text-white"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

