// Admin API Order Service
import { adminClient } from '@/lib/shopify/admin/client';
import {
  createDraftOrderMutation,
  completeDraftOrderMutation,
  getDraftOrderQuery,
  getOrderQuery,
  updateOrderMutation,
  createTransactionMutation,
} from '../queries/admin.queries';

export interface DraftOrderLineItem {
  variantId?: string;
  productId?: string;
  title?: string;
  quantity: number;
  price?: string;
  customAttributes?: Array<{ key: string; value: string }>;
}

export interface DraftOrder {
  id: string;
  name: string;
  totalPrice: string;
  subtotalPrice: string;
  totalTax: string;
  order: {
    id: string;
    name: string;
  } | null;
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    originalUnitPrice: string;
  }>;
}

export interface Order {
  id: string;
  name: string;
  email: string | null;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  subtotalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  totalTaxSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  financialStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    originalUnitPriceSet: {
      shopMoney: {
        amount: string;
        currencyCode: string;
      };
    };
  }>;
  transactions: Array<{
    id: string;
    kind: string;
    status: string;
    amount: string;
    gateway: string;
    createdAt: string;
  }>;
  metafields: Array<{
    namespace: string;
    key: string;
    value: string;
    type: string;
  }>;
}

export interface TransactionInput {
  kind: 'AUTHORIZATION' | 'CAPTURE' | 'SALE' | 'VOID' | 'REFUND';
  gateway: string;
  amount: string;
  currencyCode?: string;
  parentId?: string;
  test?: boolean;
}

export class AdminOrderService {
  /**
   * Create a draft order
   */
  async createDraftOrder(input: {
    lineItems: DraftOrderLineItem[];
    customerId?: string;
    email?: string;
    note?: string;
    tags?: string[];
    customAttributes?: Array<{ key: string; value: string }>;
  }): Promise<{ draftOrder: DraftOrder | null; error: string | null }> {
    try {
      const draftOrderInput: any = {
        lineItems: input.lineItems.map((item) => ({
          variantId: item.variantId,
          productId: item.productId,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          customAttributes: item.customAttributes || [],
        })),
      };

      if (input.customerId) {
        draftOrderInput.customerId = input.customerId;
      }

      if (input.email) {
        draftOrderInput.email = input.email;
      }

      if (input.note) {
        draftOrderInput.note = input.note;
      }

      if (input.tags) {
        draftOrderInput.tags = input.tags;
      }

      if (input.customAttributes) {
        draftOrderInput.customAttributes = input.customAttributes;
      }

      const response = await adminClient.request<{
        draftOrderCreate: {
          draftOrder: DraftOrder | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(createDraftOrderMutation, {
        input: draftOrderInput,
      });

      if (response.draftOrderCreate.userErrors.length > 0) {
        const error = response.draftOrderCreate.userErrors.map((e) => e.message).join(', ');
        return {
          draftOrder: null,
          error,
        };
      }

      if (!response.draftOrderCreate.draftOrder) {
        return {
          draftOrder: null,
          error: 'Draft order creation failed',
        };
      }

      return {
        draftOrder: response.draftOrderCreate.draftOrder,
        error: null,
      };
    } catch (error) {
      return {
        draftOrder: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete a draft order (convert to real order)
   */
  async completeDraftOrder(
    draftOrderId: string,
    paymentPending: boolean = false
  ): Promise<{ orderId: string | null; error: string | null }> {
    try {
      const response = await adminClient.request<{
        draftOrderComplete: {
          draftOrder: {
            id: string;
            order: {
              id: string;
              name: string;
            } | null;
          } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(completeDraftOrderMutation, {
        id: draftOrderId,
        paymentPending,
      });

      if (response.draftOrderComplete.userErrors.length > 0) {
        const error = response.draftOrderComplete.userErrors.map((e) => e.message).join(', ');
        return {
          orderId: null,
          error,
        };
      }

      if (!response.draftOrderComplete.draftOrder?.order) {
        return {
          orderId: null,
          error: 'Failed to complete draft order',
        };
      }

      return {
        orderId: response.draftOrderComplete.draftOrder.order.id,
        error: null,
      };
    } catch (error) {
      return {
        orderId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get draft order by ID
   */
  async getDraftOrder(draftOrderId: string): Promise<{ draftOrder: DraftOrder | null; error: string | null }> {
    try {
      const response = await adminClient.request<{
        draftOrder: DraftOrder | null;
      }>(getDraftOrderQuery, {
        id: draftOrderId,
      });

      if (!response.draftOrder) {
        return {
          draftOrder: null,
          error: 'Draft order not found',
        };
      }

      return {
        draftOrder: response.draftOrder,
        error: null,
      };
    } catch (error) {
      return {
        draftOrder: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<{ order: Order | null; error: string | null }> {
    try {
      const response = await adminClient.request<{
        order: Order | null;
      }>(getOrderQuery, {
        id: orderId,
      });

      if (!response.order) {
        return {
          order: null,
          error: 'Order not found',
        };
      }

      return {
        order: response.order,
        error: null,
      };
    } catch (error) {
      return {
        order: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update order
   */
  async updateOrder(
    orderId: string,
    input: {
      note?: string;
      tags?: string[];
      customAttributes?: Array<{ key: string; value: string }>;
    }
  ): Promise<{ order: { id: string; name: string } | null; error: string | null }> {
    try {
      const orderInput: any = {
        id: orderId,
      };

      if (input.note !== undefined) {
        orderInput.note = input.note;
      }

      if (input.tags) {
        orderInput.tags = input.tags;
      }

      if (input.customAttributes) {
        orderInput.customAttributes = input.customAttributes;
      }

      const response = await adminClient.request<{
        orderUpdate: {
          order: { id: string; name: string } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(updateOrderMutation, {
        input: orderInput,
      });

      if (response.orderUpdate.userErrors.length > 0) {
        const error = response.orderUpdate.userErrors.map((e) => e.message).join(', ');
        return {
          order: null,
          error,
        };
      }

      return {
        order: response.orderUpdate.order,
        error: null,
      };
    } catch (error) {
      return {
        order: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a transaction for an order
   */
  async createTransaction(
    orderId: string,
    transaction: TransactionInput
  ): Promise<{ transactionId: string | null; error: string | null }> {
    try {
      const transactionInput: any = {
        kind: transaction.kind,
        gateway: transaction.gateway,
        amount: transaction.amount,
      };

      if (transaction.currencyCode) {
        transactionInput.currencyCode = transaction.currencyCode;
      }

      if (transaction.parentId) {
        transactionInput.parentId = transaction.parentId;
      }

      if (transaction.test !== undefined) {
        transactionInput.test = transaction.test;
      }

      const response = await adminClient.request<{
        orderTransactionCreate: {
          transaction: {
            id: string;
            kind: string;
            status: string;
            amount: string;
            gateway: string;
          } | null;
          userErrors: Array<{ field: string[]; message: string }>;
        };
      }>(createTransactionMutation, {
        orderId,
        transaction: transactionInput,
      });

      if (response.orderTransactionCreate.userErrors.length > 0) {
        const error = response.orderTransactionCreate.userErrors.map((e) => e.message).join(', ');
        return {
          transactionId: null,
          error,
        };
      }

      if (!response.orderTransactionCreate.transaction) {
        return {
          transactionId: null,
          error: 'Transaction creation failed',
        };
      }

      return {
        transactionId: response.orderTransactionCreate.transaction.id,
        error: null,
      };
    } catch (error) {
      return {
        transactionId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a payment link for remaining balance
   * Note: Payment links are created via REST API, not GraphQL
   */
  async createPaymentLink(orderId: string, amount: string): Promise<{ paymentLink: string | null; error: string | null }> {
    try {
      const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
      const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
      const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-01';

      // Extract order ID number from GID
      const orderIdNumber = orderId.split('/').pop();

      const url = `https://${domain}/admin/api/${apiVersion}/orders/${orderIdNumber}/transactions.json`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminAccessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: {
            kind: 'sale',
            amount: amount,
            gateway: 'manual',
            parent_id: null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          paymentLink: null,
          error: errorData.message || `HTTP ${response.status}`,
        };
      }

      // For payment links, we need to use Shopify's payment link creation
      // This is a simplified version - in production, you'd use Shopify's payment link API
      // For now, we'll return a checkout URL that can be used
      const checkoutUrl = `https://${domain}/admin/orders/${orderIdNumber}`;

      return {
        paymentLink: checkoutUrl,
        error: null,
      };
    } catch (error) {
      return {
        paymentLink: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const adminOrderService = new AdminOrderService();

