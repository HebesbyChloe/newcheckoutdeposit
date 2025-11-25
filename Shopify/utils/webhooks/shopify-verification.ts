// Shopify webhook verification
import crypto from 'crypto';

/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyShopifyWebhook(body: string, hmacHeader: string | null): boolean {
  if (!hmacHeader) {
    return false;
  }

  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    // In development, allow webhooks without secret
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  const hash = crypto.createHmac('sha256', webhookSecret).update(body, 'utf8').digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

/**
 * Get raw body from request for webhook verification
 */
export async function getRawBody(request: Request): Promise<string> {
  return await request.text();
}

