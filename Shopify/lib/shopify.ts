import { GraphQLClient } from 'graphql-request';

const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

// Create a lazy-initialized client to avoid throwing errors at module load time
let shopifyClientInstance: GraphQLClient | null = null;

function getShopifyClient(): GraphQLClient {
  if (!domain || !storefrontAccessToken) {
    throw new Error(
      'Missing Shopify environment variables. Please set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN and NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN'
    );
  }

  if (!shopifyClientInstance) {
    const endpoint = `https://${domain}/api/2024-01/graphql.json`;
    shopifyClientInstance = new GraphQLClient(endpoint, {
      headers: {
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  return shopifyClientInstance;
}

// Export a getter function instead of direct instance
export const shopifyClient = new Proxy({} as GraphQLClient, {
  get(target, prop) {
    const client = getShopifyClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

