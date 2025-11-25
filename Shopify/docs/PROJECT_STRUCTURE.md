# Project Structure

This project follows a clean, organized folder structure based on the Figma design for the Jewelry E-commerce Store.

## Folder Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes
│   │   └── checkout/      # Checkout API endpoint
│   ├── cart/              # Cart page
│   ├── diamonds/          # Diamonds collection page
│   ├── jewelry/           # Jewelry collection page
│   ├── products/          # Product detail pages
│   │   └── [handle]/      # Dynamic product pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles with Tailwind
│
├── components/             # React components
│   ├── ui/                # Reusable UI components (shadcn/ui style)
│   │   ├── button.tsx
│   │   └── card.tsx
│   ├── common/            # Common shared components
│   │   ├── Header.tsx
│   │   ├── ProductCard.tsx
│   │   ├── HeroBanner.tsx
│   │   └── AddToCartButton.tsx
│   ├── filters/           # Filter components
│   ├── products/          # Product-specific components
│   ├── forms/             # Form components
│   ├── modals/            # Modal components
│   ├── account/           # Account-related components
│   └── pages/             # Page-level components
│
├── lib/                   # Library code and utilities
│   └── shopify/           # Shopify Storefront API
│       ├── client.ts      # GraphQL client
│       ├── queries/       # GraphQL queries organized by domain
│       ├── services/      # Service layer for API operations
│       ├── types.ts       # Shopify-specific types
│       └── index.ts       # Main entry point
│
├── services/              # Service wrappers (backward compatibility)
│   └── shopify/           # Re-exports from lib/shopify/services/
│
├── types/                 # TypeScript type definitions
│   └── shopify.ts         # Shopify-related types
│
├── hooks/                 # Custom React hooks
│
└── utils/                 # Utility functions
    └── cn.ts              # className utility (Tailwind merge)

```

## Key Features

### Pages
- **Home** (`/`) - Hero banner + featured products
- **Jewelry** (`/jewelry`) - Jewelry collection
- **Diamonds** (`/diamonds`) - Diamonds collection
- **Product Detail** (`/products/[handle]`) - Individual product pages
- **Cart** (`/cart`) - Shopping cart page

### Components
- **Header** - Navigation with logo, menu, search, user, and cart
- **HeroBanner** - Hero section with call-to-action buttons
- **ProductCard** - Reusable product card component
- **AddToCartButton** - Add to cart functionality

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library style
- **Responsive Design** - Mobile-first approach

## Design System

Based on the Figma design, the project uses:
- Modern, clean UI with Tailwind CSS
- shadcn/ui component patterns
- Responsive grid layouts
- Professional jewelry store aesthetic

## Next Steps

To add more features from the Figma design:
1. Add filter components in `components/filters/`
2. Add account pages in `app/account/`
3. Add modal components in `components/modals/`
4. Add form components in `components/forms/`

