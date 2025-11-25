const axios = require('axios');
const { Pool } = require('pg');

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
}

class ShopifyService {
  constructor() {
    this.apiKey = process.env.SHOPIFY_API_KEY;
    this.apiSecret = process.env.SHOPIFY_API_SECRET;
    // Strip https:// if present - we add it in the URL methods
    let baseUrl = process.env.SHOPIFY_STORE_URL || '';
    this.baseUrl = baseUrl.replace(/^https?:\/\//, '');
    this.storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
    this.adminAccessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  }
  
  // Admin API GraphQL endpoint
  getAdminGraphQLUrl() {
    return `https://${this.baseUrl}/admin/api/2024-01/graphql.json`;
  }
  
  // Storefront API GraphQL endpoint
  getStorefrontGraphQLUrl() {
    return `https://${this.baseUrl}/api/2024-01/graphql.json`;
  }
  
  // Admin API REST endpoint
  getAdminRestUrl() {
    return `https://${this.baseUrl}/admin/api/2024-01`;
  }
  
  // Make Admin GraphQL request
  async adminGraphQL(query, variables = {}) {
    const response = await axios.post(
      this.getAdminGraphQLUrl(),
      { query, variables },
      {
        headers: {
          'X-Shopify-Access-Token': this.adminAccessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.errors) {
      throw new Error(`Shopify Admin API Error: ${JSON.stringify(response.data.errors)}`);
    }
    
    return response.data.data;
  }
  
  // Make Storefront GraphQL request
  async storefrontGraphQL(query, variables = {}) {
    const response = await axios.post(
      this.getStorefrontGraphQLUrl(),
      { query, variables },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': this.storefrontAccessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.errors) {
      throw new Error(`Shopify Storefront API Error: ${JSON.stringify(response.data.errors)}`);
    }
    
    return response.data.data;
  }
  
  // Create or find product for external diamond (no variants)
  async createOrFindProductForExternal({ externalId, productHandle, title, imageUrl, price, attributes, payload }) {
    // First, check Shopify for existing product by SKU (externalId)
    // Use Shopify's query API to search by variant SKU
    const findProductBySkuQuery = `
      query {
        products(first: 1, query: "sku:${externalId}") {
          edges {
            node {
              id
              variants(first: 1) {
                edges {
                  node {
                    id
                    sku
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    let productId;
    let defaultVariantId = null;
    
    try {
      const findResult = await this.adminGraphQL(findProductBySkuQuery);
      if (findResult.products.edges.length > 0) {
        productId = findResult.products.edges[0].node.id;
        // Get default variant if product exists
        if (findResult.products.edges[0].node.variants.edges.length > 0) {
          defaultVariantId = findResult.products.edges[0].node.variants.edges[0].node.id;
        }
        console.log(`Found existing Shopify product by SKU ${externalId}: ${productId}`);
      }
    } catch (error) {
      console.log('Product not found by SKU, will check by handle or create new one');
    }
    
    // If not found by SKU, try by handle
    if (!productId) {
      const findProductByHandleQuery = `
        query {
          products(first: 1, query: "handle:${productHandle}") {
            edges {
              node {
                id
                variants(first: 1) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      try {
        const findResult = await this.adminGraphQL(findProductByHandleQuery);
        if (findResult.products.edges.length > 0) {
          productId = findResult.products.edges[0].node.id;
          // Get default variant if product exists
          if (findResult.products.edges[0].node.variants.edges.length > 0) {
            defaultVariantId = findResult.products.edges[0].node.variants.edges[0].node.id;
          }
          console.log(`Found existing Shopify product by handle ${productHandle}: ${productId}`);
        }
      } catch (error) {
        console.log('Product not found by handle, will create new one');
      }
    }
    
    // Create product if it doesn't exist
    if (!productId) {
      // Step 1: Create product (Shopify auto-creates a default variant)
      // Note: variants field is deprecated in ProductInput as of API 2024-04
      const productMutation = `
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              variants(first: 1) {
                edges {
                  node {
                    id
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
      
      const productInput = {
        title: title,
        handle: productHandle,
        vendor: 'External Diamond',
        productType: 'Diamond',
        status: 'ACTIVE' // Make product active
      };
      
      try {
        // Create product (Shopify will auto-create a default variant)
        const createResult = await this.adminGraphQL(productMutation, { input: productInput });
        if (createResult.productCreate.userErrors && createResult.productCreate.userErrors.length > 0) {
          throw new Error(`Shopify product creation errors: ${JSON.stringify(createResult.productCreate.userErrors)}`);
        }
        productId = createResult.productCreate.product.id;
        // Get default variant ID from creation result
        if (createResult.productCreate.product.variants.edges.length > 0) {
          defaultVariantId = createResult.productCreate.product.variants.edges[0].node.id;
        }
        console.log(`Created new product in Shopify: ${productId} with variant: ${defaultVariantId}`);
        
        // Step 2: Publish product to Storefront API publication (so it's available for cart operations)
        try {
          // Get available publications
          const publicationsQuery = `
            query {
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
          
          const publications = await this.adminGraphQL(publicationsQuery);
          // Find both Online Store and Storefront API publications
          const onlineStorePub = publications.publications.edges.find(
            edge => edge.node.name === 'Online Store'
          );
          const storefrontApiPub = publications.publications.edges.find(
            edge => edge.node.name === 'Storefront API'
          );
          
          const publicationsToPublish = [];
          if (onlineStorePub) {
            publicationsToPublish.push({ publicationId: onlineStorePub.node.id });
          }
          if (storefrontApiPub) {
            publicationsToPublish.push({ publicationId: storefrontApiPub.node.id });
          }
          
          if (publicationsToPublish.length > 0) {
            const publishMutation = `
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
            
            const publishResult = await this.adminGraphQL(publishMutation, {
              id: productId,
              input: publicationsToPublish
            });
            
            if (publishResult.publishablePublish.userErrors?.length > 0) {
              console.warn('Failed to publish product:', publishResult.publishablePublish.userErrors);
            } else {
              const pubNames = publicationsToPublish.map(p => {
                const pub = publications.publications.edges.find(e => e.node.id === p.publicationId);
                return pub ? pub.node.name : 'Unknown';
              }).join(', ');
              console.log(`Published product ${productId} to: ${pubNames}`);
            }
          } else {
            console.warn('No publications found (Online Store or Storefront API) - product may not be immediately available');
          }
        } catch (publishError) {
          console.warn('Failed to publish product (non-critical):', publishError.message);
          // Don't fail product creation if publishing fails
        }
        
        // Step 3: Update the default variant with SKU and price using REST API
        // GraphQL productVariantUpdate might not be available in all API versions
        if (defaultVariantId && pool) {
          try {
            // Extract numeric variant ID from GID (gid://shopify/ProductVariant/123456 -> 123456)
            const variantIdMatch = defaultVariantId.match(/\/(\d+)$/);
            const variantNumericId = variantIdMatch ? variantIdMatch[1] : defaultVariantId;
            
            // Use REST API to update variant (more reliable across API versions)
            const variantUpdateUrl = `${this.getAdminRestUrl()}/variants/${variantNumericId}.json`;
            const variantData = {
              variant: {
                sku: externalId, // Set SKU on variant so we can find it later
                price: price.amount,
                inventory_policy: 'deny',
                inventory_quantity: 999, // Set inventory so variant is available for sale
                inventory_management: null // Allow unlimited inventory
              }
            };
            
            const variantResponse = await axios.put(
              variantUpdateUrl,
              variantData,
              {
                headers: {
                  'X-Shopify-Access-Token': this.adminAccessToken,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (variantResponse.data && variantResponse.data.variant) {
              console.log(`Updated variant ${defaultVariantId} with SKU: ${externalId}`);
            }
          } catch (variantError) {
            console.warn('Failed to update variant SKU (non-critical):', variantError.message);
            // Don't fail the entire operation if variant update fails
            // We can still find the product by handle as fallback
          }
        }
        
        // Add image if provided
        if (imageUrl) {
          const imageMutation = `
            mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
              productCreateMedia(productId: $productId, media: $media) {
                media {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;
          try {
            await this.adminGraphQL(imageMutation, {
              productId: productId,
              media: [{ originalSource: imageUrl, mediaContentType: 'IMAGE' }]
            });
          } catch (imgError) {
            console.warn('Failed to add product image:', imgError.message);
          }
        }
      } catch (error) {
        console.error('Failed to create product in Shopify:', error.message);
        throw error;
      }
    }
    
    // Get default variant ID for cart operations if we haven't got it yet
    if (productId && !defaultVariantId) {
      try {
        const variantQuery = `
          query {
            product(id: "${productId}") {
              variants(first: 1) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `;
        const variantResult = await this.adminGraphQL(variantQuery);
        if (variantResult.product?.variants?.edges?.length > 0) {
          defaultVariantId = variantResult.product.variants.edges[0].node.id;
          console.log(`Retrieved default variant: ${defaultVariantId} for product ${productId}`);
        }
      } catch (error) {
        console.warn('Failed to get default variant:', error.message);
      }
    }
    
    // Store in external_variants table (store productId and default variantId for cart operations)
    if (productId) {
      await pool.query(
        `INSERT INTO external_variants (external_id, source_type, product_id, variant_id, price, last_synced_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (external_id, source_type) DO UPDATE SET
           product_id = EXCLUDED.product_id,
           variant_id = COALESCE(EXCLUDED.variant_id, external_variants.variant_id),
           price = EXCLUDED.price,
           last_synced_at = NOW()`,
        [
          externalId,
          attributes.find(a => a.key === '_source_type')?.value || 'labgrown',
          productId,
          defaultVariantId, // Store default variant ID for cart operations
          price.amount
        ]
      );
    }
    
    // Return productId (but we also have defaultVariantId stored for cart operations)
    return productId;
  }
  
  // Create Draft Order
  async createDraftOrder({ customerId, lines, totalAmount, customAttributes = [] }) {
    const mutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    // Build custom attributes array
    const attributes = [...customAttributes];
    if (totalAmount) {
      attributes.push({ key: 'total_amount', value: totalAmount.toString() });
    }
    
    const result = await this.adminGraphQL(mutation, {
      input: {
        customerId,
        lineItems: lines.map(line => ({
          variantId: line.variantId,
          quantity: line.quantity
        })),
        customAttributes: attributes
      }
    });
    
    if (result.draftOrderCreate.userErrors && result.draftOrderCreate.userErrors.length > 0) {
      const errors = result.draftOrderCreate.userErrors.map(e => e.message).join(', ');
      throw new Error(`Draft order creation failed: ${errors}`);
    }
    
    return result.draftOrderCreate.draftOrder.id;
  }
  
  // Complete Draft Order
  async completeDraftOrder(draftOrderId) {
    const mutation = `
      mutation draftOrderComplete($id: ID!) {
        draftOrderComplete(id: $id) {
          draftOrder {
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
    
    const result = await this.adminGraphQL(mutation, {
      id: draftOrderId
    });
    
    return result.draftOrderComplete.draftOrder.order.id;
  }
  
  // Check if variants are available in Storefront API
  async checkVariantsAvailable(variantIds, maxAttempts = 5, delayMs = 2000) {
    if (variantIds.length === 0) {
      return { ok: true, unavailableIds: [] };
    }

    const uniqueIds = Array.from(new Set(variantIds));
    const query = `
      query CheckVariantAvailability($ids: [ID!]!) {
        nodes(ids: $ids) {
          __typename
          ... on ProductVariant {
            id
            availableForSale
            quantityAvailable
          }
        }
      }
    `;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const data = await this.storefrontGraphQL(query, { ids: uniqueIds });

        const unavailable = [];
        if (data.nodes) {
          data.nodes.forEach((node, index) => {
            const id = uniqueIds[index];
            if (!node || node.__typename !== 'ProductVariant') {
              unavailable.push(id);
              return;
            }
            const available = node.availableForSale ?? false;
            const qty = node.quantityAvailable;
            if (!available || (typeof qty === 'number' && qty <= 0)) {
              unavailable.push(id);
            }
          });
        }

        if (unavailable.length === 0) {
          return { ok: true, unavailableIds: [] };
        }

        if (attempt < maxAttempts) {
          console.log(`Variants not yet available (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`, { unavailable });
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }

        return { ok: false, unavailableIds: unavailable };
      } catch (error) {
        console.warn('Error checking variant availability:', error.message);
        // On API error, fall back to trying checkout; don't block forever
        if (attempt >= maxAttempts) {
          return { ok: false, unavailableIds: uniqueIds };
        }
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return { ok: true, unavailableIds: [] };
  }

  // Create Storefront Cart with retry logic
  async createStorefrontCart(lines, maxRetries = 5, retryDelay = 3000) {
    const variantIds = lines.map(line => line.merchandiseId);
    
    // First, check if variants are available in Storefront API (but don't fail if check fails)
    // Sometimes products work even if the query doesn't return them
    const availability = await this.checkVariantsAvailable(variantIds, 3, 2000);
    if (!availability.ok) {
      console.warn(`Some variants may not be available yet: ${availability.unavailableIds.join(', ')}. Will attempt cart creation anyway.`);
    }
    
    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    // Retry cart creation if variants don't exist yet
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.storefrontGraphQL(mutation, {
          input: {
            lines: lines.map(line => ({
              merchandiseId: line.merchandiseId,
              quantity: line.quantity,
              attributes: line.attributes || []
            }))
          }
        });
        
        if (result.cartCreate.userErrors.length > 0) {
          const errorMessages = result.cartCreate.userErrors.map(e => e.message).join(', ');
          const hasNotFoundError = result.cartCreate.userErrors.some(e => 
            e.message && e.message.includes('does not exist')
          );
          
          // If variant doesn't exist and we have retries left, wait and retry
          if (hasNotFoundError && attempt < maxRetries) {
            console.log(`Cart creation failed - variant not found (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
          
          throw new Error(`Cart creation failed: ${JSON.stringify(result.cartCreate.userErrors)}`);
        }
        
        return {
          cartId: result.cartCreate.cart.id,
          checkoutUrl: result.cartCreate.cart.checkoutUrl
        };
      } catch (error) {
        // If it's a "does not exist" error and we have retries left, retry
        if (error.message && error.message.includes('does not exist') && attempt < maxRetries) {
          console.log(`Cart creation error - retrying (attempt ${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        // Otherwise, throw the error
        throw error;
      }
    }
    
    throw new Error('Cart creation failed after retries');
  }
  
  // Create Deposit Variant
  async createDepositVariant(depositProductId, amount, sessionId, paymentNumber) {
    // Get deposit product ID from environment or use provided one
    const productId = depositProductId || process.env.SHOPIFY_DEPOSIT_PRODUCT_ID;
    
    if (!productId) {
      throw new Error('SHOPIFY_DEPOSIT_PRODUCT_ID is not configured. Please create a "Deposit" product in Shopify and set its product GID in the environment.');
    }

    // Extract numeric product ID from GID (gid://shopify/Product/123456 -> 123456)
    const productIdMatch = productId.match(/\/(\d+)$/);
    const productNumericId = productIdMatch ? productIdMatch[1] : productId;

    // Create unique SKU and option1 for this variant (include session ID and timestamp to make it unique)
    const shortId = sessionId.slice(-8);
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const uniqueId = `${shortId}-${timestamp}`;
    const sku = `DEP-${uniqueId}-${paymentNumber}`;
    // Make option1 unique by including session ID and timestamp - this prevents duplicate variant errors
    // Use a shorter format to avoid Shopify's option1 length limits
    const option1 = `P${paymentNumber}-${uniqueId}`;

    // First, check if a variant with this SKU already exists
    try {
      const searchUrl = `${this.getAdminRestUrl()}/variants.json?sku=${encodeURIComponent(sku)}`;
      const searchResponse = await axios.get(searchUrl, {
        headers: {
          'X-Shopify-Access-Token': this.adminAccessToken,
          'Content-Type': 'application/json'
        }
      });

      if (searchResponse.data && searchResponse.data.variants && searchResponse.data.variants.length > 0) {
        // Variant with this SKU already exists, reuse it
        const existingVariant = searchResponse.data.variants[0];
        const variantGid = `gid://shopify/ProductVariant/${existingVariant.id}`;
        console.log(`Reusing existing deposit variant: ${variantGid} for payment ${paymentNumber} of session ${sessionId}`);
        
        // Update price if it's different
        if (parseFloat(existingVariant.price) !== amount) {
          const updateUrl = `${this.getAdminRestUrl()}/variants/${existingVariant.id}.json`;
          await axios.put(updateUrl, {
            variant: {
              price: amount.toFixed(2)
            }
          }, {
            headers: {
              'X-Shopify-Access-Token': this.adminAccessToken,
              'Content-Type': 'application/json'
            }
          });
          console.log(`Updated variant price to ${amount.toFixed(2)}`);
        }
        
        return variantGid;
      }
    } catch (searchError) {
      // If search fails, continue to create new variant
      console.warn('Failed to search for existing variant, will create new one:', searchError.message);
    }

    // Use REST API to create variant (more reliable than GraphQL for this)
    const variantUrl = `${this.getAdminRestUrl()}/products/${productNumericId}/variants.json`;
    const variantData = {
      variant: {
        price: amount.toFixed(2),
        sku: sku,
        option1: option1,
        inventory_management: null, // No inventory tracking for deposits
        inventory_quantity: 999 // Set high quantity to ensure availability
      }
    };

    try {
      const response = await axios.post(
        variantUrl,
        variantData,
        {
          headers: {
            'X-Shopify-Access-Token': this.adminAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.variant) {
        // Convert REST API variant ID to GID format
        const variantGid = `gid://shopify/ProductVariant/${response.data.variant.id}`;
        console.log(`Created deposit variant: ${variantGid} for payment ${paymentNumber} of session ${sessionId}`);
        return variantGid;
      } else {
        throw new Error('Variant creation succeeded but no variant was returned');
      }
    } catch (error) {
      if (error.response) {
        // Check if error is about duplicate variant - try to find and reuse it
        const errorData = error.response.data;
        if (errorData?.errors && (
          JSON.stringify(errorData.errors).includes('already exists') ||
          JSON.stringify(errorData.errors).includes('duplicate')
        )) {
          // Try to find existing variant by SKU
          try {
            const searchUrl = `${this.getAdminRestUrl()}/variants.json?sku=${encodeURIComponent(sku)}`;
            const searchResponse = await axios.get(searchUrl, {
              headers: {
                'X-Shopify-Access-Token': this.adminAccessToken,
                'Content-Type': 'application/json'
              }
            });
            
            if (searchResponse.data && searchResponse.data.variants && searchResponse.data.variants.length > 0) {
              const existingVariant = searchResponse.data.variants[0];
              const variantGid = `gid://shopify/ProductVariant/${existingVariant.id}`;
              console.log(`Found existing variant after duplicate error: ${variantGid}, reusing it`);
              return variantGid;
            }
          } catch (searchError) {
            // Fall through to throw original error
          }
        }
        
        const errorMsg = errorData?.errors 
          ? (typeof errorData.errors === 'string' ? errorData.errors : JSON.stringify(errorData.errors))
          : errorData?.error
          ? (typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error))
          : `HTTP ${error.response.status}: ${error.response.statusText}`;
        throw new Error(`Failed to create deposit variant: ${errorMsg}`);
      }
      throw error;
    }
  }
  
  // Record Deposit Transaction
  async recordDepositTransaction(orderId, amount) {
    // Use Admin API to create a transaction
    const mutation = `
      mutation orderTransactionCreate($orderId: ID!, $transaction: TransactionInput!) {
        orderTransactionCreate(orderId: $orderId, transaction: $transaction) {
          transaction {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const result = await this.adminGraphQL(mutation, {
      orderId,
      transaction: {
        kind: 'CAPTURE',
        amount: amount.toString(),
        currencyCode: 'USD'
      }
    });
    
    return result.orderTransactionCreate.transaction.id;
  }
  
  // Update Order Metafields
  async updateOrderMetafields(orderId, metafields) {
    const mutation = `
      mutation orderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const metafieldInputs = Object.entries(metafields).map(([key, value]) => ({
      namespace: key.split('.')[0],
      key: key.split('.').slice(1).join('.'),
      value: typeof value === 'string' ? value : JSON.stringify(value),
      type: typeof value === 'string' ? 'single_line_text_field' : 'json'
    }));
    
    await this.adminGraphQL(mutation, {
      input: {
        id: orderId,
        customAttributes: metafieldInputs.map(mf => ({
          key: `${mf.namespace}.${mf.key}`,
          value: mf.value
        }))
      }
    });
  }
  
  // Create Payment Link
  async createPaymentLink(orderId, amount) {
    // This would integrate with your payment provider
    // For now, return a placeholder
    return `https://pay-link.example.com/${orderId}?amount=${amount}`;
  }
  
  // Get Order with Partial Payment Info
  async getOrderPaymentStatus(orderId) {
    const query = `
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          customAttributes {
            key
            value
          }
          transactions(first: 10) {
            edges {
              node {
                id
                kind
                amount
                status
              }
            }
          }
        }
      }
    `;
    
    const result = await this.adminGraphQL(query, { id: orderId });
    
    const order = result.order;
    const metafields = {};
    order.customAttributes.forEach(attr => {
      metafields[attr.key] = attr.value;
    });
    
    const depositAmount = parseFloat(metafields['partial.deposit_amount'] || '0');
    const remainingAmount = parseFloat(metafields['partial.remaining_amount'] || '0');
    const paymentStatus = metafields['partial.payment_status'] || 'unpaid';
    const paymentLink = metafields['partial.payment_link'] || null;
    
    // Check transactions to determine payment status
    const transactions = order.transactions.edges.map(e => e.node);
    const depositPaid = transactions.some(t => 
      t.kind === 'CAPTURE' && parseFloat(t.amount) >= depositAmount && t.status === 'SUCCESS'
    );
    const remainingPaid = transactions.some(t => 
      t.kind === 'CAPTURE' && parseFloat(t.amount) >= remainingAmount && t.status === 'SUCCESS'
    );
    
    return {
      orderId: order.id,
      status: paymentStatus,
      depositAmount,
      remainingAmount,
      depositPaid,
      remainingPaid,
      paymentLink
    };
  }
  
  // Complete Remaining Payment
  async completeRemainingPayment(orderId, transactionId) {
    const remainingAmount = await this.getRemainingAmount(orderId);
    
    if (remainingAmount <= 0) {
      throw { code: 'NO_REMAINING_AMOUNT', message: 'No remaining amount to pay' };
    }
    
    // Create manual capture transaction
    const transaction = await this.recordDepositTransaction(orderId, remainingAmount);
    
    // Update metafields
    await this.updateOrderMetafields(orderId, {
      'partial.remaining_paid': 'true',
      'partial.payment_status': 'fully_paid'
    });
    
    // Store payment record
    await pool.query(
      `INSERT INTO payments (order_id, type, amount, transaction_id, status, created_at)
       VALUES ($1, 'REMAINING', $2, $3, 'completed', NOW())`,
      [orderId, remainingAmount, transaction]
    );
    
    return { success: true };
  }
  
  async getRemainingAmount(orderId) {
    const status = await this.getOrderPaymentStatus(orderId);
    return status.remainingAmount;
  }
  
  async handleOrderCreated(orderData) {
    // Sync Shopify order to local database
    try {
      const query = `
        INSERT INTO orders (
          external_id, customer_id, total_amount, status, 
          shipping_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (external_id) DO UPDATE SET
          total_amount = EXCLUDED.total_amount,
          status = EXCLUDED.status
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        `shopify_${orderData.id}`,
        orderData.customer?.id,
        orderData.total_price,
        orderData.financial_status,
        JSON.stringify(orderData.shipping_address)
      ]);
      
      console.log('Shopify order synced:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error syncing Shopify order:', error);
      throw error;
    }
  }
  
  async handleOrderUpdated(orderData) {
    // Update order in local database
    return this.handleOrderCreated(orderData);
  }
  
  async handleProductCreated(productData) {
    // Sync Shopify product to local database
    try {
      const query = `
        INSERT INTO product (
          sku, name, retail_price, description, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (sku) DO UPDATE SET
          name = EXCLUDED.name,
          retail_price = EXCLUDED.retail_price,
          description = EXCLUDED.description
        RETURNING *
      `;
      
      const variant = productData.variants?.[0];
      const result = await pool.query(query, [
        variant?.sku || `shopify_${productData.id}`,
        productData.title,
        variant?.price,
        productData.body_html,
        'active'
      ]);
      
      console.log('Shopify product synced:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error syncing Shopify product:', error);
      throw error;
    }
  }
  
  verifyWebhook(req) {
    // Implement Shopify webhook signature verification
    // This is a placeholder - implement actual verification
    return true;
  }
}

module.exports = new ShopifyService();

