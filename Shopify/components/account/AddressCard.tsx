'use client';

import { CustomerAddress } from '@/services/shopify/customer.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AddressCardProps {
  address: CustomerAddress;
  isDefault?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}

export default function AddressCard({ 
  address, 
  isDefault = false, 
  onEdit, 
  onDelete,
  deleting = false 
}: AddressCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {address.firstName} {address.lastName}
          </CardTitle>
          {isDefault && (
            <Badge variant="secondary" className="bg-[#2c5f6f]/10 text-[#2c5f6f]">
              Default
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <p className="text-[#667085] text-sm">
            {address.address1}
            {address.address2 && <>, {address.address2}</>}
          </p>
          <p className="text-[#667085] text-sm">
            {address.city}, {address.province} {address.zip}
          </p>
          <p className="text-[#667085] text-sm">{address.country}</p>
          {address.phone && (
            <p className="text-[#667085] text-sm mt-2">Phone: {address.phone}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            disabled={deleting}
            className="flex-1"
          >
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            disabled={deleting}
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

