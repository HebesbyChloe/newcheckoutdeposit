require('dotenv').config();
const shopifyService = require('./src/services/shopifyService');
const { Pool } = require('pg');

async function publishAndCreateCart() {
  const productId = 'gid://shopify/Product/10022490079536';
  
  console.log('Publishing product and creating cart...\n');
  
  try {
    // First, get available publications
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
    
    const publications = await shopifyService.adminGraphQL(publicationsQuery);
    console.log('Available publications:');
    publications.publications.edges.forEach(edge => {
      console.log(`  - ${edge.node.name}: ${edge.node.id}`);
    });
    
    // Find Storefront API publication (this is what we need for Storefront API)
    const storefrontPub = publications.publications.edges.find(
      edge => edge.node.name.toLowerCase().includes('storefront')
    );
    
    if (!storefrontPub) {
      throw new Error('Storefront API publication not found');
    }
    
    console.log(`\nUsing publication: ${storefrontPub.node.name} (${storefrontPub.node.id})`);
    
    // Publish the product to Storefront API
    const publishMutation = `
      mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) {
          publishable {
            ... on Product {
              id
              title
              status
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const publishResult = await shopifyService.adminGraphQL(publishMutation, {
      id: productId,
      input: [{
        publicationId: storefrontPub.node.id
      }]
    });
    
    if (publishResult.publishablePublish.userErrors?.length > 0) {
      console.warn('Publish errors:', publishResult.publishablePublish.userErrors);
    } else {
      console.log('✅ Product published successfully!');
    }
    
    // Wait a moment for propagation
    console.log('Waiting for product to be available in Storefront API...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get variant ID
    const pool = process.env.DATABASE_URL ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    }) : null;
    
    const variantResult = await pool.query(
      `SELECT variant_id FROM external_variants WHERE product_id = $1 LIMIT 1`,
      [productId]
    );
    
    const variantId = variantResult.rows[0]?.variant_id;
    
    if (!variantId) {
      throw new Error('Variant ID not found');
    }
    
    console.log(`Using variant: ${variantId}`);
    
    // Try to create cart directly (sometimes products work even if query doesn't return them)
    console.log('Attempting to create cart...');
    
    // Create cart
    const cartResult = await shopifyService.createStorefrontCart([{
      merchandiseId: variantId,
      quantity: 1,
      attributes: []
    }]);
    
    console.log('\n✅✅✅ SUCCESS!');
    console.log('='.repeat(70));
    console.log('Product ID:', productId);
    console.log('Variant ID:', variantId);
    console.log('Shopify Cart ID:', cartResult.cartId);
    console.log('Checkout URL:', cartResult.checkoutUrl);
    console.log('='.repeat(70));
    
    if (pool) await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

publishAndCreateCart();

