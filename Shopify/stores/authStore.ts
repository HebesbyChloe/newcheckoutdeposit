'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Customer, AddressInput } from '@/services/shopify/customer.service';
import { apiClient } from '@/services/api-client';

interface AuthState {
  customer: Customer | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    phone?: string
  ) => Promise<{ success: boolean; requiresVerification?: boolean; message?: string }>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resetPassword: (resetUrl: string, password: string) => Promise<boolean>;
  createAddress: (address: AddressInput) => Promise<boolean>;
  updateAddress: (addressId: string, address: AddressInput) => Promise<boolean>;
  deleteAddress: (addressId: string) => Promise<boolean>;
  refreshCustomer: () => Promise<void>;
  initialize: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      customer: null,
      loading: true,
      error: null,
      isAuthenticated: false,
      initialized: false,

      setError: (error: string | null) => {
        set({ error });
      },

      refreshCustomer: async () => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.get<{ customer: Customer }>('/api/auth/me');

          if (response.error) {
            // Not authenticated (401) or other error
            set({ customer: null, isAuthenticated: false, loading: false });
            return;
          }

          if (response.data?.customer) {
            set({
              customer: response.data.customer,
              isAuthenticated: true,
              loading: false,
            });
          } else {
            set({ customer: null, isAuthenticated: false, loading: false });
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to fetch customer data';
          set({
            error: errorMessage,
            customer: null,
            isAuthenticated: false,
            loading: false,
          });
        }
      },

      initialize: async () => {
        if (get().initialized) {
          return;
        }

        const persistedCustomer = get().customer;
        const persistedAuth = get().isAuthenticated;
        
        if (persistedCustomer && persistedAuth) {
          set({ loading: false }); 
        }

        setTimeout(async () => {
          await get().refreshCustomer();
        }, 0);

        set({ initialized: true });
      },

      login: async (email: string, password: string): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.post<{
            customer?: Customer;
            requiresVerification?: boolean;
          }>('/api/auth/login', { email, password });

          if (response.error) {
            set({ error: response.error || 'Login failed', loading: false });
            return false;
          }

          // Refresh customer data
          await get().refreshCustomer();
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Login failed';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      logout: async () => {
        set({ loading: true, error: null });

        try {
          await apiClient.post('/api/auth/logout');
          set({ customer: null, isAuthenticated: false, loading: false });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Logout failed';
          set({ error: errorMessage, loading: false });
        }
      },

      register: async (
        email: string,
        password: string,
        firstName?: string,
        lastName?: string,
        phone?: string
      ): Promise<{ success: boolean; requiresVerification?: boolean; message?: string }> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.post<{
            requiresVerification?: boolean;
            message?: string;
          }>('/api/auth/register', { email, password, firstName, lastName, phone });

          if (response.error) {
            set({ error: response.error || 'Registration failed', loading: false });
            return { success: false };
          }

          // Check if email verification is required
          if (response.data?.requiresVerification) {
            set({ loading: false });
            return {
              success: true,
              requiresVerification: true,
              message:
                response.data.message ||
                'Please check your email to verify your account.',
            };
          }

          // Account created and logged in successfully
          await get().refreshCustomer();
          return { success: true };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Registration failed';
          set({ error: errorMessage, loading: false });
          return { success: false };
        }
      },

      updateProfile: async (data: {
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
      }): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.request<{ customer?: Customer }>(
            '/api/auth/profile',
            {
              method: 'PUT',
              body: data,
            }
          );

          if (response.error) {
            set({ error: response.error || 'Failed to update profile', loading: false });
            return false;
          }

          // Refresh customer data
          await get().refreshCustomer();
          return true;
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to update profile';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      requestPasswordReset: async (email: string): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.post('/api/auth/forgot-password', { email });

          if (response.error) {
            set({
              error: response.error || 'Failed to send password reset email',
              loading: false,
            });
            return false;
          }

          set({ loading: false });
          return true;
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to send password reset email';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      resetPassword: async (resetUrl: string, password: string): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.post('/api/auth/reset-password', {
            resetUrl,
            password,
          });

          if (response.error) {
            set({ error: response.error || 'Failed to reset password', loading: false });
            return false;
          }

          // Refresh customer data (user is now logged in)
          await get().refreshCustomer();
          return true;
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to reset password';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      createAddress: async (address: AddressInput): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.post('/api/account/addresses', address);

          if (response.error) {
            set({ error: response.error || 'Failed to create address', loading: false });
            return false;
          }

          // Refresh customer data
          await get().refreshCustomer();
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to create address';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      updateAddress: async (addressId: string, address: AddressInput): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.request('/api/account/addresses', {
            method: 'PUT',
            body: { addressId, ...address },
          });

          if (response.error) {
            set({ error: response.error || 'Failed to update address', loading: false });
            return false;
          }

          // Refresh customer data
          await get().refreshCustomer();
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to update address';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },

      deleteAddress: async (addressId: string): Promise<boolean> => {
        set({ loading: true, error: null });

        try {
          const response = await apiClient.request(`/api/account/addresses?id=${addressId}`, {
            method: 'DELETE',
          });

          if (response.error) {
            set({ error: response.error || 'Failed to delete address', loading: false });
            return false;
          }

          // Refresh customer data
          await get().refreshCustomer();
          return true;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to delete address';
          set({ error: errorMessage, loading: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        customer: state.customer,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

