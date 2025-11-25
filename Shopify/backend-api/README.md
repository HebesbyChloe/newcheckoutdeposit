## Backend API Specification (Gateway → Backend Service)

This folder defines the **internal API** that the gateway calls. It is not
exposed to browsers directly. The backend service is responsible for:

- Calling Shopify **Admin** and **Storefront** APIs.
- Reading/writing the project database (carts, cart_items, deposit_sessions, payments).
- Applying business rules (one external diamond per cart, deposit formulas, etc.).

Base URL examples:

- Production: `https://backend.yourdomain.com/api/v1`
- Local: `http://localhost:4000/api/v1`

Responses may be raw JSON (no envelope) since only the gateway talks to it.

---

## 1. Cart

### 1.1 Add item to internal cart

- **Method**: `POST`
- **Path**: `/cart/items`

Purpose:

- Create or load an **internal cart**.
- For `source: 'external'`:
  - Ensure there is a dummy Shopify product + per‑diamond variant.
  - Write/update relevant records in DB.
- Return updated internal cart in canonical format.

Request body:

```json
{
  "cartId": "cart_123_optional",
  "source": "external",
  "externalId": "510095759",
  "variantId": null,
  "productHandle": "diamond-510095759",
  "title": "4.08 Carat Vivid Pink Heart Diamond",
  "imageUrl": "https://.../still.jpg",
  "price": { "amount": "3904.72", "currencyCode": "USD" },
  "quantity": 1,
  "attributes": [
    { "key": "_external_id", "value": "510095759" },
    { "key": "_source_type", "value": "labgrown" }
  ],
  "payload": { "...": "full external feed document (raw)" },
  "customerId": "optional internal or shopify customer id"
}
```

Response (success):

```json
{
  "cartId": "cart_123",
  "cart": {
    "id": "cart_123",
    "customerId": "user_abc",
    "totalQuantity": 1,
    "lines": [
      {
        "id": "line_abc",
        "source": "external",
        "variantId": "gid://shopify/ProductVariant/...",
        "externalId": "510095759",
        "title": "4.08 Carat Vivid Pink Heart Diamond",
        "imageUrl": "https://.../still.jpg",
        "price": { "amount": "3904.72", "currencyCode": "USD" },
        "quantity": 1,
        "attributes": [
          { "key": "_external_id", "value": "510095759" },
          { "key": "_source_type", "value": "labgrown" }
        ],
        "payload": { "...": "raw document (optional)" }
      }
    ]
  }
}
```

Side effects (DB):

- `carts` table:
  - Upsert cart row `id = cart_123`, update `customer_id`, totals, timestamps.
- `cart_items` table:
  - Insert new item row with `cart_id`, `source`, `variant_id`, `external_id`, `price_*`, `attributes` JSON, `payload` JSON.
- `external_variants` (optional table, if you want history of Shopify variants created for external diamonds):
  - Upsert by `external_id` and `source_type` with `product_id`, `variant_id`, `price`, `last_synced_at`.

Error responses:

- 400 with `{ code: 'VALIDATION_ERROR', message, details }`.
- 409 with `{ code: 'EXTERNAL_ALREADY_IN_CART', ... }`.
- 502/503 with `{ code: 'SHOPIFY_ERROR', message, details }`.

### 1.2 Get internal cart

- **Method**: `GET`
- **Path**: `/cart/{cartId}`

Response:

```json
{
  "id": "cart_123",
  "customerId": "user_abc",
  "totalQuantity": 1,
  "lines": [ "... same as in 1.1 ..." ]
}
```

### 1.3 Update line quantity

- **Method**: `PUT`
- **Path**: `/cart/items`

Request:

```json
{
  "cartId": "cart_123",
  "lineId": "line_abc",
  "quantity": 2
}
```

Response: full cart (same shape as **1.2**), with DB updates to `cart_items`.

### 1.4 Remove line

- **Method**: `DELETE`
- **Path**: `/cart/items`

Request:

```json
{
  "cartId": "cart_123",
  "lineId": "line_abc"
}
```

Response: full cart (same shape as **1.2**). If cart becomes empty, backend may mark `carts.status = 'empty'` and/or delete it.

---

## 2. Full checkout (build Shopify cart)

### 2.1 Create checkout from internal cart

- **Method**: `POST`
- **Path**: `/cart/checkout`

Request:

```json
{
  "cartId": "cart_123"
}
```

Backend steps:

1. Load internal cart from DB (`carts` + `cart_items`).
2. For each line:
   - Ensure `variantId` is a real Shopify variant GID.
   - For external diamonds, if `variantId` is missing, call Admin to create/find variant and update DB.
3. Build Storefront `CartLineInput[]`.
4. Call Shopify Storefront `cartCreate` via `cart.service.ts`.
5. Optionally store `shopify_cart_id` against `carts.id`.

Response:

```json
{
  "checkoutUrl": "https://yourshop.com/cart/c/abcd1234"
}
```

Errors use `{ code, message, details }` and appropriate HTTP codes.

---

## 3. Deposit sessions

### 3.1 Create deposit session from internal cart

- **Method**: `POST`
- **Path**: `/deposit-sessions`

Request:

```json
{
  "cartId": "cart_123",
  "customer_id": "gid://shopify/Customer/123",
  "lines": [
    { "variantId": "gid://shopify/ProductVariant/...", "quantity": 1 }
  ],
  "total_amount": 3904.72,
  "deposit_amount": 1171.42
}
```

Notes:

- `lines` can be provided explicitly or derived server‑side from `cartId`.

Backend steps:

1. Create Draft Order in Shopify Admin with all `lines`.
2. Calculate `remaining_amount = total_amount - deposit_amount`.
3. Store `DepositSession` in DB table `deposit_sessions`.

Response:

```json
{
  "session_id": "deposit_1763906472737_ft4i1muw6ae"
}
```

### 3.2 Get deposit session

- **Method**: `GET`
- **Path**: `/deposit-sessions/{sessionId}`

Response:

```json
{
  "session_id": "deposit_...",
  "cart_id": "cart_123",
  "customer_id": "gid://shopify/Customer/123",
  "items": [
    { "variantId": "gid://shopify/ProductVariant/...", "quantity": 1 }
  ],
  "total_amount": 3904.72,
  "deposit_amount": 1171.42,
  "remaining_amount": 2733.3,
  "draft_order_id": "gid://shopify/DraftOrder/...",
  "checkout_url": null,
  "created_at": "2024-05-01T12:34:56.000Z",
  "expires_at": "2024-05-02T12:34:56.000Z"
}
```

### 3.3 Create checkout for deposit session

- **Method**: `POST`
- **Path**: `/deposit-sessions/{sessionId}/checkout`

Backend steps:

1. Load `DepositSession` from DB.
2. Create per‑session deposit variant on dedicated **Deposit product**.
3. Set metafields on variant (`custom.deposit` JSON).
4. Ensure inventory/publishing.
5. Create Storefront cart with **one line** (deposit variant) and line attributes (`deposit_summary`, `deposit_session_id`, etc.).
6. Update `deposit_sessions.checkout_url` in DB.

Response:

```json
{
  "checkoutUrl": "https://yourshop.com/cart/c/dep1234"
}
```

---

## 4. Orders & partial payments

### 4.1 Complete deposit order

- **Method**: `POST`
- **Path**: `/deposit-sessions/{sessionId}/complete`

Purpose:

- Called from webhooks or back‑office when the **deposit checkout** is paid.

Backend steps:

1. Load `DepositSession` from DB.
2. Complete Shopify Draft Order → real Order.
3. Record deposit transaction via Admin API.
4. Write partial‑payment metafields on Order (`partial.deposit_amount`, `partial.remaining_amount`, `partial.payment_status`, etc.).
5. Create payment link for remaining amount and store in metafield + `payments` table.

Response:

```json
{
  "orderId": "gid://shopify/Order/123",
  "paymentLink": "https://pay-link.example.com/abc123"
}
```

### 4.2 Get order payment status

- **Method**: `GET`
- **Path**: `/orders/{orderId}`

Backend steps:

1. Fetch order from Shopify Admin.
2. Read partial‑payment metafields (`partial.deposit_amount`, `partial.remaining_amount`, `partial.payment_status`, `partial.payment_link`).
3. Optionally cross‑check with `payments` table.

Response:

```json
{
  "orderId": "gid://shopify/Order/123",
  "status": "partial_paid",
  "depositAmount": 1000,
  "remainingAmount": 2904.72,
  "depositPaid": true,
  "remainingPaid": false,
  "paymentLink": "https://pay-link.example.com/abc123"
}
```

### 4.3 Complete remaining payment

- **Method**: `POST`
- **Path**: `/orders/{orderId}/complete-remaining`

Request:

```json
{
  "transactionId": "optional_shopify_transaction_gid"
}
```

Backend steps:

1. Look up remaining amount from metafields.
2. Create manual capture transaction in Shopify Admin.
3. Update metafields (`remaining_paid = true`, `payment_status = 'fully_paid'`).
4. Insert row into `payments` table with type `REMAINING`.

Response:

```json
{ "success": true }
```


