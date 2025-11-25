# Available Diamond Data from Typesense Source

This document lists all available data fields from the Typesense external feed that can be used for cart attributes.

## 📋 Standard Fields (Always Available)

These fields are guaranteed to be present in every diamond record:

| Field Name | Type | Description | Example Value |
|------------|------|-------------|---------------|
| `id` | string | Unique identifier | `"510196638"` |
| `itemId` | string | Item ID number | `"510196638"` |
| `carat` | string/number | Diamond carat weight | `"1.50"` or `1.5` |
| `color` | string | Diamond color grade | `"D"`, `"E"`, `"F"`, etc. |
| `clarity` | string | Diamond clarity grade | `"FL"`, `"IF"`, `"VVS1"`, `"VVS2"`, etc. |
| `totalPrice` | number | Total price in USD | `4870.71` |
| `updatedAt` | number | Last update timestamp | `1704067200000` |

## 🔹 Optional Standard Fields

These fields may be present depending on the diamond:

| Field Name | Type | Description | Example Value |
|------------|------|-------------|---------------|
| `cut` | string | Diamond shape/cut | `"Round"`, `"Oval"`, `"Princess"`, etc. |
| `cutGrade` | string | Cut quality grade | `"Ideal"`, `"Excellent"`, `"Very Good"`, etc. |
| `pricePerCarat` | number | Price per carat | `3247.14` |

## 📄 Raw Document Fields (`hit.raw`)

The `raw` object contains the complete original document from Typesense. All fields below are available in `hit.raw`:

### Core Identification
- `id` - Document ID
- `Item ID #` - Item ID (may have spaces/special chars)
- `item_id` - Item ID (normalized)

### Diamond Specifications
- `Carat` - Carat weight (may be string or number)
- `Color` - Color grade
- `Clarity` - Clarity grade
- `Cut` - Shape/cut
- `Cut Grade` - Cut quality (may have space)
- `Cut_Grade` - Cut quality (underscore)
- `Shape` - Alternative to Cut

### Pricing
- `Total Price` - Total price (may have space)
- `Total_Price` - Total price (underscore)
- `total_price` - Total price (lowercase)
- `Price Per Carat` - Price per carat (may have space)
- `Price_Per_Carat` - Price per carat (underscore)
- `price_per_carat` - Price per carat (lowercase)

### Certificate Information
- `Certificate Number` - Certificate number (may have space)
- `Certificate_Number` - Certificate number (underscore)
- `certificate_number` - Certificate number (lowercase)
- `certificate_no` - Certificate number (abbreviated)
- `Cert Number` - Certificate number (short)
- `Grading Lab` - Lab name (may have space)
- `Grading_Lab` - Lab name (underscore)
- `grading_lab` - Lab name (lowercase)
- `certification` - Alternative lab field
- `Certificate Type` - Certificate type
- `certificate_type` - Certificate type (lowercase)

### Media URLs
- `Image URL` - Image URL (may have space)
- `Image_Path` - Image path (underscore)
- `image_url` - Image URL (lowercase)
- `imageUrl` - Image URL (camelCase)
- `Still Image URL` - Still image URL
- `Video URL` - Video URL (may have space)
- `video_url` - Video URL (lowercase)
- `videoUrl` - Video URL (camelCase)
- `Certificate URL` - Certificate PDF URL (may have space)
- `Certificate_Path` - Certificate path (underscore)
- `certificate_url` - Certificate URL (lowercase)
- `certificateUrl` - Certificate URL (camelCase)

### Additional Specifications (May be available)
- `Fluorescence` - Fluorescence intensity
- `fluorescence_intensity` - Fluorescence (lowercase)
- `Polish` - Polish grade
- `Symmetry` - Symmetry grade
- `Depth %` - Depth percentage
- `Table %` - Table percentage
- `Measurements` - Dimensions (e.g., "7.50 x 7.52 x 4.63 mm")
- `Length` - Length measurement
- `Width` - Width measurement
- `Height` - Height measurement
- `Country` - Origin country
- `country` - Origin country (lowercase)
- `State Region` - State/region
- `state_region` - State/region (lowercase)
- `Lab` - Laboratory name (alternative)
- `Report Type` - Report type
- `report_type` - Report type (lowercase)

### Metadata
- `updated_at` - Last update timestamp
- `created_at` - Creation timestamp (if available)

## 🎯 Currently Used in Cart Attributes

These fields are **currently being extracted** and added to cart line attributes:

1. ✅ **Carat** - From `carat`, `Carat`, `CARAT`, `diamond_carat`
2. ✅ **Color** - From `color`, `Color`, `COLOR`, `diamond_color`
3. ✅ **Clarity** - From `clarity`, `Clarity`, `CLARITY`, `diamond_clarity`
4. ✅ **Cut Grade** - From `cut_grade`, `Cut Grade`, `Cut_Grade`, `cutGrade`
5. ✅ **Certificate Type** - From `certificate_type`, `Certificate Type`, `grading_lab`, `Grading Lab`
6. ✅ **Certificate Number** - From `certificate_number`, `Certificate Number`, `certificate_no`

## 💡 Recommended Additional Fields

You may want to add these to cart attributes:

### High Priority
- **Shape/Cut** - Diamond shape (Round, Oval, etc.)
- **Price Per Carat** - For price comparison
- **Measurements** - Physical dimensions
- **Polish** - Polish grade
- **Symmetry** - Symmetry grade
- **Fluorescence** - Fluorescence intensity

### Medium Priority
- **Depth %** - Depth percentage
- **Table %** - Table percentage
- **Country** - Origin country
- **Item ID** - For reference/tracking

### Low Priority
- **Certificate URL** - Link to certificate PDF
- **Video URL** - Link to video
- **Image URL** - Link to high-res image

## 📝 How to Add New Fields

To add a new field to cart attributes:

1. **Update `extractMetadata` function** in `app/api/external-cart/add/route.ts`:
   ```typescript
   const extractMetadata = (payload?: Record<string, any>) => {
     const getField = (keys: string[]) => {
       for (const key of keys) {
         const value = payload?.[key] || payload?.[key.toLowerCase()] || payload?.[key.toUpperCase()];
         if (value) return String(value);
       }
       return undefined;
     };

     return {
       // ... existing fields ...
       shape: getField(['cut', 'Cut', 'CUT', 'shape', 'Shape', 'SHAPE']), // NEW
       polish: getField(['polish', 'Polish', 'POLISH']), // NEW
       // ... etc ...
     };
   };
   ```

2. **Add to attributes array**:
   ```typescript
   if (metadata.shape) attributes.push({ key: 'Shape', value: metadata.shape });
   if (metadata.polish) attributes.push({ key: 'Polish', value: metadata.polish });
   ```

3. **Update `getExternalProductPayload`** in `utils/external-product.ts` to extract the new field from metafields.

4. **Update `CartItem.tsx`** to display the new attribute in the cart UI.

## 🔍 How to Check Available Data

To see what data is actually available for a specific diamond:

1. **Check browser console** when viewing a product - the payload will be logged
2. **Check server logs** - `External cart add - payload received:` will show the full payload
3. **Inspect the raw document** - The `hit.raw` object contains everything

## 📌 Notes

- Field names may vary (spaces, underscores, camelCase, etc.) - the extraction functions handle multiple variations
- Some fields may be `null`, `undefined`, or empty strings - always check for existence before adding to attributes
- The `raw` document contains the most complete data, but normalized fields (`hit.carat`, `hit.color`, etc.) are more reliable
- All prices are in USD
- All measurements are typically in metric (mm for dimensions, carats for weight)

