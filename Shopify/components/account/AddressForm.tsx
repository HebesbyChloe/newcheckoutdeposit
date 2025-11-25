'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerAddress, AddressInput } from '@/services/shopify/customer.service';

interface AddressFormProps {
  address?: CustomerAddress | null;
  onSubmit: (address: AddressInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function AddressForm({ address, onSubmit, onCancel, loading }: AddressFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [country, setCountry] = useState('United States');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      setFirstName(address.firstName || '');
      setLastName(address.lastName || '');
      setAddress1(address.address1 || '');
      setAddress2(address.address2 || '');
      setCity(address.city || '');
      setProvince(address.province || '');
      setCountry(address.country || 'United States');
      setZip(address.zip || '');
      setPhone(address.phone || '');
    }
  }, [address]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address1 || !city || !country || !zip) {
      setError('Please fill in all required fields (Address, City, Country, ZIP)');
      return;
    }

    const addressData: AddressInput = {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      address1,
      address2: address2 || undefined,
      city,
      province: province || undefined,
      country,
      zip,
      phone: phone || undefined,
    };

    await onSubmit(addressData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
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
          />
        </div>
      </div>

      <div>
        <label htmlFor="address1" className="block text-sm font-medium text-[#1d2939] mb-2">
          Address Line 1 <span className="text-red-500">*</span>
        </label>
        <Input
          id="address1"
          type="text"
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="address2" className="block text-sm font-medium text-[#1d2939] mb-2">
          Address Line 2
        </label>
        <Input
          id="address2"
          type="text"
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-[#1d2939] mb-2">
            City <span className="text-red-500">*</span>
          </label>
          <Input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="province" className="block text-sm font-medium text-[#1d2939] mb-2">
            State/Province
          </label>
          <Input
            id="province"
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-[#1d2939] mb-2">
            Country <span className="text-red-500">*</span>
          </label>
          <Input
            id="country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="zip" className="block text-sm font-medium text-[#1d2939] mb-2">
            ZIP/Postal Code <span className="text-red-500">*</span>
          </label>
          <Input
            id="zip"
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            required
            disabled={loading}
          />
        </div>
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
          disabled={loading}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#2c5f6f] hover:bg-[#234a56] text-white"
        >
          {loading ? 'Saving...' : address ? 'Update Address' : 'Add Address'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

