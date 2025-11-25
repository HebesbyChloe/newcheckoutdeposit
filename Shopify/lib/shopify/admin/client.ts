import { GraphQLClient } from 'graphql-request';

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!;
// Use 2024-10 or later for productVariantsBulkCreate support
// IMPORTANT: productVariantCreate was deprecated in 2024-10, use productVariantsBulkCreate instead
// For 2024-04, we'll use productVariantsBulkCreate which should work
const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

if (!domain || !adminAccessToken) {
  throw new Error('Missing Shopify Admin API environment variables');
}

// Warn if using an old API version that doesn't support productVariantCreate
if (apiVersion === '2024-01' || apiVersion === '2023-10' || apiVersion === '2023-07') {
  console.warn(
    `⚠️ WARNING: Shopify Admin API version ${apiVersion} does not support productVariantCreate mutation. ` +
    `Please update SHOPIFY_ADMIN_API_VERSION in .env.local to 2024-04 or later.`
  );
}

if (process.env.NODE_ENV !== 'production') {
  console.log(`🔧 Using Shopify Admin API version: ${apiVersion}`);
}

const adminEndpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

export const adminClient = new GraphQLClient(adminEndpoint, {
  headers: {
    'X-Shopify-Access-Token': adminAccessToken,
    'Content-Type': 'application/json',
  },
});

