## Gateway API Specification (Frontend → Gateway)

This folder defines the HTTP contract that the **frontend** will call. The
gateway is a light layer that:

- Validates requests from the UI.
- Adds user / session context.
- Calls the **backend API** (see `../backend-api/README.md`).
- Returns clean JSON models to the frontend (no Shopify details).

Base URL examples:

- Production: `https://gateway.yourdomain.com/api/gw/v1`
- Local (Next.js or Node gateway): `http://localhost:3010/api/gw/v1`

All responses follow this envelope:

```json
{ "data": <payload or null>, "error": null | { "code": "string", "message": "string", "details"?: any } }
```

---

## 1. Cart (internal cart, including external diamonds)

### 1.1 Add item to cart

- **Method**: `POST`
- **Path**: `/cart/items`

**Request body**

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
  "payload": { "...": "full external feed document (raw)" }
}
```

Notes:

- `source` is `"shopify"` or `"external"`.
- For external diamonds, `externalId` + `_external_id` are required.
- For Shopify products, `variantId` is required and `externalId` is omitted.

**Successful response**

```json
{
  "data": {
    "cartId": "cart_123",
    "cart": {
      "id": "cart_123",
      "totalQuantity": 1,
      "lines": [
        {
          "id": "line_abc",
          "source": "external",
          "title": "4.08 Carat Vivid Pink Heart Diamond",
          "imageUrl": "https://.../still.jpg",
          "price": { "amount": "3904.72", "currencyCode": "USD" },
          "quantity": 1,
          "attributes": [
            { "key": "_external_id", "value": "510095759" },
            { "key": "_source_type", "value": "labgrown" }
          ]
        }
      ]
    }
  },
  "error": null
}
```

**Error response (example)**

```json
{
  "data": null,
  "error": {
    "code": "EXTERNAL_ALREADY_IN_CART",
    "message": "This diamond is already in your cart and is currently on hold.",
    "details": { "externalId": "510095759" }
  }
}
```

### 1.2 Get current cart

- **Method**: `GET`
- **Path**: `/cart`
- **Query**: `?cartId=cart_123` (or read from auth/session token later).

Response:

```json
{
  "data": {
    "cartId": "cart_123",
    "cart": { "... same structure as in 1.1 ..." }
  },
  "error": null
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

Same response shape as **1.1**.

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

Same response shape as **1.1**.

---

## 2. Full checkout (pay full amount)

### 2.1 Start checkout from internal cart

- **Method**: `POST`
- **Path**: `/cart/checkout`

Request:

```json
{
  "cartId": "cart_123"
}
```

Response:

```json
{
  "data": {
    "checkoutUrl": "https://yourshop.com/cart/c/abcd1234"
  },
  "error": null
}
```

Frontend behavior:

- On success: `window.location.href = checkoutUrl`.
- On error: show `error.message`.

---

## 3. Deposit (two‑step payment)

### 3.1 Create deposit session from internal cart

- **Method**: `POST`
- **Path**: `/deposit-sessions/create-from-cart`

Request:

```json
{
  "cartId": "cart_123",
  "customer_id": "gid://shopify/Customer/1234567890", // optional
  "cart": { "... optional snapshot of Cart as fallback ..." }
}
```

Response:

```json
{
  "data": {
    "deposit_session_url": "/deposit-session/deposit_1763906472737_ft4i1muw6ae",
    "session_id": "deposit_1763906472737_ft4i1muw6ae"
  },
  "error": null
}
```

### 3.2 Fetch deposit session details

- **Method**: `GET`
- **Path**: `/deposit-sessions/{sessionId}`

Response:

```json
{
  "data": {
    "session": {
      "session_id": "deposit_...",
      "items": [
        { "variantId": "gid://shopify/ProductVariant/...", "quantity": 1 }
      ],
      "total_amount": 3904.72,
      "deposit_amount": 1171.42,
      "remaining_amount": 2733.3,
      "created_at": "2024-05-01T12:34:56.000Z",
      "expires_at": "2024-05-02T12:34:56.000Z"
    }
  },
  "error": null
}
```

### 3.3 Start checkout for a deposit session

- **Method**: `POST`
- **Path**: `/deposit-sessions/{sessionId}/checkout`

Request body: `{}` (session id comes from path).

Response:

```json
{
  "data": {
    "checkoutUrl": "https://yourshop.com/cart/c/dep1234"
  },
  "error": null
}
```

Frontend:

- Deposit session page calls this and redirects the browser to `checkoutUrl`.

---

## 4. Order / partial payment status

### 4.1 Get order payment status

- **Method**: `GET`
- **Path**: `/orders/{orderId}`

Response:

```json
{
  "data": {
    "orderId": "gid://shopify/Order/123",
    "paymentStatus": "partial_paid",
    "depositAmount": 1000,
    "remainingAmount": 2904.72,
    "depositPaid": true,
    "remainingPaid": false,
    "paymentLink": "https://pay-link.example.com/abc123"
  },
  "error": null
}
```

Used by `/partial-payment/[orderId]` page to show timeline and “Pay remaining” button.


