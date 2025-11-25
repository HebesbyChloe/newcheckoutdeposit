// Shopify-specific TypeScript types

// Shop types
export interface Shop {
  id: string;
  name: string;
  description: string | null;
  email: string;
  currencyCode: string;
  paymentSettings: {
    acceptedCardBrands: string[];
    supportedDigitalWallets: string[];
    countryCode: string;
    currencyCode: string;
  };
  primaryDomain: {
    url: string;
    host: string;
  };
  plan: {
    displayName: string;
    partnerDevelopment: boolean;
    shopifyPlus: boolean;
  };
}

export interface MenuItem {
  id: string;
  title: string;
  url: string;
  type: string;
  items?: MenuItem[];
}

export interface Menu {
  id: string;
  handle: string;
  title: string;
  items: MenuItem[];
}

// Customer types
export interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  defaultAddress: CustomerAddress | null;
  addresses: CustomerAddress[];
  orders: CustomerOrder[];
}

export interface CustomerAddress {
  id: string;
  firstName: string | null;
  lastName: string | null;
  address1: string;
  address2: string | null;
  city: string;
  province: string | null;
  country: string;
  zip: string;
  phone: string | null;
}

export interface CustomerOrder {
  id: string;
  name: string;
  orderNumber: number;
  totalPrice: {
    amount: string;
    currencyCode: string;
  };
  fulfillmentStatus: string;
  financialStatus: string;
  createdAt: string; // Mapped from processedAt in API response
  lineItems: Array<{
    title: string;
    quantity: number;
    variant: {
      title: string;
      price: {
        amount: string;
        currencyCode: string;
      };
    } | null;
    originalUnitPrice: {
      amount: string;
      currencyCode: string;
    } | null; // Calculated from originalTotalPrice / quantity
  }>;
}

export interface CustomerAccessToken {
  accessToken: string;
  expiresAt: string;
}

export interface CustomerCreateInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface CustomerUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface AddressInput {
  firstName?: string;
  lastName?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

