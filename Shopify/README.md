# RITAMIE - E-commerce Frontend

A modern, headless e-commerce storefront built with Next.js 14 and Shopify Storefront API. This application powers the RITAMIE jewelry store, featuring lab-grown diamonds and jewelry products with advanced filtering, product management, and seamless checkout integration.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **API:** Shopify Storefront API (GraphQL)
- **State Management:** React Hooks
- **Deployment:** Vercel

## Features

- 🛍️ **Product Catalog** - Browse jewelry and diamonds with advanced filtering
- 🔍 **Search & Filter** - Filter by shape, price, carat, and other attributes
- 🛒 **Shopping Cart** - Integrated cart with Shopify checkout
- 📱 **Responsive Design** - Mobile-first, fully responsive UI
- ⚡ **Performance** - Server-side rendering and optimized images
- 🎨 **Modern UI** - Clean, professional interface with smooth animations
- 🔐 **Type Safety** - Full TypeScript support

## Prerequisites

- Node.js 18+ and npm
- A Shopify store (development store is fine)
- Shopify Storefront API access token

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Add your Shopify credentials:

```env
# Storefront API (required)
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-access-token

# Admin API (optional - for server-side operations)
SHOPIFY_ADMIN_API_KEY=your_admin_api_key
SHOPIFY_ADMIN_API_SECRET=your_admin_api_secret
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_access_token
SHOPIFY_ADMIN_API_VERSION=2024-01
```

See [Shopify Admin API Guide](./docs/SHOPIFY_ADMIN_API.md) for detailed setup instructions.

### 3. Get Shopify Storefront API Token

1. Go to Shopify Admin → **Settings** → **Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Navigate to **API credentials** tab
4. Under **Storefront API**, click **Configure**
5. Enable required scopes:
   - `unauthenticated_read_products`
   - `unauthenticated_read_product_listings`
   - `unauthenticated_write_checkouts`
6. Copy the **Storefront API access token**
7. Add it to your `.env.local` file

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── diamonds/          # Diamonds catalog page
│   ├── jewelry/           # Jewelry catalog page
│   ├── cart/              # Shopping cart page
│   └── layout.tsx         # Root layout
├── components/
│   ├── common/            # Shared components
│   ├── layouts/           # Layout components (Header, Footer)
│   ├── modules/           # Feature modules
│   ├── pages/             # Page-specific components
│   ├── products/          # Product-related components
│   └── ui/                # UI primitives (shadcn/ui)
├── hooks/                 # Custom React hooks
├── services/              # API service layer
│   └── shopify/          # Shopify API services
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── constants/             # Application constants
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

This project is configured for automatic deployment on Vercel.

#### Automatic Deployment

1. Push your code to the connected Git branch (usually `main`):
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Vercel will automatically:
   - Detect the new commit
   - Build and deploy automatically
   - Create preview deployments for each commit

#### Manual Deployment with Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

#### Environment Variables

Make sure to configure the following environment variables in Vercel Dashboard:

**Required:**
- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
- `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`

**Optional (for Admin API):**
- `SHOPIFY_ADMIN_API_KEY`
- `SHOPIFY_ADMIN_API_SECRET`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SHOPIFY_ADMIN_API_VERSION`

Go to **Settings** → **Environment Variables** in your Vercel project to add them.

## Documentation

### For Frontend/UX Developers
- **[Frontend API Guide](./docs/FRONTEND_API_GUIDE.md)** - Complete guide to using APIs, hooks, and components
- **[Frontend Hooks Guide](./docs/FRONTEND_HOOKS_GUIDE.md)** - All available React hooks with examples

### For Backend Developers
- **[Backend Integration Guide](./docs/BACKEND_INTEGRATION_GUIDE.md)** - Architecture, service layer, and future backend API integration
- **[API Architecture](./docs/API_ARCHITECTURE.md)** - System architecture, patterns, and design decisions

### Additional Resources
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Project folder structure and organization
- **[Metafields Setup](./docs/README_METAFIELDS.md)** - How to configure Shopify metafields
- **[Shopify Admin API Guide](./docs/SHOPIFY_ADMIN_API.md)** - Complete guide to Shopify Admin API integration

## External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Shopify Storefront API](https://shopify.dev/docs/api/storefront)
- [Vercel Deployment](https://vercel.com/docs)

## License

Private - All rights reserved
