'use client';

import { useState, useCallback, useEffect } from 'react';
import { Customer, AddressInput } from '@/services/shopify/customer.service';
import { apiClient } from '@/services/api-client';

export interface UseAuthReturn {
  customer: Customer | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ success: boolean; requiresVerification?: boolean; message?: string }>;
  updateProfile: (data: { firstName?: string; lastName?: string; email?: string; phone?: string }) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (resetUrl: string, password: string) => Promise<boolean>;
  createAddress: (address: AddressInput) => Promise<boolean>;
  updateAddress: (addressId: string, address: AddressInput) => Promise<boolean>;
  deleteAddress: (addressId: string) => Promise<boolean>;
  refreshCustomer: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current customer on mount
  const refreshCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ customer: Customer }>('/api/auth/me');
      
      if (response.error) {
        // Check if it's a 401 (not authenticated) - apiClient returns error for 401
        setCustomer(null);
        return;
      }

      if (response.data?.customer) {
        setCustomer(response.data.customer);
      } else {
        setCustomer(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch customer data';
      setError(errorMessage);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCustomer();
  }, [refreshCustomer]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ customer?: Customer; requiresVerification?: boolean }>(
        '/api/auth/login',
        { email, password }
      );

      if (response.error) {
        // Check if it's a verification error (403 status)
        // Note: apiClient returns error for non-2xx status codes
        // We need to check the response details for status code
        setError(response.error || 'Login failed');
        return false;
      }

      // Refresh customer data
      await refreshCustomer();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshCustomer]);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post('/api/auth/logout');

      setCustomer(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ): Promise<{ success: boolean; requiresVerification?: boolean; message?: string }> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ requiresVerification?: boolean; message?: string }>(
        '/api/auth/register',
        { email, password, firstName, lastName, phone }
      );

      if (response.error) {
        setError(response.error || 'Registration failed');
        return { success: false };
      }

      // Check if email verification is required
      if (response.data?.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          message: response.data.message || 'Please check your email to verify your account.',
        };
      }

      // Account created and logged in successfully
      await refreshCustomer();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [refreshCustomer]);

  const updateProfile = useCallback(async (
    data: { firstName?: string; lastName?: string; email?: string; phone?: string }
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.request<{ customer?: Customer }>('/api/auth/profile', {
        method: 'PUT',
        body: data,
      });

      if (response.error) {
        setError(response.error || 'Failed to update profile');
        return false;
      }

      // Refresh customer data
      await refreshCustomer();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshCustomer]);

  const requestPasswordReset = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });

      if (response.error) {
        setError(response.error || 'Failed to send password reset email');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send password reset email';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (resetUrl: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/auth/reset-password', { resetUrl, password });

      if (response.error) {
        setError(response.error || 'Failed to reset password');
        return false;
      }

      // Refresh customer data (user is now logged in)
      await refreshCustomer();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshCustomer]);

  const createAddress = useCallback(async (address: AddressInput): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/api/account/addresses', address);

      if (response.error) {
        setError(response.error || 'Failed to create address');
        return false;
      }

      // Refresh customer data
      await refreshCustomer();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create address';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshCustomer]);

  const updateAddress = useCallback(async (addressId: string, address: AddressInput): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.request('/api/account/addresses', {
        method: 'PUT',
        body: { addressId, ...address },
      });

      if (response.error) {
        setError(response.error || 'Failed to update address');
        return false;
      }

      // Refresh customer data
      await refreshCustomer();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update address';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshCustomer]);

  const deleteAddress = useCallback(async (addressId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.request(`/api/account/addresses?id=${addressId}`, {
        method: 'DELETE',
      });

      if (response.error) {
        setError(response.error || 'Failed to delete address');
        return false;
      }

      // Refresh customer data
      await refreshCustomer();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete address';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshCustomer]);

  return {
    customer,
    isAuthenticated: !!customer,
    loading,
    error,
    login,
    logout,
    register,
    updateProfile,
    requestPasswordReset,
    resetPassword,
    createAddress,
    updateAddress,
    deleteAddress,
    refreshCustomer,
  };
}

