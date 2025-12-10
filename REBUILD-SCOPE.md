# Rebuild Scope: Cart, Blog, and Advanced Features

## Overview
This document outlines the complete rebuild of features that were implemented but not committed to git. Each feature will be built incrementally with git commits after each major milestone.

---

## Phase 1: Cart System Implementation

### 1.1 Update GraphQL Queries for Cart
**File:** `lib/shopify/queries.ts`

- Update `CREATE_CART` mutation to include full product details in merchandise fragment:
  - `product { handle, title, images(first: 1) { edges { node { url, altText } } } }`
- Update `ADD_TO_CART` mutation with same merchandise fragment
- Update `UPDATE_CART` mutation with same merchandise fragment  
- Update `REMOVE_FROM_CART` mutation with same merchandise fragment
- Add `GET_CART` query with full product details

**Commit:** `feat: Add cart GraphQL queries with full product details`

---

### 1.2 Create Server Actions for Cart
**File:** `app/actions/cart.ts`

Create server actions for:
- `createCart(lineItems)` - Create new cart
- `addToCart(cartId, lines)` - Add items to cart
- `updateCart(cartId, lines)` - Update cart quantities
- `removeFromCart(cartId, lineIds)` - Remove items from cart
- `getCart(cartId)` - Fetch cart by ID

All actions should:
- Use `'use server'` directive
- Call `shopifyFetch()` from `lib/shopify/client.ts`
- Return typed `ShopifyCart` objects
- Handle errors gracefully

**Commit:** `feat: Add server actions for cart operations`

---

### 1.3 Create Cart Context
**File:** `components/cart/cart-context.tsx`

Create React Context with:
- State: `cart`, `isOpen`, `isLoading`
- Methods: `addCartItem()`, `updateCartItem()`, `removeCartItem()`, `openCart()`, `closeCart()`
- LocalStorage persistence for `cartId`
- Auto-fetch cart on mount if `cartId` exists
- Auto-create cart if none exists

**Commit:** `feat: Add cart context with localStorage persistence`

---

### 1.4 Create Cart Drawer Component
**File:** `components/cart/CartDrawer.tsx`

Client component with:
- Slide-out drawer UI (fixed right, z-50)
- List of cart items with:
  - Product image, title, variant
  - Quantity controls (+/- buttons)
  - Remove button
  - Line total
- Subtotal display
- "Checkout" button linking to `cart.checkoutUrl`
- Empty state message
- Close button (X)

**Styling:**
- Pink accent color for buttons
- Smooth transitions
- Responsive design

**Commit:** `feat: Add cart drawer component`

---

### 1.5 Create Full Cart Page
**Files:** 
- `components/cart/CartPageContent.tsx`
- `app/cart/page.tsx`

Full-page cart view with:
- Same functionality as drawer but full-width layout
- Breadcrumbs
- "Continue Shopping" link
- Larger product images
- Better spacing for desktop

**Commit:** `feat: Add full-page cart view`

---

### 1.6 Create Add to Cart Button
**File:** `components/product/AddToCartButton.tsx`

Client component with:
- `useCart()` hook integration
- Loading state
- Success state (pink background, checkmark, 2s duration)
- Error handling
- Disabled state when no variant selected

**Commit:** `feat: Add AddToCartButton component`

---

### 1.7 Create Buy Now Button
**File:** `components/product/BuyNowButton.tsx`

Client component with:
- Add to cart + immediate redirect to checkout
- Distinct styling (white bg, pink border)
- Loading state
- Error handling

**Commit:** `feat: Add BuyNowButton component`

---

### 1.8 Create Product Buy Box
**File:** `components/product/ProductBuyBox.tsx`

Client component orchestrating:
- Variant selection (ProductVariantSelector)
- Price display (with compare-at price)
- AddToCartButton
- BuyNowButton
- Out of stock messaging

**Commit:** `feat: Add ProductBuyBox component`

---

### 1.9 Update Product Variant Selector
**File:** `components/ProductVariantSelector.tsx`

Refactor to be a controlled component:
- Accept `selectedOptions` and `onOptionSelect` props
- Remove internal state
- Emit changes to parent

**Commit:** `refactor: Make ProductVariantSelector a controlled component`

---

### 1.10 Update Product Page
**File:** `app/products/[handle]/page.tsx`

Replace static price/variant/button section with:
```tsx
<ProductBuyBox product={product} />
```

**Commit:** `feat: Integrate ProductBuyBox into product pages`

---

### 1.11 Integrate Cart into Layout
**File:** `app/layout.tsx`

- Import `CartProvider` and `CartDrawer`
- Wrap `{children}` with `<CartProvider>`
- Add `<CartDrawer />` after children

**Commit:** `feat: Integrate cart system into app layout`

---

## Phase 2: Blog/News System Implementation

### 2.1 Add Blog Types
**File:** `types/shopify.ts`

Add interfaces:
```typescript
export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyAuthor {
  name: string;
  // Note: Shopify Storefront API doesn't support bio or image
}

export interface ShopifyArticle {
  id: string;
  handle: string;
  title: string;
  contentHtml: string;
  excerpt?: string;
  excerptHtml?: string;
  publishedAt: string;
  image?: ShopifyImage | null;
  seo?: {
    title?: string;
    description?: string;
  };
  tags: string[];
  author: ShopifyAuthor;
  blog: {
    handle: string;
  };
}

export interface ShopifyBlog {
  handle: string;
  title: string;
  articles: {
    edges: Array<{
      node: ShopifyArticle;
    }>;
  };
}
```

**Commit:** `feat: Add blog types to Shopify type definitions`

---

### 2.2 Add Blog GraphQL Queries
**File:** `lib/shopify/queries.ts`

Add queries:
```graphql
ARTICLE_FRAGMENT - Full article fields (no author.bio or author.image)
GET_BLOG_BY_HANDLE - Fetch blog with articles
GET_ARTICLE_BY_HANDLE - Fetch single article
GET_RECENT_ARTICLES - Fetch N most recent articles
GET_ALL_BLOGS - Fetch all blogs (for llms.txt)
```

**Commit:** `feat: Add blog GraphQL queries`

---

### 2.3 Create Blog Helper Functions
**File:** `lib/shopify/blogs.ts`

Create functions:
- `getBlogs()` - Fetch all blogs
- `getBlog(handle)` - Fetch blog by handle
- `getArticle(blogHandle, articleHandle)` - Fetch article
- `getArticlesByAuthor(authorName)` - Fetch articles by author (client-side filter)

**Commit:** `feat: Add blog helper functions`

---

### 2.4 Create Blog Card Component
**File:** `components/blog/BlogCard.tsx`

Server component displaying:
- Article image (Next.js Image)
- Title
- Excerpt (truncated)
- Author name
- Published date (formatted)
- Link to article

**Styling:** Consistent with product cards

**Commit:** `feat: Add BlogCard component`

---

### 2.5 Create Blog Listing Page
**File:** `app/news/page.tsx`

Server component with:
- Fetch 'news' blog
- Grid layout (3 columns desktop, 2 tablet, 1 mobile)
- BlogCard for each article
- Page title: "What we're talking about"
- Metadata (title, description)

**Commit:** `feat: Add blog listing page at /news`

---

### 2.6 Add Article Content Styling
**File:** `app/globals.css`

Add `.article-content` class with:
- Paragraph spacing: `mb-6`
- H1: `text-4xl font-bold mb-6`
- H2: `text-3xl font-bold mb-5 mt-8`
- H3: `text-2xl font-semibold mb-4 mt-6`
- H4: `text-xl font-semibold mb-3 mt-5`
- Links: `text-[#E91E8C] underline hover:text-[#d01a7d]`
- Links in `<strong>`: Override to pink
- Images/Videos: `rounded-lg my-8`
- Tables: Border, padding, hover effects
- Lists: Proper spacing

**Commit:** `feat: Add article content styling`

---

### 2.7 Create Author Box Component
**File:** `components/blog/AuthorBox.tsx`

Server component with:
- Generated avatar (initials in circle)
- Author name (as link to author page)
- "View all articles by {name} →" link
- Border, padding, clean design

**Commit:** `feat: Add AuthorBox component`

---

### 2.8 Create Article Page
**File:** `app/news/[handle]/page.tsx`

Server component with:
- Fetch article from 'news' blog
- `generateMetadata()` using article SEO fields
- Hero image (if exists)
- Title (H1)
- Author and date
- Content with `.article-content` class
- AuthorBox below content
- Related posts sidebar (3 most recent articles, excluding current)
- Dynamic JSON-LD schema (to be added in Phase 3)

**Commit:** `feat: Add article detail pages`

---

### 2.9 Create Author Archive Page
**File:** `app/news/author/[slug]/page.tsx`

Server component with:
- Fetch all articles, filter by author name
- Display author info (generated avatar, name)
- Grid of BlogCards for author's articles
- Metadata

**Commit:** `feat: Add author archive pages`

---

### 2.10 Add Recent Articles to Homepage
**File:** `components/home/HomeRecentArticles.tsx`

Server component:
- Fetch 6 most recent articles from 'news' blog
- Grid layout (3 columns)
- Use BlogCard component

**File:** `app/page.tsx`
- Replace static "News" section with `<HomeRecentArticles />`

**Commit:** `feat: Add recent blog posts to homepage`

---

## Phase 3: Advanced SEO Features

### 3.1 Add Image Domain to Next.js Config
**File:** `next.config.ts`

Add to `images.remotePatterns`:
```typescript
{
  protocol: 'https',
  hostname: 'cdn.shopify.com',
  pathname: '/**',
}
```

**Commit:** `fix: Add Shopify CDN to Next.js image config`

---

### 3.2 Create Dynamic Schema Generator
**File:** `lib/schema-generator.ts`

Create function `generateArticleSchema(article)` that:
- Parses `contentHtml` for:
  - H2 tags → `articleSection`
  - External links → `citation`
  - Internal links → `mentions`
- Combines tags + title words → `keywords` and `about`
- Returns JSON-LD `BlogPosting` schema with:
  - `@context`, `@type`
  - `headline`, `description`, `author`, `datePublished`, `dateModified`
  - `image`, `publisher`, `mainEntityOfPage`
  - `articleSection`, `keywords`, `about`, `citation`, `mentions`
  - `speakable` with `cssSelector: [".article-content h1", ".article-content h2"]`

**Commit:** `feat: Add dynamic article schema generator based on Google NLP patents`

---

### 3.3 Integrate Schema into Article Pages
**File:** `app/news/[handle]/page.tsx`

- Import `generateArticleSchema`
- Generate schema from article
- Add `<script type="application/ld+json">` to page

**Commit:** `feat: Integrate dynamic schema into article pages`

---

### 3.4 Create Dynamic llms.txt Route
**File:** `app/llms.txt/route.ts`

Dynamic route handler that:
- Fetches all collections (top-level categories)
- Fetches 10 recent articles
- Fetches all products (handles + titles only)
- Formats as Markdown:
  ```
  # The Equestrian - theequestrian.com.au
  
  ## Collections
  - [Title](URL)
  
  ## Recent Articles
  - [Title](URL)
  
  ## Products
  - [Title](URL)
  ```
- Returns as `text/plain`
- Implements revalidation (ISR, 1 hour)

**Commit:** `feat: Add dynamic llms.txt for AI crawlers`

---

### 3.5 Add Noindex to Site
**File:** `app/layout.tsx`

Update metadata:
```typescript
export const metadata: Metadata = {
  title: 'The Equestrian - Premium Equestrian Equipment',
  description: 'Everything you need for horse and rider.',
  robots: {
    index: false,
    follow: false,
  },
};
```

**Commit:** `feat: Add noindex to entire site for staging`

---

## Phase 4: Testing & Verification

### 4.1 Manual Testing Checklist
- [ ] Add product to cart from product page
- [ ] Open cart drawer, verify product displays with image
- [ ] Update quantity in cart drawer
- [ ] Remove item from cart drawer
- [ ] Navigate to /cart page, verify full cart view
- [ ] Click checkout button, verify Shopify checkout loads
- [ ] Buy Now button redirects to checkout immediately
- [ ] Navigate to /news, verify blog listing
- [ ] Click article, verify content renders with proper styling
- [ ] Verify H1, H2, H3 have distinct sizes
- [ ] Verify links are pink with underline
- [ ] Verify images have border radius
- [ ] Click author name, verify author archive page
- [ ] Verify homepage shows 6 recent articles
- [ ] Verify /llms.txt loads and shows collections/articles/products
- [ ] Verify all pages have noindex meta tag

### 4.2 Final Commit
**Commit:** `chore: Complete cart, blog, and SEO feature rebuild`

---

## Git Commit Strategy

**Important:** Commit after EACH section above. Do not batch commits.

Commit message format:
- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code refactoring
- `chore:` for maintenance tasks

---

## Notes

1. **Shopify API Limitation:** The Storefront API does not support `author.bio` or `author.image` fields. Use generated avatars (initials) instead.

2. **Cart Product Details:** Ensure all cart mutations return full product details (title, handle, image) in the merchandise fragment to prevent "Cannot read properties of undefined" errors.

3. **Server vs Client Components:** 
   - Cart components = Client (interactivity)
   - Blog components = Server (data fetching)
   - ProductBuyBox = Client (state management)

4. **Styling Consistency:**
   - Pink accent: `#E91E8C`
   - Use Tailwind utilities
   - Match existing component styles

5. **Error Handling:** All API calls should have try/catch blocks and graceful fallbacks.

6. **TypeScript:** Maintain strict typing throughout. No `any` types.

---

## Estimated Timeline

- Phase 1 (Cart): ~2-3 hours
- Phase 2 (Blog): ~2-3 hours  
- Phase 3 (SEO): ~1 hour
- Phase 4 (Testing): ~30 minutes

**Total:** ~6-7 hours of focused development

---

## Success Criteria

✅ Cart fully functional with add/update/remove/checkout  
✅ Blog listing and article pages render correctly  
✅ Author pages work  
✅ Homepage shows recent articles dynamically  
✅ Advanced schema on all articles  
✅ llms.txt generates correctly  
✅ Site is noindexed  
✅ All features committed to git  
✅ No console errors  
✅ No TypeScript errors  
✅ Site loads and functions correctly on localhost:3001




