// Admin API GraphQL queries and mutations

// Product queries
export const findProductByMetafieldQuery = `
  query findProductByMetafield($query: String!) {
    products(first: 1, query: $query) {
      edges {
        node {
          id
          title
          handle
          status
          variants(first: 1) {
            edges {
              node {
                id
                sku
                price
              }
            }
          }
          metafields(first: 10, namespace: $namespace) {
            edges {
              node {
                namespace
                key
                value
              }
            }
          }
        }
      }
    }
  }
`;

export const createProductMutation = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        status
        variants(first: 1) {
          edges {
            node {
              id
              sku
              price
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const updateProductMutation = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Use productVariantsBulkCreate (available in 2024-04+) instead of deprecated productVariantCreate
export const createVariantMutation = `
  mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        sku
        price
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const updateVariantMutation = `
  mutation productVariantUpdate($input: ProductVariantInput!) {
    productVariantUpdate(input: $input) {
      productVariant {
        id
        sku
        price
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Metafield mutations
export const setMetafieldsMutation = `
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const getProductMetafieldsQuery = `
  query getProductMetafields($id: ID!) {
    product(id: $id) {
      id
      metafields(first: 50) {
        edges {
          node {
            id
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

// Publish product to Online Store sales channel
export const publishProductMutation = `
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        ... on Product {
          id
          title
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Get Online Store publication ID
export const getPublicationsQuery = `
  query getPublications {
    publications(first: 10) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

// Draft Order mutations
export const createDraftOrderMutation = `
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        order {
          id
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const completeDraftOrderMutation = `
  mutation draftOrderComplete($id: ID!, $paymentPending: Boolean) {
    draftOrderComplete(id: $id, paymentPending: $paymentPending) {
      draftOrder {
        id
        order {
          id
          name
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const getDraftOrderQuery = `
  query getDraftOrder($id: ID!) {
    draftOrder(id: $id) {
      id
      name
      totalPrice
      subtotalPrice
      totalTax
      order {
        id
        name
      }
      lineItems(first: 50) {
        edges {
          node {
            id
            title
            quantity
            originalUnitPrice
          }
        }
      }
    }
  }
`;

// Order queries
export const getOrderQuery = `
  query getOrder($id: ID!) {
    order(id: $id) {
      id
      name
      email
      totalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      subtotalPriceSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
        }
      }
      financialStatus
      fulfillmentStatus
      createdAt
      lineItems(first: 50) {
        edges {
          node {
            id
            title
            quantity
            originalUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
        }
      }
      transactions(first: 10) {
        edges {
          node {
            id
            kind
            status
            amount
            gateway
            createdAt
          }
        }
      }
      metafields(first: 20) {
        edges {
          node {
            namespace
            key
            value
            type
          }
        }
      }
    }
  }
`;

export const updateOrderMutation = `
  mutation orderUpdate($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Transaction mutations
export const createTransactionMutation = `
  mutation orderTransactionCreate($orderId: ID!, $transaction: TransactionInput!) {
    orderTransactionCreate(orderId: $orderId, transaction: $transaction) {
      transaction {
        id
        kind
        status
        amount
        gateway
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Payment Link creation (REST API, but included for reference)
// Note: Payment links are created via REST API, not GraphQL

