// Partial Payment Service
import { adminOrderService } from './admin/order.service';
import { metafieldService } from './admin/metafield.service';
import { cartService } from './cart.service';
import { adminProductService } from './admin/product.service';
import { DepositSession, DepositSessionCreateRequest } from '@/types/partial-payment.types';
import { depositSessionStorage, generateSessionId } from '@/lib/storage/deposit-sessions';
import { shopifyClient } from '@/lib/shopify';

export class PartialPaymentService {
  /**
   * Create a deposit session
   */
  async createDepositSession(
    request: DepositSessionCreateRequest
  ): Promise<{ session: DepositSession | null; error: string | null }> {
    try {
      const sessionId = generateSessionId();
      const remainingAmount = request.total_amount - request.deposit_amount;

      // Create draft order with all items
      const draftOrderResult = await adminOrderService.createDraftOrder({
        lineItems: request.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        customerId: request.customer_id,
        // Tags must be <= 40 chars each in Shopify. Use a short, safe tag.
        tags: ['partial-payment'],
        customAttributes: [
          {
            key: 'session_id',
            value: sessionId,
          },
        ],
      });

      if (draftOrderResult.error || !draftOrderResult.draftOrder) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('createDepositSession - draftOrderCreate failed', {
            request,
            draftOrderError: draftOrderResult.error,
          });
        }
        return {
          session: null,
          error: draftOrderResult.error || 'Failed to create draft order',
        };
      }

      const session: DepositSession = {
        session_id: sessionId,
        customer_id: request.customer_id,
        items: request.items,
        total_amount: request.total_amount,
        deposit_amount: request.deposit_amount,
        remaining_amount: remainingAmount,
        draft_order_id: draftOrderResult.draftOrder.id,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      // Store session
      depositSessionStorage.createSession(sessionId, session);

      return {
        session,
        error: null,
      };
    } catch (error) {
      return {
        session: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create deposit checkout using Storefront API
   */
  async createDepositCheckout(sessionId: string): Promise<{ checkoutUrl: string | null; error: string | null }> {
    try {
      const session = depositSessionStorage.getSession(sessionId) as DepositSession | null;

      if (!session) {
        return {
          checkoutUrl: null,
          error: 'Session not found or expired',
        };
      }

      // We charge the customer using a dedicated "Deposit" product, but for
      // each deposit session we create a unique variant. This avoids
      // race-conditions between multiple customers and lets us store
      // session-specific context on the variant.
      const depositProductId = process.env.SHOPIFY_DEPOSIT_PRODUCT_ID;

      if (!depositProductId) {
        return {
          checkoutUrl: null,
          error:
            'SHOPIFY_DEPOSIT_PRODUCT_ID is not configured. Please create a "Deposit" product in Shopify and set its product GID in the environment.',
        };
      }

      const priceStr = session.deposit_amount.toFixed(2);
      const shortId = session.session_id.slice(-8);

      // Create a one-off variant for this deposit session
      const { createVariantRest } = await import('./admin/product-rest.service');
      const { variant, error } = await createVariantRest(depositProductId, {
        price: priceStr,
        sku: `DEP-${shortId}`,
        option1: `DEP-${shortId}`,
      });

      if (!variant || error) {
        return {
          checkoutUrl: null,
          error: error || 'Failed to create deposit variant',
        };
      }

      // Ensure the deposit variant has at least 1 unit of inventory and is
      // published, so Shopify does not treat it as sold out during checkout.
      try {
        const { setVariantInventory } = await import('./admin/inventory.service');
        await Promise.all([
          setVariantInventory(variant.id, 1),
          adminProductService.publishProductToOnlineStore(depositProductId),
        ]);
      } catch (invError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to ensure inventory/publishing for deposit variant:', invError);
        }
        // Continue anyway; Shopify may still allow checkout if inventory is untracked.
      }

      // Attach a JSON summary of this deposit session to the deposit variant's
      // metafields so you can see the context (totals and line items) on the
      // deposit product in Shopify Admin.
      try {
        const summary = {
          session_id: session.session_id,
          total_amount: session.total_amount,
          deposit_amount: session.deposit_amount,
          remaining_amount: session.remaining_amount,
          items: session.items,
        };

        await metafieldService.setMetafield({
          // Use dedicated JSON metafield for deposit context
          namespace: 'custom',
          key: 'deposit',
          type: 'json',
          ownerId: variant.id,
          value: JSON.stringify(summary),
        });
      } catch (mfError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to set deposit metafield on deposit variant:', mfError);
        }
        // Non-fatal: checkout can proceed even if metafield write fails.
      }

      // Wait briefly until the new variant is visible/available in the
      // Storefront API; this helps avoid the "item no longer available" popup
      // immediately after redirect to Shopify checkout.
      try {
        const query = `
          query CheckDepositVariant($id: ID!) {
            node(id: $id) {
              __typename
              ... on ProductVariant {
                id
                availableForSale
                quantityAvailable
              }
            }
          }
        `;

        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            const data = await shopifyClient.request<{
              node: {
                __typename?: string;
                id?: string;
                availableForSale?: boolean | null;
                quantityAvailable?: number | null;
              } | null;
            }>(query, { id: variant.id });

            const node = data.node;
            const isAvailable =
              node &&
              node.__typename === 'ProductVariant' &&
              (node.availableForSale ?? false) &&
              (typeof node.quantityAvailable !== 'number' ||
                node.quantityAvailable > 0);

            if (isAvailable) {
              break;
            }

            if (attempt < 4) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn(
                  'Deposit variant not yet available in Storefront, retrying...',
                  { attempt, variantId: variant.id }
                );
              }
              await new Promise((resolve) => setTimeout(resolve, 1500));
            }
          } catch (checkError) {
            if (process.env.NODE_ENV !== 'production') {
              console.error(
                'Error checking deposit variant availability:',
                checkError
              );
            }
            // On API error, don't block checkout
            break;
          }
        }
      } catch (availabilityError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(
            'Unexpected error while waiting for deposit variant availability:',
            availabilityError
          );
        }
      }

      // Build a human-readable summary to show on the checkout line item.
      const itemLines = session.items.map((item, index) => {
        return `Item ${index + 1}: variant ${item.variantId} x${item.quantity}`;
      });

      const summaryLines = [
        'Deposit for:',
        ...itemLines,
        `Total order amount: ${session.total_amount.toFixed(2)}`,
        `Remaining balance: ${session.remaining_amount.toFixed(2)}`,
        `Pay today: ${session.deposit_amount.toFixed(2)}`,
      ];

      const summaryText = summaryLines.join('\n');

      // Create a cart with ONE line: the per-session deposit variant at the
      // correct price, including line attributes so the context is visible
      // directly in Shopify checkout and on the final order.
      const cartResult = await cartService.createCart({
        variantId: variant.id,
        quantity: 1,
        attributes: [
          { key: 'deposit_summary', value: summaryText },
          { key: 'deposit_session_id', value: session.session_id },
          {
            key: 'deposit_total',
            value: session.deposit_amount.toFixed(2),
          },
          {
            key: 'deposit_remaining',
            value: session.remaining_amount.toFixed(2),
          },
        ],
      });

      if (cartResult.error || !cartResult.checkoutUrl) {
        return {
          checkoutUrl: null,
          error: cartResult.error || 'Failed to create checkout',
        };
      }

      // Update session with checkout URL (for reference / future debugging)
      depositSessionStorage.updateSession(sessionId, {
        checkout_url: cartResult.checkoutUrl,
      });

      return {
        checkoutUrl: cartResult.checkoutUrl,
        error: null,
      };
    } catch (error) {
      return {
        checkoutUrl: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete deposit order (convert draft to order, create transaction)
   */
  async completeDepositOrder(sessionId: string): Promise<{ orderId: string | null; error: string | null }> {
    try {
      const session = depositSessionStorage.getSession(sessionId) as DepositSession | null;

      if (!session) {
        return {
          orderId: null,
          error: 'Session not found or expired',
        };
      }

      // Complete draft order
      const completeResult = await adminOrderService.completeDraftOrder(session.draft_order_id, false);

      if (completeResult.error || !completeResult.orderId) {
        return {
          orderId: null,
          error: completeResult.error || 'Failed to complete draft order',
        };
      }

      // Create deposit transaction
      const transactionResult = await adminOrderService.createTransaction(completeResult.orderId, {
        kind: 'CAPTURE',
        gateway: 'manual',
        amount: session.deposit_amount.toFixed(2),
      });

      if (transactionResult.error) {
        // Log error but continue - transaction might have been created by Shopify
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Failed to create deposit transaction:', transactionResult.error);
        }
      }

      // Update order metafields
      await metafieldService.setMetafields([
        {
          namespace: 'partial',
          key: 'deposit_amount',
          value: session.deposit_amount.toString(),
          type: 'number_decimal',
          ownerId: completeResult.orderId,
        },
        {
          namespace: 'partial',
          key: 'remaining_amount',
          value: session.remaining_amount.toFixed(2),
          type: 'number_decimal',
          ownerId: completeResult.orderId,
        },
        {
          namespace: 'partial',
          key: 'deposit_paid',
          value: 'true',
          type: 'boolean',
          ownerId: completeResult.orderId,
        },
        {
          namespace: 'partial',
          key: 'remaining_paid',
          value: 'false',
          type: 'boolean',
          ownerId: completeResult.orderId,
        },
        {
          namespace: 'partial',
          key: 'payment_status',
          value: 'partial_paid',
          type: 'single_line_text_field',
          ownerId: completeResult.orderId,
        },
        {
          namespace: 'partial',
          key: 'session_id',
          value: sessionId,
          type: 'single_line_text_field',
          ownerId: completeResult.orderId,
        },
      ]);

      // Create payment link for remaining amount
      const paymentLinkResult = await adminOrderService.createPaymentLink(
        completeResult.orderId,
        session.remaining_amount.toFixed(2)
      );

      if (!paymentLinkResult.error && paymentLinkResult.paymentLink) {
        await metafieldService.setMetafield({
          namespace: 'partial',
          key: 'payment_link',
          value: paymentLinkResult.paymentLink,
          type: 'url',
          ownerId: completeResult.orderId,
        });
      }

      return {
        orderId: completeResult.orderId,
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
   * Create remaining payment link
   */
  async createRemainingPaymentLink(orderId: string, remainingAmount: number): Promise<{ paymentLink: string | null; error: string | null }> {
    try {
      const result = await adminOrderService.createPaymentLink(orderId, remainingAmount.toFixed(2));

      if (result.error) {
        return {
          paymentLink: null,
          error: result.error,
        };
      }

      // Update metafield
      await metafieldService.setMetafield({
        namespace: 'partial',
        key: 'payment_link',
        value: result.paymentLink || '',
        type: 'url',
        ownerId: orderId,
      });

      return {
        paymentLink: result.paymentLink,
        error: null,
      };
    } catch (error) {
      return {
        paymentLink: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Complete remaining payment
   */
  async completeRemainingPayment(orderId: string, transactionId?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get order to find remaining amount
      const orderResult = await adminOrderService.getOrder(orderId);

      if (orderResult.error || !orderResult.order) {
        return {
          success: false,
          error: orderResult.error || 'Order not found',
        };
      }

      // Find remaining amount from metafields
      const remainingMetafield = orderResult.order.metafields.find(
        (mf) => mf.namespace === 'partial' && mf.key === 'remaining_amount'
      );

      if (!remainingMetafield) {
        return {
          success: false,
          error: 'Remaining amount not found in order metafields',
        };
      }

      const remainingAmount = parseFloat(remainingMetafield.value);

      // Create transaction for remaining amount
      const transactionResult = await adminOrderService.createTransaction(orderId, {
        kind: 'CAPTURE',
        gateway: 'manual',
        amount: remainingAmount.toFixed(2),
        parentId: transactionId,
      });

      if (transactionResult.error) {
        return {
          success: false,
          error: transactionResult.error,
        };
      }

      // Update metafields
      await metafieldService.setMetafields([
        {
          namespace: 'partial',
          key: 'remaining_paid',
          value: 'true',
          type: 'boolean',
          ownerId: orderId,
        },
        {
          namespace: 'partial',
          key: 'payment_status',
          value: 'fully_paid',
          type: 'single_line_text_field',
          ownerId: orderId,
        },
      ]);

      return {
        success: true,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const partialPaymentService = new PartialPaymentService();

