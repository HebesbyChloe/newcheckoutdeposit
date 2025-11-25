'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Plus, X } from 'lucide-react';
import AddressForm from '@/components/account/AddressForm';
import AddressCard from '@/components/account/AddressCard';
import { CustomerAddress, AddressInput } from '@/services/shopify/customer.service';
import { apiClient } from '@/services/api-client';
import { CardSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton';

export default function AddressesPage() {
  const customer = useAuthStore((state) => state.customer);
  const loading = useAuthStore((state) => state.loading);
  const refreshCustomer = useAuthStore((state) => state.refreshCustomer);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const addresses = customer.addresses;
  const defaultAddress = customer.defaultAddress;

  const handleCreateAddress = async (addressData: AddressInput) => {
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post('/api/account/addresses', addressData);

      if (response.error) {
        setError(response.error || 'Failed to create address');
        return;
      }

      setSuccess('Address created successfully!');
      setShowForm(false);
      await refreshCustomer();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateAddress = async (addressData: AddressInput) => {
    if (!editingAddress) return;

    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.request('/api/account/addresses', {
        method: 'PUT',
        body: {
          addressId: editingAddress.id,
          ...addressData,
        },
      });

      if (response.error) {
        setError(response.error || 'Failed to update address');
        return;
      }

      setSuccess('Address updated successfully!');
      setShowForm(false);
      setEditingAddress(null);
      await refreshCustomer();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    setDeletingId(addressId);
    setError(null);

    try {
      const response = await apiClient.request(`/api/account/addresses?id=${addressId}`, {
        method: 'DELETE',
      });

      if (response.error) {
        setError(response.error || 'Failed to delete address');
        return;
      }

      setSuccess('Address deleted successfully!');
      await refreshCustomer();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (address: CustomerAddress) => {
    setEditingAddress(address);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAddress(null);
    setError(null);
    setSuccess(null);
  };

  const handleAddClick = () => {
    setEditingAddress(null);
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1d2939]">Shipping Addresses</h1>
          <p className="text-[#667085] mt-2">
            Manage your shipping and billing addresses
          </p>
        </div>
        {!showForm && (
          <Button 
            onClick={handleAddClick}
            className="bg-[#2c5f6f] hover:bg-[#234a56] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Address Form Modal */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelForm}
                disabled={formLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <AddressForm
              address={editingAddress}
              onSubmit={editingAddress ? handleUpdateAddress : handleCreateAddress}
              onCancel={handleCancelForm}
              loading={formLoading}
            />
          </CardContent>
        </Card>
      )}

      {/* Default Address */}
      {!showForm && defaultAddress && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Default Address</CardTitle>
              <span className="text-xs px-2 py-1 bg-[#2c5f6f]/10 text-[#2c5f6f] rounded">
                Default
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-[#1d2939] font-medium">
                {defaultAddress.firstName} {defaultAddress.lastName}
              </p>
              <p className="text-[#667085] text-sm">
                {defaultAddress.address1}
                {defaultAddress.address2 && <>, {defaultAddress.address2}</>}
              </p>
              <p className="text-[#667085] text-sm">
                {defaultAddress.city}, {defaultAddress.province} {defaultAddress.zip}
              </p>
              <p className="text-[#667085] text-sm">{defaultAddress.country}</p>
              {defaultAddress.phone && (
                <p className="text-[#667085] text-sm mt-2">Phone: {defaultAddress.phone}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditClick(defaultAddress)}
                className="flex-1"
              >
                Edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Addresses */}
      {!showForm && addresses.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-[#1d2939] mb-4">
            Saved Addresses ({addresses.filter((a: CustomerAddress) => defaultAddress?.id !== a.id).length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address: CustomerAddress) => {
              const isDefault = defaultAddress?.id === address.id;
              if (isDefault) return null; // Already shown above

              return (
                <AddressCard
                  key={address.id}
                  address={address}
                  isDefault={false}
                  onEdit={() => handleEditClick(address)}
                  onDelete={() => handleDeleteAddress(address.id)}
                  deleting={deletingId === address.id}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showForm && addresses.length === 0 && !defaultAddress && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-[#1d2939] mb-2">No addresses saved</h3>
            <p className="text-[#667085] text-center mb-6 max-w-md">
              Add a shipping address to make checkout faster
            </p>
            <Button 
              onClick={handleAddClick}
              className="bg-[#2c5f6f] hover:bg-[#234a56] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
