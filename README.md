# The Questrian - Headless Shopify Storefront

A modern, headless e-commerce storefront for The Questrian marketplace, built with Next.js 14+ and Shopify Storefront API.

## 🎯 Project Overview

This project migrates The Questrian from a standard Shopify theme to a headless architecture with custom URL structures for SEO optimization and multi-vendor marketplace functionality.

### Key Features

- ✅ **Custom URL Structure**: `/{category}/{subcategory}/{product}` instead of `/products/*`
- ✅ **Canonical URL Management**: Products have primary collections with proper canonical tags
- ✅ **Multi-Vendor Ready**: Architecture prepared for Webkul integration
- ✅ **SEO Optimized**: Structured data, sitemaps, and metadata
- ✅ **Performance First**: Built on Next.js 14+ App Router with edge optimization
- ✅ **Type-Safe**: Full TypeScript implementation

## 🚀 Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **E-commerce**: Shopify Storefront API (GraphQL)
- **Caching**: Vercel KV / Redis (ready)
- **Hosting**: Vercel
- **Validation**: Zod

## 📁 Project Structure

```
the-equestrian-headless/
├── app/
│   ├── [category]/
│   │   ├── [subcategory]/
│   │   │   ├── [product]/page.tsx    # Product page
│   │   │   └── page.tsx               # Subcategory page
│   │   └── page.tsx                   # Category page
│   ├── [product]/page.tsx             # Fallback product page
│   ├── api/
│   │   ├── redirect/                  # URL redirect handlers
│   │   ├── shopify/                   # Shopify API routes
│   │   ├── vendors/                   # Multi-vendor API (future)
│   │   └── yotpo/                     # Reviews API (future)
│   ├── layout.tsx
│   ├── page.tsx                       # Homepage
│   └── globals.css
├── lib/
│   ├── shopify/
│   │   ├── client.ts                  # GraphQL client
│   │   ├── queries.ts                 # Shopify queries
│   │   ├── products.ts                # Product utilities
│   │   └── collections.ts             # Collection utilities
│   ├── utils/                         # Helper functions
│   └── env.ts                         # Environment validation
├── types/
│   └── shopify.ts                     # TypeScript types
├── components/                        # React components (future)
├── middleware.ts                      # URL redirects
└── package.json
```

## 🛠️ Setup Instructions

### 1. Environment Variables

Copy the environment template and fill in your credentials:

```bash
# See env.config.md for the full template
cp env.config.md .env.local
```

Required variables:
- `SHOPIFY_STORE_DOMAIN`: Your Shopify store domain
- `SHOPIFY_STOREFRONT_ACCESS_TOKEN`: Storefront API token
- `NEXT_PUBLIC_SITE_URL`: Your production URL

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Shopify

#### Create Metafields

In Shopify Admin, create these custom metafields:

**Products:**
```
Namespace: custom
Key: primary_collection
Type: single_line_text_field
Value format: "category-handle/subcategory-handle"
```

**Collections:**
```
Namespace: custom
Key: parent_collection
Type: single_line_text_field
Value: "parent-collection-handle"
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔄 URL Structure

### New URL Pattern

```
OLD: /products/leather-saddle-pad
NEW: /saddle-pads/leather/leather-saddle-pad

OLD: /collections/saddle-pads
NEW: /saddle-pads
```

### How It Works

1. **Primary Collection Metafield**: Each product has a `primary_collection` metafield that determines its canonical URL
2. **Route Resolution**: Dynamic routes match `/{category}/{subcategory}/{product}` patterns
3. **Canonical Redirects**: If a product is accessed via a non-canonical URL, it redirects (301) to the primary URL
4. **Fallback Route**: Products without `primary_collection` are accessible at `/{product-handle}`

### Example

```
Product: "Leather Jumping Saddle Pad"
Primary Collection: "saddle-pads/jumping-pads"

Canonical URL:
/saddle-pads/jumping-pads/leather-jumping-saddle-pad

Alternative URLs (redirect to canonical):
/all-leather-products/pads/leather-jumping-saddle-pad
/brown-gear/pads/leather-jumping-saddle-pad
```

## 📊 Data Flow

```
User Request
    ↓
Next.js Middleware (checks for old URLs)
    ↓
Dynamic Route Handler
    ↓
Shopify GraphQL Client
    ↓
Shopify Storefront API
    ↓
Response with Product/Collection Data
    ↓
Render Page with SEO Metadata
```

## 🔌 API Routes

### Shopify Integration

- `GET /api/shopify/products/[handle]` - Get product with vendor data
- `GET /api/shopify/collections/[handle]` - Get collection with products

### Redirects

- `GET /api/redirect/product/[handle]` - Dynamic product redirect resolver

### Future Endpoints

- `/api/vendors/*` - Multi-vendor data
- `/api/yotpo/*` - Reviews integration
- `/api/webhooks/*` - Shopify webhooks

## 🎨 Customization

### Adding New Routes

Create new dynamic routes in the `app/` directory:

```typescript
// app/vendors/[vendor]/page.tsx
export default async function VendorPage({ params }) {
  // Vendor page logic
}
```

### Modifying Queries

Edit GraphQL queries in `lib/shopify/queries.ts`:

```typescript
export const GET_CUSTOM_DATA = `
  query GetCustomData {
    // Your custom query
  }
`;
```

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

```bash
# Or use Vercel CLI
vercel --prod
```

### Post-Deployment

1. Set up Vercel KV for caching
2. Configure Shopify webhooks
3. Test redirect URLs
4. Submit sitemap to Google Search Console

## 📋 Development Phases

### ✅ Phase 1: Foundation (Current)
- [x] Next.js project setup
- [x] Shopify Storefront API integration
- [x] Custom URL routing structure
- [x] Canonical URL logic
- [x] Basic product/collection pages

### 🔄 Phase 2: Multi-Vendor Integration (Next)
- [ ] Webkul API integration
- [ ] Vendor data caching
- [ ] Vendor display on product pages
- [ ] Order attribution

### 📅 Phase 3: Reviews & Content
- [ ] Yotpo API integration
- [ ] Review components
- [ ] Star ratings
- [ ] Review submission

### 📅 Phase 4: Redirects & SEO
- [ ] Generate redirect mapping
- [ ] Comprehensive redirect testing
- [ ] Dynamic sitemap
- [ ] Structured data
- [ ] Performance optimization

### 📅 Phase 5: Launch
- [ ] Testing & QA
- [ ] Performance audit
- [ ] SEO audit
- [ ] Production deployment

## 🐛 Troubleshooting

### Common Issues

**GraphQL Errors:**
- Verify `SHOPIFY_STOREFRONT_ACCESS_TOKEN` is correct
- Check API version in `lib/shopify/client.ts`

**Build Errors:**
- Ensure all environment variables are set
- Run `npm install` to update dependencies

**Routing Issues:**
- Check metafield values in Shopify
- Verify collection hierarchy

## 📚 Resources

### Documentation
- [Scripts and Automation Wiki](./SCRIPTS-AND-AUTOMATION-WIKI.md) - Complete guide to all scripts and cron jobs
- [Scripts Quick Reference](./SCRIPTS-QUICK-REFERENCE.md) - Quick command reference
- [Product Bullet Points System](./PRODUCT-BULLET-POINTS-SYSTEM.md) - AI-powered bullet points
- [Master Content Generator](./MASTER-CONTENT-GENERATOR-V2.md) - Collection content generation
- [Project Brief](./shopify-headless-migration-brief.md) - Original technical brief

### External Resources
- [Shopify Storefront API Docs](https://shopify.dev/docs/api/storefront)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Vercel Deployment Docs](https://vercel.com/docs)

## 📝 License

Private - The Questrian

---

**Need Help?** Refer to the [technical brief](./shopify-headless-migration-brief.md) for detailed requirements and architecture decisions.
