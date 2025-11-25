## External Diamonds, Internal Cart, and Deposit Flow

This document explains the current implementation so backend, frontend, and DB engineers can work in sync.

- **Section 1**: External feed → internal cart → Shopify checkout (full payment).
- **Section 2**: Deposit flow (two‑step payment) and how it reuses the same cart data.
- **Section 3**: Recommended database tables to persist the in‑memory state.
- **Section 4**: Possible improvements and refactors.

---

## 1. Flow: Add external feed product to cart → checkout (full amount)

### 1.1. High‑level behavior

- External diamonds come from a **feed**, not from your Shopify catalog.
- We use **one dummy product per source type** (e.g. labgrown / natural) and create **one Shopify variant per external diamond**.
- Your app **does not use Shopify cart as source of truth**. Instead:
  - You add items into your **internal cart** (`internalCartStorage` + `/api/internal-cart`).
  - At “Pay Full Amount”, you build a Shopify cart **on demand** from that internal cart and redirect to Shopify checkout.

### 1.2. When user clicks “Add to Cart” for an external diamond

Frontend (examples: `InlineProductDetail`, `ProductCard`, `ProductDetailDemo`):

- Detects an **external product** from feed data / collection.
- Calls `useCart().addToCart` with:
  - `source: 'external'`
  - `externalId` (feed `external_id`)
  - `imageUrl`, `price`, `currency`, `title`, `attributes`, `payload` (full feed object).
- `addToCart` in `cartStore` sends a `POST` to:

```http
POST /api/internal-cart/items
```

Payload includes all the above fields plus the internal `cartId` (if any).

### 1.3. `/api/internal-cart/items` (server)

File: `app/api/internal-cart/items/route.ts`

Steps for `source === 'external'`:

1. **Load or create internal cart** (`InternalCartStorage`):
   - If `cartId` provided and found → use it.
   - Else → generate new `cart_<timestamp>_<random>` and create an empty cart.

2. **Enforce one‑per‑cart for diamonds (hold)**
   - Determine `effectiveExternalId` from:
     - `externalId` field, or
     - `_external_id` attribute.
   - If any existing `cart.items` (source `'external'`) has the same external id → return 400:
     - “This diamond is already in your cart and is currently on hold.”

3. **Admin: find/create dummy product & variant early**
   - Determine source type (`labgrown` / `natural`) from attributes (`_source_type`) or collection.
   - Get numeric price from `price.amount`.
   - `externalCartService.findDummyProduct(sourceType)`:
     - Tries in‑memory cache (`externalDiamondCache`).
     - Otherwise, finds via metafield `custom.source_type == labgrown|natural`.
     - If not found, creates a new dummy product with **metafields** and `ACTIVE` status.
   - `externalCartService.findOrCreateVariant(productId, externalId, price, title, imageUrl, payload)`:
     - Uses a **SKU‑based** scheme:
       - `sku = EXT-<external_id>`
       - For new variants, uses `option1 = externalId` to avoid “Default Title already exists” errors.
     - Creates variant via REST (`createVariantRest`):
       - Sets price.
       - Sets SKU and option1.
     - For new or existing variants, runs in parallel:
       - `setVariantInventory(variantId, 1)` → quantity 1 at location.
       - `adminProductService.publishProductToOnlineStore(productId)` → publish to Online Store + Storefront API.
       - `setVariantMetafields(variantId, payload, ...)` → stores:
         - `custom.payload` (full feed JSON)
         - `custom.carat`, `custom.color`, `custom.clarity`, etc.
     - Caches `(externalId → { productId, variantId })` for 1 hour in `externalDiamondCache`.
   - Result: we get a **real Shopify variant GID** for this diamond and store it as `variantId` for the internal cart item.

4. **Save item in internal cart**
   - Create `InternalCartItem`:
     - `id` (line id) – random string `line_<timestamp>_<random>`.
     - `source: 'external'`.
     - `variantId`: Shopify variant GID for this external diamond.
     - `externalId`: the feed id.
     - `quantity`, `price`, `title`, `imageUrl`, `handle` (if any).
     - `attributes`: includes `_external_id`, diamond specs, etc.
     - `payload`: full external feed JSON.
   - Append to `InternalCart`, save, and return a **transformed cart** (`Cart` type) to the frontend.

5. **Frontend updates state & opens cart side panel**
   - `useCartStore` receives the `Cart` object and sets global cart state.
   - The right‑side cart panel opens, showing the external diamond as a line item.

### 1.4. Full‑amount checkout (`/api/checkout`)

When the user chooses **“Pay Full Amount”**:

- Frontend (cart page or side panel):
  - Reads internal `cartId` from store.
  - Sends:

```http
POST /api/checkout
{
  "cartId": "<internal_cart_id>",
  "cart": { ... }  // snapshot as fallback
}
```

Backend (`app/api/checkout/route.ts`):

1. **Build Shopify lines**:
   - `buildShopifyLinesFromInternalCart(cartId)`:
     - Reads internal cart from `InternalCartStorage`.
     - For each item:
       - If `source: 'external'` and `variantId` is already a real Shopify GID → use that.
       - If `variantId` still looks like a temp ID (legacy) → calls `findOrCreateVariant` again.
     - Returns `{ lines, totalAmount, currencyCode }` in Storefront `CartLineInput` format.
   - If internal cart is gone but `cart` snapshot is provided → `buildShopifyLinesFromCartSnapshot` rebuilds the same lines.

2. **Pre‑flight availability check**:
   - Before creating Shopify cart, calls a Storefront `nodes` query:
     - Verifies each variant `availableForSale` and `quantityAvailable > 0` (with retries).
   - If some variants are still not available after retries → returns 409 with a helpful error instead of sending the user to a broken checkout.

3. **Create Shopify cart for checkout**:
   - `cartService.createCartWithLines({ lines })` → Storefront `cartCreate` mutation.
   - Returns `checkoutUrl` and full cart structure (for logging).

4. **Redirect user to Shopify checkout**:
   - Frontend sets `window.location.href = checkoutUrl`.

Outcome: **external diamonds + normal Shopify products** are all converted into Shopify cart lines *once*, at checkout time, using your **internal cart** as source of truth.

---

## 2. Flow: Deposit (two‑step payment)

The deposit system uses the **same internal cart** as source of truth, but instead of sending full lines to checkout, it:

1. Creates a **draft order** (Admin API) from the internal cart.
2. Creates a **per‑session “deposit” variant** on a dedicated Deposit product.
3. Sends the customer to Shopify checkout for **that deposit variant** only.
4. Later, completes the draft order and records a manual transaction for the deposit and a payment link / remaining payment.

### 2.1. Step 1 – Create deposit session from internal cart

Endpoint: `POST /api/deposit-session/create-from-cart`  
File: `app/api/deposit-session/create-from-cart/route.ts`

Input:

```json
{
  "cartId": "<internal_cart_id>",
  "customer_id": "<optional_shopify_customer_gid>",
  "cart": { ...cartSnapshot },          // optional fallback
  "plan": "<optional_deposit_plan_id>"  // future extension
}
```

Flow:

1. **Build Shopify lines from internal cart** (same as full checkout):
   - Uses `buildShopifyLinesFromInternalCart(cartId)` or snapshot.
2. **Guardrails**:
   - If error or no lines → 400.
3. **Compute deposit amounts**:
   - Currently: `depositAmount = max(totalAmount * 0.3, 50)`.
   - `remainingAmount = totalAmount - depositAmount`.
4. **Create Shopify Draft Order**:
   - Calls `partialPaymentService.createDepositSession(request)`:
     - Internally: `adminOrderService.createDraftOrder` with:
       - `lineItems` = `[ { variantId, quantity } ]` from internal cart.
       - `customerId` if provided.
       - `tags`: `['partial-payment']` (kept short to avoid Shopify tag length limits).
       - `customAttributes`: `[ { key: 'session_id', value: sessionId } ]`.
     - Persists a `DepositSession` in `depositSessionStorage`:
       - `session_id`, `items`, `total_amount`, `deposit_amount`, `remaining_amount`, `draft_order_id`, timestamps.
5. **Return deposit session URL**:
   - Response:

```json
{
  "deposit_session_url": "/deposit-session/<sessionId>",
  "session_id": "<sessionId>"
}
```

### 2.2. Step 2 – Deposit session page

Route: `app/deposit-session/[sessionId]/page.tsx`  
Backend: `GET /api/deposit-session/[sessionId]`

- Loads `DepositSession` from `depositSessionStorage`.
- Displays:
  - Total amount.
  - Deposit amount.
  - Remaining amount.
  - Item count.
- Button **“Pay Deposit $X”** calls:

```http
POST /api/deposit-session/[sessionId]/checkout
```

### 2.3. Step 3 – Create per‑session deposit variant & checkout

Endpoint: `POST /api/deposit-session/[sessionId]/checkout`  
Service: `partialPaymentService.createDepositCheckout(sessionId)`

Flow inside `createDepositCheckout`:

1. **Load session** by `sessionId` from `depositSessionStorage`.
2. **Use a dedicated Deposit product**:
   - Env: `SHOPIFY_DEPOSIT_PRODUCT_ID` = `gid://shopify/Product/...`.
3. **Create a new variant per deposit session** (REST):
   - Uses `createVariantRest(depositProductId, { price, sku, option1 })`:
     - `price` = `session.deposit_amount.toFixed(2)`.
     - `sku` = `DEP-<short_session_id>`.
     - `option1` = `DEP-<short_session_id>` (ensures uniqueness).
4. **Inventory & publishing**:
   - Parallel:
     - `setVariantInventory(variant.id, 1)`.
     - `adminProductService.publishProductToOnlineStore(depositProductId)`.
5. **Metafields on the deposit variant**:
   - Writes JSON into `custom.deposit` (type `json`) on the deposit variant:

```json
{
  "session_id": "...",
  "total_amount": ...,
  "deposit_amount": ...,
  "remaining_amount": ...,
  "items": [
    { "variantId": "...", "quantity": 1 }
  ]
}
```

6. **Wait for Storefront availability**:
   - Polls Storefront API (`CheckDepositVariant` query) for up to 4 * 1.5s:
     - Ensures `availableForSale == true` and `quantityAvailable > 0`.
   - Reduces “item no longer available / removed from cart” popups right after redirect.

7. **Add line attributes for checkout UI**:
   - Builds a human‑readable summary:

```text
Deposit for:
Item 1: variant <gid> x1
...
Total order amount: <total>
Remaining balance: <remaining>
Pay today: <deposit>
```

   - Creates a Shopify cart via `cartService.createCart` with:

```ts
{
  variantId: variant.id,
  quantity: 1,
  attributes: [
    { key: 'deposit_summary', value: summaryText },
    { key: 'deposit_session_id', value: session.session_id },
    { key: 'deposit_total', value: session.deposit_amount.toFixed(2) },
    { key: 'deposit_remaining', value: session.remaining_amount.toFixed(2) },
  ]
}
```

   - These attributes appear as line item “properties” on Shopify checkout and on the final order line.

8. **Return checkout URL**:

```json
{ "checkoutUrl": "https://yourstore.com/cart/..." }
```

Frontend then redirects to this URL; the deposit line clearly shows summary, pay‑today, remaining, etc.

### 2.4. Step 4 – Completing deposit and paying remaining (high level)

You already have skeletons for:

- `partialPaymentService.completeDepositOrder(sessionId)`:
  - Completes the Draft Order → real Order.
  - Logs a manual transaction for `deposit_amount`.
  - Writes metafields on the Order (`partial.deposit_amount`, `partial.remaining_amount`, `partial.payment_status`, etc.).
  - Creates a payment link for the remaining amount via Admin API (simplified now).
- `POST /api/deposit-session/...` webhooks for `deposit_paid` and `balance_paid` would:
  - Call `completeDepositOrder` for deposit.
  - Log and mark remaining as paid when final payment is done.

These webhooks can log into your existing `payments` table with:

- `payment_type = DEPOSIT | REMAINING | FULL`.
- `session_id`, `order_id`, `transaction_id`, `amount`, etc.

---

## 3. Database tables to prepare

Your current implementation uses **in‑memory** stores (`InternalCartStorage`, `DepositSessionStorage`). For production and durability, your DB engineer should design tables to mirror these structures.

### 3.1. `carts`

Internal cart source of truth.

- `id` (string) – internal cart id (`cart_...`), PK.
- `customer_id` (nullable string) – Shopify customer GID or your own user id.
- `status` (enum) – `active | converted | abandoned | cancelled`.
- `currency` (string, optional).
- `created_at`, `updated_at`.
- Optional:
  - `shopify_cart_id` (nullable string) – when full‑amount checkout is created.

### 3.2. `cart_items`

Lines in the internal cart.

- `id` (string / UUID) – matches `InternalCartItem.id`.
- `cart_id` (FK → `carts.id`).
- `source` (`shopify` | `external`).
- `variant_id` (nullable string) – Shopify variant GID.
- `external_id` (nullable string) – external feed id.
- `quantity` (int).
- `price_amount` (decimal).
- `price_currency` (string).
- `title` (string).
- `image_url` (string).
- `handle` (nullable string).
- `attributes` (JSON) – includes `_external_id`, diamond metadata, etc.
- `payload` (JSON) – full feed document for external diamonds.

### 3.3. `deposit_plans` (for multiple deposit options)

Configuration for allowed deposit plans (future enhancement).

- `id` (string) – e.g. `plan_30_percent`.
- `name` (string) – display name (“Pay 30% deposit”).
- `description` (string, optional).
- `type` (enum) – `PERCENTAGE | FIXED | HYBRID`.
- `percentage` (decimal, nullable).
- `fixed_amount` (decimal, nullable).
- `min_deposit` (decimal, nullable).
- `max_deposit` (decimal, nullable).
- `is_default` (boolean).
- `active` (boolean).
- `created_at`, `updated_at`.

Your backend can then:

- Load `deposit_plans`.
- Compute `deposit_amount` from `total_amount` + `plan` row.
- Store `plan_id` in `DepositSession` + order metafields.

### 3.4. `deposit_sessions`

Durable version of `DepositSession` (currently in memory).

- `session_id` (string, PK) – e.g. `deposit_1763906472737_ft4i1muw6ae`.
- `cart_id` (nullable FK → `carts.id`) – the internal cart snapshot this deposit was based on.
- `customer_id` (nullable string).
- `plan_id` (nullable FK → `deposit_plans.id`).
- `items` (JSON) – `[ { variantId, quantity } ]` or normalized via a join table.
- `total_amount` (decimal).
- `deposit_amount` (decimal).
- `remaining_amount` (decimal).
- `draft_order_id` (string) – Shopify Draft Order GID.
- `checkout_url` (nullable string) – deposit checkout URL, if you want to store it.
- `created_at`, `expires_at` (datetime).
- Optional flags:
  - `deposit_paid` (bool).
  - `remaining_paid` (bool).

### 3.5. `payments` (existing table)

Instead of a custom partial payments log table, you can use your existing `payments` table with a few extra fields:

Recommended fields:

- `id` (PK).
- `session_id` (nullable string) – FK → `deposit_sessions.session_id`.
- `cart_id` (nullable FK → `carts.id`).
- `shopify_order_id` (nullable string) – final order GID.
- `shopify_transaction_id` (nullable string).
- `payment_type` (enum) – `DEPOSIT | REMAINING | FULL`.
- `plan_id` (nullable FK → `deposit_plans.id`).
- `amount` (decimal).
- `currency` (string).
- `created_at`, `updated_at`.
- Optional: `raw_payload` (JSON) for webhook or API payload.

---

## 4. Improvements & refactoring ideas

This section is for future cleanup and enhancements once the core flow is stable.

### 4.1. Persist internal cart & deposit sessions in DB

**Current**: `InternalCartStorage` and `DepositSessionStorage` are in‑memory Maps with TTL.  
**Issue**: Data is lost on server restart / deployment; doesn’t scale to multiple instances.

**Better**:

- Implement repository functions that read/write the `carts`, `cart_items`, and `deposit_sessions` tables.
- Keep the in‑memory stores as a short‑term cache (optional), not the source of truth.
- Webhooks (`deposit_paid`, `balance_paid`) should always read from the DB, not in‑memory state.

### 4.2. Normalize external diamond metadata usage


