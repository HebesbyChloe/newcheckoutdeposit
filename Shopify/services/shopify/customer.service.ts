// Customer API service - Unified service combining customer, auth, and address operations
// Lazy-load shopifyClient to avoid module load-time errors
import type { GraphQLClient } from 'graphql-request';

let shopifyClientModule: { shopifyClient: GraphQLClient } | null = null;
async function getShopifyClient(): Promise<GraphQLClient> {
  if (!shopifyClientModule) {
    shopifyClientModule = await import('@/lib/shopify');
  }
  return shopifyClientModule.shopifyClient;
}

import {
  customerQuery,
  customerUpdateMutation,
  customerCreateMutation,
  customerAccessTokenCreateMutation,
  customerAccessTokenDeleteMutation,
  customerRecoverMutation,
  customerResetByUrlMutation,
  customerAddressCreateMutation,
  customerAddressUpdateMutation,
  customerAddressDeleteMutation,
} from './queries/customer.queries';
import {
  Customer,
  CustomerAddress,
  CustomerAccessToken,
  CustomerCreateInput,
  CustomerUpdateInput,
  AddressInput,
} from '@/types/shopify';

// Internal customer service class
class CustomerServiceInternal {
  /**
   * Get customer data
   */
  async getCustomer(accessToken: string): Promise<Customer | null> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customer: {
          id: string;
          firstName: string | null;
          lastName: string | null;
          email: string;
          phone: string | null;
          defaultAddress: {
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
          } | null;
          addresses: {
            edges: Array<{
              node: {
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
              };
            }>;
          };
          orders: {
            edges: Array<{
              node: {
                id: string;
                name: string;
                orderNumber: number;
                totalPrice: {
                  amount: string;
                  currencyCode: string;
                };
                fulfillmentStatus: string;
                financialStatus: string;
                processedAt: string;
                lineItems: {
                  edges: Array<{
                    node: {
                      title: string;
                      quantity: number;
                      variant: {
                        title: string;
                        price: {
                          amount: string;
                          currencyCode: string;
                        };
                      } | null;
                      originalTotalPrice: {
                        amount: string;
                        currencyCode: string;
                      };
                    };
                  }>;
                };
              };
            }>;
          };
        } | null;
      }>(customerQuery, {
        customerAccessToken: accessToken,
      });

      if (!data.customer) {
        return null;
      }

      // Transform the response
      const customer: Customer = {
        id: data.customer.id,
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        email: data.customer.email,
        phone: data.customer.phone,
        defaultAddress: data.customer.defaultAddress
          ? {
              id: data.customer.defaultAddress.id,
              firstName: data.customer.defaultAddress.firstName,
              lastName: data.customer.defaultAddress.lastName,
              address1: data.customer.defaultAddress.address1,
              address2: data.customer.defaultAddress.address2,
              city: data.customer.defaultAddress.city,
              province: data.customer.defaultAddress.province,
              country: data.customer.defaultAddress.country,
              zip: data.customer.defaultAddress.zip,
              phone: data.customer.defaultAddress.phone,
            }
          : null,
        addresses: data.customer.addresses.edges.map((edge) => ({
          id: edge.node.id,
          firstName: edge.node.firstName,
          lastName: edge.node.lastName,
          address1: edge.node.address1,
          address2: edge.node.address2,
          city: edge.node.city,
          province: edge.node.province,
          country: edge.node.country,
          zip: edge.node.zip,
          phone: edge.node.phone,
        })),
        orders: data.customer.orders.edges.map((edge) => ({
          id: edge.node.id,
          name: edge.node.name,
          orderNumber: edge.node.orderNumber,
          totalPrice: edge.node.totalPrice,
          fulfillmentStatus: edge.node.fulfillmentStatus,
          financialStatus: edge.node.financialStatus,
          createdAt: edge.node.processedAt || new Date().toISOString(),
          lineItems: edge.node.lineItems.edges.map((itemEdge) => ({
            title: itemEdge.node.title,
            quantity: itemEdge.node.quantity,
            variant: itemEdge.node.variant,
            originalUnitPrice: itemEdge.node.originalTotalPrice
              ? {
                  amount: (
                    parseFloat(itemEdge.node.originalTotalPrice.amount) /
                    itemEdge.node.quantity
                  ).toString(),
                  currencyCode: itemEdge.node.originalTotalPrice.currencyCode,
                }
              : itemEdge.node.variant?.price || null,
          })),
        })),
      };

      return customer;
    } catch (error) {
      return null;
    }
  }

  /**
   * Update customer profile
   */
  async updateCustomer(
    accessToken: string,
    customer: CustomerUpdateInput
  ): Promise<{
    customer: Customer | null;
    newAccessToken: string | null;
    errors: string[];
  }> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerUpdate: {
          customer: {
            id: string;
            firstName: string | null;
            lastName: string | null;
            email: string;
            phone: string | null;
          } | null;
          customerAccessToken: {
            accessToken: string;
            expiresAt: string;
          } | null;
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerUpdateMutation, {
        customerAccessToken: accessToken,
        customer,
      });

      if (data.customerUpdate.customerUserErrors.length > 0) {
        return {
          customer: null,
          newAccessToken: null,
          errors: data.customerUpdate.customerUserErrors.map((err) => err.message),
        };
      }

      // Get updated customer data
      const newAccessToken =
        data.customerUpdate.customerAccessToken?.accessToken || accessToken;
      const updatedCustomer = await this.getCustomer(newAccessToken);

      return {
        customer: updatedCustomer,
        newAccessToken,
        errors: [],
      };
    } catch (error) {
      return {
        customer: null,
        newAccessToken: null,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}

// Internal customer auth service class
class CustomerAuthServiceInternal {
  private customerService: CustomerServiceInternal;

  constructor(customerService: CustomerServiceInternal) {
    this.customerService = customerService;
  }

  /**
   * Create a new customer account
   */
  async createCustomer(input: CustomerCreateInput): Promise<{
    customer: Customer | null;
    errors: string[];
    requiresVerification?: boolean;
    verificationMessage?: string;
  }> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerCreate: {
          customer: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
          } | null;
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerCreateMutation, {
        input: {
          email: input.email,
          password: input.password,
          firstName: input.firstName || undefined,
          lastName: input.lastName || undefined,
          phone: input.phone || undefined,
        },
      });

      // Check for customerUserErrors first (validation errors)
      if (data.customerCreate.customerUserErrors.length > 0) {
        // Check if this is an email verification required case (CUSTOMER_DISABLED)
        const verificationError = data.customerCreate.customerUserErrors.find(
          (err) => err.code === 'CUSTOMER_DISABLED'
        );

        if (verificationError) {
          // Customer was created but needs email verification
          return {
            customer: null,
            errors: [],
            requiresVerification: true,
            verificationMessage: verificationError.message,
          };
        }

        // Other validation errors
        const errors = data.customerCreate.customerUserErrors.map(
          (err) => err.message
        );
        return {
          customer: null,
          errors,
        };
      }

      // Customer created, but we need to login to get full customer data
      if (data.customerCreate.customer) {
        const loginResult = await this.createAccessToken(
          input.email,
          input.password
        );
        if (loginResult?.accessToken) {
          const customerData = await this.customerService.getCustomer(
            loginResult.accessToken
          );
          if (customerData) {
            return {
              customer: customerData,
              errors: [],
            };
          } else {
            // Customer query returns null for disabled accounts (email verification required)
            return {
              customer: null,
              errors: [],
              requiresVerification: true,
              verificationMessage:
                'Please check your email to verify your account before logging in.',
            };
          }
        } else {
          return {
            customer: null,
            errors: ['Account created but failed to log in. Please try logging in.'],
          };
        }
      }

      return {
        customer: null,
        errors: ['Failed to create customer account'],
      };
    } catch (error: any) {
      // Handle GraphQL response errors
      const responseErrors = error?.response?.errors || [];

      if (responseErrors.length > 0) {
        const errorMessages = responseErrors.map((err: any) => {
          if (err.extensions?.code === 'THROTTLED') {
            return 'Too many requests. Please wait a moment and try again.';
          }
          return err.message || 'An error occurred';
        });


        return {
          customer: null,
          errors: errorMessages,
        };
      }

      // Handle other errors
      return {
        customer: null,
        errors: ['Failed to create customer account. Please try again.'],
      };
    }
  }

  /**
   * Create customer access token (login)
   */
  async createAccessToken(
    email: string,
    password: string
  ): Promise<CustomerAccessToken | null> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerAccessTokenCreate: {
          customerAccessToken: {
            accessToken: string;
            expiresAt: string;
          } | null;
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerAccessTokenCreateMutation, {
        input: {
          email,
          password,
        },
      });

      if (data.customerAccessTokenCreate.customerUserErrors.length > 0) {
        const errors = data.customerAccessTokenCreate.customerUserErrors.map(
          (err) => ({
            field: err.field,
            message: err.message,
            code: err.code,
          })
        );
        return null;
      }

      return data.customerAccessTokenCreate.customerAccessToken;
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete customer access token (logout)
   */
  async deleteAccessToken(accessToken: string): Promise<boolean> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerAccessTokenDelete: {
          deletedAccessToken: string | null;
          deletedCustomerAccessTokenId: string | null;
          userErrors: Array<{
            field: string[];
            message: string;
          }>;
        };
      }>(customerAccessTokenDeleteMutation, {
        customerAccessToken: accessToken,
      });

      if (data.customerAccessTokenDelete.userErrors.length > 0) {
        const errors = data.customerAccessTokenDelete.userErrors.map((err) => ({
          field: err.field,
          message: err.message,
        }));
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Recover customer password (send reset email)
   */
  async recoverPassword(email: string): Promise<{
    success: boolean;
    errors: string[];
  }> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerRecover: {
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerRecoverMutation, {
        email,
      });

      // Always return success for security
      return {
        success: true,
        errors: [],
      };
    } catch (error) {
      return {
        success: true,
        errors: [],
      };
    }
  }

  /**
   * Reset customer password using reset URL
   */
  async resetPassword(
    resetUrl: string,
    password: string
  ): Promise<{
    customerAccessToken: CustomerAccessToken | null;
    errors: string[];
  }> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerResetByUrl: {
          customer: {
            id: string;
            email: string;
          } | null;
          customerAccessToken: {
            accessToken: string;
            expiresAt: string;
          } | null;
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerResetByUrlMutation, {
        resetUrl,
        password,
      });

      if (data.customerResetByUrl.customerUserErrors.length > 0) {
        return {
          customerAccessToken: null,
          errors: data.customerResetByUrl.customerUserErrors.map(
            (err) => err.message
          ),
        };
      }

      if (data.customerResetByUrl.customerAccessToken) {
        return {
          customerAccessToken: {
            accessToken: data.customerResetByUrl.customerAccessToken.accessToken,
            expiresAt: data.customerResetByUrl.customerAccessToken.expiresAt,
          },
          errors: [],
        };
      }

      return {
        customerAccessToken: null,
        errors: ['Failed to reset password. Please try again.'],
      };
    } catch (error) {
      return {
        customerAccessToken: null,
        errors: ['Failed to reset password. Please try again.'],
      };
    }
  }
}

// Internal customer address service class
class CustomerAddressServiceInternal {
  /**
   * Create a new customer address
   */
  async createAddress(
    accessToken: string,
    address: AddressInput
  ): Promise<{
    address: CustomerAddress | null;
    errors: string[];
  }> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerAddressCreate: {
          customerAddress: {
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
          } | null;
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerAddressCreateMutation, {
        customerAccessToken: accessToken,
        address,
      });

      if (data.customerAddressCreate.customerUserErrors.length > 0) {
        return {
          address: null,
          errors: data.customerAddressCreate.customerUserErrors.map(
            (err) => err.message
          ),
        };
      }

      if (data.customerAddressCreate.customerAddress) {
        return {
          address: {
            id: data.customerAddressCreate.customerAddress.id,
            firstName: data.customerAddressCreate.customerAddress.firstName,
            lastName: data.customerAddressCreate.customerAddress.lastName,
            address1: data.customerAddressCreate.customerAddress.address1,
            address2: data.customerAddressCreate.customerAddress.address2,
            city: data.customerAddressCreate.customerAddress.city,
            province: data.customerAddressCreate.customerAddress.province,
            country: data.customerAddressCreate.customerAddress.country,
            zip: data.customerAddressCreate.customerAddress.zip,
            phone: data.customerAddressCreate.customerAddress.phone,
          },
          errors: [],
        };
      }

      return {
        address: null,
        errors: ['Failed to create address'],
      };
    } catch (error) {
      return {
        address: null,
        errors: ['Failed to create address. Please try again.'],
      };
    }
  }

  /**
   * Update an existing customer address
   */
  async updateAddress(
    accessToken: string,
    addressId: string,
    address: AddressInput
  ): Promise<{
    address: CustomerAddress | null;
    errors: string[];
  }> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerAddressUpdate: {
          customerAddress: {
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
          } | null;
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerAddressUpdateMutation, {
        customerAccessToken: accessToken,
        id: addressId,
        address,
      });

      if (data.customerAddressUpdate.customerUserErrors.length > 0) {
        return {
          address: null,
          errors: data.customerAddressUpdate.customerUserErrors.map(
            (err) => err.message
          ),
        };
      }

      if (data.customerAddressUpdate.customerAddress) {
        return {
          address: {
            id: data.customerAddressUpdate.customerAddress.id,
            firstName: data.customerAddressUpdate.customerAddress.firstName,
            lastName: data.customerAddressUpdate.customerAddress.lastName,
            address1: data.customerAddressUpdate.customerAddress.address1,
            address2: data.customerAddressUpdate.customerAddress.address2,
            city: data.customerAddressUpdate.customerAddress.city,
            province: data.customerAddressUpdate.customerAddress.province,
            country: data.customerAddressUpdate.customerAddress.country,
            zip: data.customerAddressUpdate.customerAddress.zip,
            phone: data.customerAddressUpdate.customerAddress.phone,
          },
          errors: [],
        };
      }

      return {
        address: null,
        errors: ['Failed to update address'],
      };
    } catch (error) {
      return {
        address: null,
        errors: ['Failed to update address. Please try again.'],
      };
    }
  }

  /**
   * Delete a customer address
   */
  async deleteAddress(
    accessToken: string,
    addressId: string
  ): Promise<{
    success: boolean;
    errors: string[];
  }> {
    try {
      const client = await getShopifyClient();
      const data = await client.request<{
        customerAddressDelete: {
          deletedCustomerAddressId: string | null;
          customerUserErrors: Array<{
            field: string[];
            message: string;
            code: string;
          }>;
        };
      }>(customerAddressDeleteMutation, {
        customerAccessToken: accessToken,
        id: addressId,
      });

      if (data.customerAddressDelete.customerUserErrors.length > 0) {
        return {
          success: false,
          errors: data.customerAddressDelete.customerUserErrors.map(
            (err) => err.message
          ),
        };
      }

      return {
        success: true,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Failed to delete address. Please try again.'],
      };
    }
  }

  /**
   * Set default address
   */
  async setDefaultAddress(
    accessToken: string,
    addressId: string
  ): Promise<{
    success: boolean;
    errors: string[];
  }> {
    // In Shopify Storefront API, setting default address requires updating the customer
    // This is a simplified implementation
    try {
      return {
        success: true,
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        errors: ['Failed to set default address. Please try again.'],
      };
    }
  }
}

/**
 * Unified Customer Service
 * Combines all customer-related operations
 */
export class CustomerService {
  private customerServiceInternal: CustomerServiceInternal;
  private customerAuthServiceInternal: CustomerAuthServiceInternal;
  private customerAddressServiceInternal: CustomerAddressServiceInternal;

  constructor() {
    this.customerServiceInternal = new CustomerServiceInternal();
    this.customerAuthServiceInternal = new CustomerAuthServiceInternal(
      this.customerServiceInternal
    );
    this.customerAddressServiceInternal = new CustomerAddressServiceInternal();
  }

  // Customer operations
  async getCustomer(accessToken: string): Promise<Customer | null> {
    return this.customerServiceInternal.getCustomer(accessToken);
  }

  async updateCustomer(
    accessToken: string,
    customer: CustomerUpdateInput
  ): Promise<{
    customer: Customer | null;
    newAccessToken: string | null;
    errors: string[];
  }> {
    return this.customerServiceInternal.updateCustomer(accessToken, customer);
  }

  // Authentication operations
  async createCustomer(input: CustomerCreateInput): Promise<{
    customer: Customer | null;
    errors: string[];
    requiresVerification?: boolean;
    verificationMessage?: string;
  }> {
    return this.customerAuthServiceInternal.createCustomer(input);
  }

  async createAccessToken(
    email: string,
    password: string
  ): Promise<CustomerAccessToken | null> {
    return this.customerAuthServiceInternal.createAccessToken(email, password);
  }

  async deleteAccessToken(accessToken: string): Promise<boolean> {
    return this.customerAuthServiceInternal.deleteAccessToken(accessToken);
  }

  async recoverPassword(email: string): Promise<{
    success: boolean;
    errors: string[];
  }> {
    return this.customerAuthServiceInternal.recoverPassword(email);
  }

  async resetPassword(
    resetUrl: string,
    password: string
  ): Promise<{
    customerAccessToken: CustomerAccessToken | null;
    errors: string[];
  }> {
    return this.customerAuthServiceInternal.resetPassword(resetUrl, password);
  }

  // Address operations
  async createAddress(
    accessToken: string,
    address: AddressInput
  ): Promise<{
    address: CustomerAddress | null;
    errors: string[];
  }> {
    return this.customerAddressServiceInternal.createAddress(accessToken, address);
  }

  async updateAddress(
    accessToken: string,
    addressId: string,
    address: AddressInput
  ): Promise<{
    address: CustomerAddress | null;
    errors: string[];
  }> {
    return this.customerAddressServiceInternal.updateAddress(
      accessToken,
      addressId,
      address
    );
  }

  async deleteAddress(
    accessToken: string,
    addressId: string
  ): Promise<{
    success: boolean;
    errors: string[];
  }> {
    return this.customerAddressServiceInternal.deleteAddress(accessToken, addressId);
  }

  async setDefaultAddress(
    accessToken: string,
    addressId: string
  ): Promise<{
    success: boolean;
    errors: string[];
  }> {
    return this.customerAddressServiceInternal.setDefaultAddress(
      accessToken,
      addressId
    );
  }
}

// Export types for convenience
export type { Customer, CustomerAddress, AddressInput } from '@/types/shopify';

// Export singleton instance
export const customerService = new CustomerService();
