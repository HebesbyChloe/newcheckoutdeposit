const { Pool } = require('pg');

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
}

/**
 * Extract diamond field from payload or attributes with multiple key variations
 */
function extractField(payload, attributes, keys) {
  // Try payload first
  if (payload) {
    for (const key of keys) {
      if (payload[key] !== undefined && payload[key] !== null && payload[key] !== '') {
        return String(payload[key]);
      }
    }
  }
  
  // Fallback to attributes array
  if (attributes && Array.isArray(attributes)) {
    for (const key of keys) {
      const attr = attributes.find(a => a.key === key || a.key === key.toLowerCase() || a.key === key.toUpperCase());
      if (attr && attr.value) {
        return String(attr.value);
      }
    }
  }
  
  return null;
}

/**
 * Extract all diamond fields needed for product and diamond tables
 */
function extractDiamondFields(payload, attributes, price, imageUrl, title) {
  return {
    // Product fields
    name: title || extractField(payload, attributes, ['title', 'Title', 'name', 'Name']) || 'Diamond',
    sku: extractField(payload, attributes, ['id', 'item_id', 'itemId', 'Item ID #', 'Item ID', 'external_id', '_external_id']) || null,
    description: extractField(payload, attributes, ['description', 'Description']) || null,
    retailPrice: price?.amount ? parseFloat(price.amount) : null,
    salePrice: price?.amount ? parseFloat(price.amount) : null,
    
    // Diamond fields
    itemId: extractField(payload, attributes, ['id', 'item_id', 'itemId', 'Item ID #', 'Item ID', 'external_id', '_external_id']) || null,
    carat: extractField(payload, attributes, ['carat', 'Carat', 'Carat Weight']) || null,
    color: extractField(payload, attributes, ['color', 'Color', 'Natural Fancy Color', 'natural_fancy_color']) || null,
    clarity: extractField(payload, attributes, ['clarity', 'Clarity']) || null,
    cutGrade: extractField(payload, attributes, ['cut_grade', 'cutGrade', 'Cut Grade', 'Cut_Grade']) || null,
    // Map "cut" to "shape" - priority: shape > cut (if shape exists, use it; otherwise use cut)
    shape: extractField(payload, attributes, ['shape', 'Shape']) || extractField(payload, attributes, ['cut', 'Cut']) || null,
    gradingLab: extractField(payload, attributes, ['grading_lab', 'gradingLab', 'Grading Lab', 'Grading_Lab', 'certificate_type', 'certificateType', 'Certificate Type']) || null,
    certificateNumber: extractField(payload, attributes, ['certificate_number', 'certificateNumber', 'Certificate Number', 'certificate_no', 'Certificate No']) || null,
    totalPrice: price?.amount ? parseFloat(price.amount) : null,
    imagePath: imageUrl || extractField(payload, attributes, ['image_url', 'imageUrl', 'Image URL', 'Image_Path', 'Still Image URL', 'image', 'Image']) || null,
    
    // Optional fields
    measurementLength: extractField(payload, attributes, ['measurement_length', 'length', 'Length', 'Length (mm)']) || null,
    measurementWidth: extractField(payload, attributes, ['measurement_width', 'width', 'Width', 'Width (mm)']) || null,
    measurementHeight: extractField(payload, attributes, ['measurement_height', 'height', 'Height', 'Height (mm)', 'depth', 'Depth']) || null,
    country: extractField(payload, attributes, ['country', 'Country', 'origin', 'Origin']) || null,
    stateRegion: extractField(payload, attributes, ['state_region', 'stateRegion', 'State Region', 'state', 'State', 'region', 'Region']) || null,
    certificatePath: extractField(payload, attributes, ['certificate_path', 'certificatePath', 'Certificate Path']) || null,
  };
}

class ProductDiamondService {
  /**
   * Create or find product and diamond records in the database
   * @param {string} externalId - External diamond ID
   * @param {object} payload - Full raw external feed document
   * @param {array} attributes - Extracted metadata array
   * @param {object} price - Price object with amount and currencyCode
   * @param {string} imageUrl - Image URL
   * @param {string} title - Product title
   * @param {string} shopifyProductId - Shopify product ID (GID format like gid://shopify/Product/...)
   * @returns {Promise<{productId: number|null, diamondId: number|null}>}
   */
  async createOrFindProductAndDiamond(externalId, payload, attributes, price, imageUrl, title, shopifyProductId) {
    if (!pool) {
      console.warn('Database not configured - skipping product/diamond creation');
      return { productId: null, diamondId: null };
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Extract all fields
      const fields = extractDiamondFields(payload, attributes, price, imageUrl, title);
      
      // Use externalId as SKU
      const sku = externalId || fields.sku;
      if (!sku) {
        console.warn('No SKU/externalId provided - cannot create product');
        await client.query('ROLLBACK');
        return { productId: null, diamondId: null };
      }
      
      // Check if product already exists by SKU
      const existingProduct = await client.query(
        `SELECT id FROM product WHERE sku = $1 LIMIT 1`,
        [sku]
      );
      
      let productId;
      
      if (existingProduct.rows.length > 0) {
        // Product exists, use existing ID
        productId = existingProduct.rows[0].id;
        console.log(`Found existing product with SKU ${sku}: ${productId}`);
        
        // Update shopify_product_id if it's NULL and we have a new Shopify product ID
        if (shopifyProductId) {
          // Check if shopify_product_id column exists
          const shopifyIdColumnCheck = await client.query(
            `SELECT column_name 
             FROM information_schema.columns 
             WHERE table_name = 'product' AND column_name = 'shopify_product_id'`
          );
          const hasShopifyProductId = shopifyIdColumnCheck.rows.length > 0;
          
          if (hasShopifyProductId) {
            // Extract numeric ID from GID format (gid://shopify/Product/123456) -> 123456
            const shopifyIdMatch = shopifyProductId.match(/\/(\d+)$/);
            const shopifyNumericId = shopifyIdMatch ? shopifyIdMatch[1] : shopifyProductId;
            
            await client.query(
              `UPDATE product SET shopify_product_id = $1, updated_at = NOW() 
               WHERE id = $2 AND (shopify_product_id IS NULL OR shopify_product_id != $1)`,
              [shopifyNumericId, productId]
            );
            console.log(`Updated shopify_product_id for product ${productId}: ${shopifyNumericId}`);
          }
        }
      } else {
        // Create new product
        // Check which columns exist: tenant_id, brand_id, shopify_product_id
        const columnChecks = await client.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = 'product' 
           AND column_name IN ('tenant_id', 'brand_id', 'shopify_product_id')`
        );
        const existingColumns = columnChecks.rows.map(r => r.column_name);
        const hasTenantId = existingColumns.includes('tenant_id');
        const hasBrandId = existingColumns.includes('brand_id');
        const hasShopifyProductId = existingColumns.includes('shopify_product_id');
        
        // Extract numeric ID from GID format (gid://shopify/Product/123456) -> 123456
        const shopifyNumericId = shopifyProductId ? (shopifyProductId.match(/\/(\d+)$/)?.[1] || shopifyProductId) : null;
        
        // Build INSERT statement dynamically based on available columns
        const insertColumns = ['sku', 'name', 'product_type', 'retail_price', 'sale_price', 'description', 'status'];
        const insertValues = [sku, fields.name || 'Diamond', 'external_diamond', fields.retailPrice, fields.salePrice, fields.description, 'active'];
        let paramIndex = insertValues.length;
        
        if (hasTenantId) {
          insertColumns.push('tenant_id');
          insertValues.push(3); // tenant_id = 3
          paramIndex++;
        }
        
        if (hasBrandId) {
          insertColumns.push('brand_id');
          insertValues.push(4); // brand_id = 4
          paramIndex++;
        }
        
        if (hasShopifyProductId && shopifyNumericId) {
          insertColumns.push('shopify_product_id');
          insertValues.push(shopifyNumericId);
          paramIndex++;
        }
        
        insertColumns.push('created_at', 'updated_at');
        
        // Build placeholders: $1, $2, ..., NOW(), NOW()
        const placeholders = [];
        for (let i = 0; i < paramIndex; i++) {
          placeholders.push(`$${i + 1}`);
        }
        placeholders.push('NOW()', 'NOW()');
        
        const productResult = await client.query(
          `INSERT INTO product (${insertColumns.join(', ')})
           VALUES (${placeholders.join(', ')})
           RETURNING id`,
          insertValues
        );
        productId = productResult.rows[0].id;
        
        console.log(`Created new product with SKU ${sku}: ${productId}`);
      }
      
      // Check if diamond already exists for this product
      const existingDiamond = await client.query(
        `SELECT id FROM diamond WHERE product_id = $1 LIMIT 1`,
        [productId]
      );
      
      let diamondId;
      
      if (existingDiamond.rows.length > 0) {
        // Diamond exists, use existing ID
        diamondId = existingDiamond.rows[0].id;
        console.log(`Found existing diamond for product ${productId}: ${diamondId}`);
        
        // Update diamond record with latest data
        await client.query(
          `UPDATE diamond SET
            item_id = COALESCE($1, item_id),
            carat = COALESCE($2, carat),
            color = COALESCE($3, color),
            clarity = COALESCE($4, clarity),
            cut_grade = COALESCE($5, cut_grade),
            shape = COALESCE($6, shape),
            grading_lab = COALESCE($7, grading_lab),
            certificate_number = COALESCE($8, certificate_number),
            total_price = COALESCE($9, total_price),
            image_path = COALESCE($10, image_path),
            measurement_length = COALESCE($11, measurement_length),
            measurement_width = COALESCE($12, measurement_width),
            measurement_height = COALESCE($13, measurement_height),
            country = COALESCE($14, country),
            state_region = COALESCE($15, state_region),
            certificate_path = COALESCE($16, certificate_path),
            updated_at = NOW()
          WHERE id = $17`,
          [
            fields.itemId || externalId,
            fields.carat ? parseFloat(fields.carat) : null,
            fields.color,
            fields.clarity,
            fields.cutGrade,
            fields.shape,
            fields.gradingLab,
            fields.certificateNumber,
            fields.totalPrice,
            fields.imagePath,
            fields.measurementLength ? parseFloat(fields.measurementLength) : null,
            fields.measurementWidth ? parseFloat(fields.measurementWidth) : null,
            fields.measurementHeight ? parseFloat(fields.measurementHeight) : null,
            fields.country,
            fields.stateRegion,
            fields.certificatePath,
            diamondId
          ]
        );
      } else {
        // Create new diamond record
        // Check if tenant_id column exists
        const columnCheck = await client.query(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = 'diamond' AND column_name = 'tenant_id'`
        );
        const hasTenantId = columnCheck.rows.length > 0;
        
        // Insert diamond with or without tenant_id based on column existence
        let diamondResult;
        if (hasTenantId) {
          diamondResult = await client.query(
            `INSERT INTO diamond (
              product_id, item_id, carat, color, clarity, cut_grade, shape,
              grading_lab, certificate_number, total_price, image_path,
              measurement_length, measurement_width, measurement_height,
              country, state_region, certificate_path, tenant_id,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
            RETURNING id`,
            [
              productId,
              fields.itemId || externalId,
              fields.carat ? parseFloat(fields.carat) : null,
              fields.color,
              fields.clarity,
              fields.cutGrade,
              fields.shape, // This now includes "cut" mapped to "shape"
              fields.gradingLab,
              fields.certificateNumber,
              fields.totalPrice,
              fields.imagePath,
              fields.measurementLength ? parseFloat(fields.measurementLength) : null,
              fields.measurementWidth ? parseFloat(fields.measurementWidth) : null,
              fields.measurementHeight ? parseFloat(fields.measurementHeight) : null,
              fields.country,
              fields.stateRegion,
              fields.certificatePath,
              3 // tenant_id = 3
            ]
          );
        } else {
          diamondResult = await client.query(
            `INSERT INTO diamond (
              product_id, item_id, carat, color, clarity, cut_grade, shape,
              grading_lab, certificate_number, total_price, image_path,
              measurement_length, measurement_width, measurement_height,
              country, state_region, certificate_path,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
            RETURNING id`,
            [
              productId,
              fields.itemId || externalId,
              fields.carat ? parseFloat(fields.carat) : null,
              fields.color,
              fields.clarity,
              fields.cutGrade,
              fields.shape, // This now includes "cut" mapped to "shape"
              fields.gradingLab,
              fields.certificateNumber,
              fields.totalPrice,
              fields.imagePath,
              fields.measurementLength ? parseFloat(fields.measurementLength) : null,
              fields.measurementWidth ? parseFloat(fields.measurementWidth) : null,
              fields.measurementHeight ? parseFloat(fields.measurementHeight) : null,
              fields.country,
              fields.stateRegion,
              fields.certificatePath
            ]
          );
        }
        
        diamondId = diamondResult.rows[0].id;
        console.log(`Created new diamond for product ${productId}: ${diamondId}`);
      }
      
      await client.query('COMMIT');
      
      return { productId, diamondId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating product/diamond:', error);
      // Don't throw - allow cart flow to continue even if DB write fails
      return { productId: null, diamondId: null };
    } finally {
      client.release();
    }
  }
}

module.exports = new ProductDiamondService();

