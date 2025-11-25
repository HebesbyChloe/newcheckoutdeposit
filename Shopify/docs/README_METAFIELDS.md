# Setting Up Shopify Metafields for Diamond Products

To make the filters work properly, you need to add metafields to your Shopify products. Here's how:

## Required Metafields

For each diamond product, add the following metafields in Shopify Admin:

### Namespace: `custom`
### Metafields:

1. **`shape`** (single_line_text_field or list.single_line_text_field)
   - Primary key: `custom.shape`
   - Fallback: `custom.diamond_shape`
   - Values: Round, Oval, Emerald, Cushion, Pear, Princess, Marquise, Asscher, Heart, etc.

2. **`carat`** (number_decimal_field or single_line_text_field)
   - Primary key: `custom.carat`
   - Fallback: `custom.diamond_carat`
   - Example: 1.5, 2.0, 0.5

3. **`cut_grade`** (single_line_text_field or list.single_line_text_field)
   - Primary key: `custom.cut_grade`
   - Values: Fair, Good, Very Good, Ideal, Super Ideal, Excellent

4. **`color`** (single_line_text_field or list.single_line_text_field)
   - Primary key: `custom.color`
   - Fallback: `custom.diamond_color`
   - Values: D, E, F, G, H, I, J

5. **`clarity`** (single_line_text_field or list.single_line_text_field)
   - Primary key: `custom.clarity`
   - Fallback: `custom.diamond_clarity`
   - Values: FL, IF, VVS1, VVS2, VS1, VS2, SI1, SI2

6. **`grading_lab`** (single_line_text_field or list.single_line_text_field)
   - Primary key: `custom.grading_lab`
   - Fallback: `custom.grading-lab`, `custom.gradingLab`, `custom.certification`
   - Values: GIA, IGI, AGS, etc.

7. **`video_external_url`** (url or single_line_text_field)
   - Primary key: `custom.video_external_url`
   - Used for 360-degree video viewer
   - Example: `https://mediadiamfile.s3.ap-south-1.amazonaws.com/viewer/Vision360.html?d=3509573`

## How to Add Metafields in Shopify

### Option 1: Via Shopify Admin (Manual)

1. Go to **Settings** → **Custom data** → **Products**
2. Click **Add definition**
3. For each metafield:
   - **Name**: `diamond_shape` (or carat, cut, etc.)
   - **Namespace and key**: `custom.diamond_shape`
   - **Type**: Select appropriate type (text, number, etc.)
   - **Description**: Optional
   - Click **Save**

4. Then go to each product and fill in the metafield values

### Option 2: Via Shopify API (Bulk Import)

You can use the Shopify Admin API to bulk add metafields:

```graphql
mutation {
  metafieldsSet(metafields: [
    {
      namespace: "custom"
      key: "diamond_shape"
      value: "Round"
      type: "single_line_text_field"
      ownerId: "gid://shopify/Product/123456789"
    },
    {
      namespace: "custom"
      key: "diamond_carat"
      value: "1.5"
      type: "number_decimal"
      ownerId: "gid://shopify/Product/123456789"
    }
    # ... repeat for other metafields
  ]) {
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
```

### Option 3: Via CSV Import

1. Export your products to CSV
2. Add columns: `Metafield: custom.diamond_shape [single_line_text_field]`, etc.
3. Fill in the values
4. Import back to Shopify

## Storefront API Permissions

Make sure your Storefront API access token has permission to read metafields:
- Go to **Settings** → **Apps and sales channels** → **Develop apps**
- Select your app → **API scopes**
- Ensure `unauthenticated_read_product_listings` or `unauthenticated_read_products` includes metafields access

## Testing

After adding metafields:

1. Check that products have metafields in GraphQL:
```graphql
{
  products(first: 1) {
    edges {
      node {
        title
        metafields(first: 10) {
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
```

2. The filters should now work properly with real data!

## Example Product Setup

For a product like "Round 1.5ct Ideal F VS1 Lab Grown Diamond":

- `custom.shape` = "Round" (or `["Round"]` if using list type)
- `custom.carat` = "1.5" (or `["1.5"]` if using list type)
- `custom.cut_grade` = "Ideal" (or `["Ideal"]` if using list type)
- `custom.color` = "F" (or `["F"]` if using list type)
- `custom.clarity` = "VS1" (or `["VS1"]` if using list type)
- `custom.grading_lab` = "GIA" (optional)
- `custom.video_external_url` = "https://..." (optional, for 360 viewer)

**Note:** The code automatically parses JSON array values (e.g., `["Round"]` → `"Round"`), so you can use either single values or arrays.

