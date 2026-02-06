# Performance Page - Example Recommendations

This document shows examples of the types of recommendations you'll receive from the AI analysis.

## Example 1: Image Optimization

### AI Recommendation

**Title:** Optimize images with Next.js Image component

**Priority:** High  
**Category:** Images  
**Expected Impact:** Reduce LCP by 0.8s, improve Performance score by 15 points

**Description:**
Several large images are loading without optimization, causing slow Largest Contentful Paint. The product images and hero banner are particularly problematic. Using Next.js Image component will automatically optimize, resize, and serve images in modern formats (WebP/AVIF).

**Code Example:**
```tsx
// Before
<img 
  src="/images/hero-banner.jpg" 
  alt="Horse riding equipment" 
/>

// After
import Image from 'next/image';

<Image
  src="/images/hero-banner.jpg"
  alt="Horse riding equipment"
  width={1200}
  height={600}
  priority
  quality={85}
  sizes="100vw"
/>
```

**File Location:** `components/Hero.tsx`, `components/ProductCard.tsx`

**Implementation Notes:**
- Add `priority` prop to above-the-fold images
- Use `loading="lazy"` for below-the-fold images
- Specify exact width/height to prevent layout shift
- Test image quality on different devices
- Ensure images are stored in `/public` directory

---

## Example 2: Remove Unused JavaScript

### AI Recommendation

**Title:** Remove unused third-party scripts

**Priority:** High  
**Category:** JavaScript  
**Expected Impact:** Reduce TBT by 400ms, improve Performance score by 10 points

**Description:**
Several third-party scripts are loaded but not used on all pages. The Google Analytics script is loaded synchronously, blocking the main thread. Moving to async loading and conditionally loading scripts will significantly improve performance.

**Code Example:**
```tsx
// Before (in app/layout.tsx)
<script src="https://www.googletagmanager.com/gtag/js?id=GA_ID" />

// After
import Script from 'next/script';

<Script
  src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
  strategy="afterInteractive"
/>
```

**File Location:** `app/layout.tsx`

**Implementation Notes:**
- Use `strategy="afterInteractive"` for analytics
- Use `strategy="lazyOnload"` for non-critical scripts
- Consider loading chat widgets only when user interacts
- Test that analytics still tracks correctly after changes

---

## Example 3: Font Optimization

### AI Recommendation

**Title:** Optimize font loading with font-display: swap

**Priority:** Medium  
**Category:** Fonts  
**Expected Impact:** Reduce FCP by 0.3s, improve Performance score by 5 points

**Description:**
Custom fonts are blocking text rendering, causing invisible text during load. Using font-display: swap will show fallback fonts immediately while custom fonts load, improving perceived performance.

**Code Example:**
```ts
// In next.config.ts
const nextConfig = {
  // ... existing config
  
  // Add font optimization
  experimental: {
    optimizeFonts: true,
  },
};

export default nextConfig;
```

```tsx
// In app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Add this
  preload: true,
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

**File Location:** `next.config.ts`, `app/layout.tsx`

**Implementation Notes:**
- Use Next.js font optimization (built-in)
- Preload critical fonts
- Limit font variants to reduce file size
- Test font rendering on slow connections

---

## Example 4: Reduce Layout Shift

### AI Recommendation

**Title:** Add explicit dimensions to images and containers

**Priority:** High  
**Category:** HTML  
**Expected Impact:** Reduce CLS from 0.25 to 0.05, improve Performance score by 8 points

**Description:**
Images and dynamic content are loading without reserved space, causing layout shifts as content loads. Adding explicit width/height attributes and CSS aspect ratios will prevent shifts.

**Code Example:**
```tsx
// Before
<div className="product-card">
  <img src={product.image} alt={product.title} />
  <h3>{product.title}</h3>
</div>

// After
<div className="product-card">
  <div className="aspect-square relative">
    <Image
      src={product.image}
      alt={product.title}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="object-cover"
    />
  </div>
  <h3 className="min-h-[3rem]">{product.title}</h3>
</div>
```

**File Location:** `components/ProductCard.tsx`, `components/ProductGrid.tsx`

**Implementation Notes:**
- Use aspect ratio utilities from Tailwind
- Reserve space for dynamic content with min-height
- Test on different screen sizes
- Use skeleton loaders for async content

---

## Example 5: Enable Text Compression

### AI Recommendation

**Title:** Enable Gzip/Brotli compression

**Priority:** Medium  
**Category:** Server  
**Expected Impact:** Reduce transfer size by 70%, improve Performance score by 5 points

**Description:**
Text-based assets (HTML, CSS, JS) are not compressed, resulting in larger transfer sizes. Vercel automatically enables compression, but you can optimize further by ensuring all text assets are eligible for compression.

**Code Example:**
```ts
// In next.config.ts
const nextConfig = {
  compress: true, // Enable compression (default on Vercel)
  
  // Ensure headers allow compression
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Encoding',
            value: 'gzip',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**File Location:** `next.config.ts`

**Implementation Notes:**
- Compression is automatic on Vercel
- Ensure no middleware is disabling compression
- Test with network throttling
- Verify compression in Network tab (Chrome DevTools)

---

## Example 6: Lazy Load Offscreen Images

### AI Recommendation

**Title:** Lazy load images below the fold

**Priority:** Medium  
**Category:** Images  
**Expected Impact:** Reduce initial page load by 2MB, improve Performance score by 7 points

**Description:**
All product images are loading immediately, even those far down the page. Lazy loading offscreen images will reduce initial page weight and improve load time.

**Code Example:**
```tsx
// Before
<Image
  src={product.image}
  alt={product.title}
  width={400}
  height={400}
/>

// After
<Image
  src={product.image}
  alt={product.title}
  width={400}
  height={400}
  loading="lazy" // Add this
  placeholder="blur"
  blurDataURL={product.blurDataURL}
/>
```

**File Location:** `components/ProductGrid.tsx`, `components/ProductCard.tsx`

**Implementation Notes:**
- Only use `loading="lazy"` for below-the-fold images
- Use `priority` for above-the-fold images
- Add blur placeholders for better UX
- Test scroll performance on mobile

---

## Example 7: Minimize Main Thread Work

### AI Recommendation

**Title:** Defer non-critical JavaScript execution

**Priority:** High  
**Category:** JavaScript  
**Expected Impact:** Reduce TBT by 600ms, improve Performance score by 12 points

**Description:**
Large JavaScript bundles are blocking the main thread during initial load. Code splitting and dynamic imports will reduce the amount of JavaScript that needs to execute immediately.

**Code Example:**
```tsx
// Before
import { HeavyComponent } from '@/components/HeavyComponent';

export default function Page() {
  return <HeavyComponent />;
}

// After
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  {
    loading: () => <div>Loading...</div>,
    ssr: false, // If component doesn't need SSR
  }
);

export default function Page() {
  return <HeavyComponent />;
}
```

**File Location:** Various page components

**Implementation Notes:**
- Use dynamic imports for heavy components
- Disable SSR for client-only components
- Add loading states for better UX
- Test that functionality still works
- Consider route-based code splitting

---

## Example 8: Preconnect to Required Origins

### AI Recommendation

**Title:** Preconnect to third-party domains

**Priority:** Low  
**Category:** Server  
**Expected Impact:** Reduce connection time by 200ms, improve Performance score by 3 points

**Description:**
Third-party resources (fonts, analytics, CDN) require DNS lookup and connection establishment. Preconnecting to these domains will reduce latency when resources are requested.

**Code Example:**
```tsx
// In app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**File Location:** `app/layout.tsx`

**Implementation Notes:**
- Only preconnect to critical third-party domains
- Limit to 3-4 domains (browser limitation)
- Use `crossOrigin` for CORS requests
- Test that resources load correctly

---

## Example 9: Reduce CSS Bundle Size

### AI Recommendation

**Title:** Remove unused Tailwind CSS classes

**Priority:** Medium  
**Category:** CSS  
**Expected Impact:** Reduce CSS size by 40%, improve Performance score by 4 points

**Description:**
The CSS bundle includes many unused Tailwind classes. Properly configuring Tailwind's content paths will ensure only used classes are included in production.

**Code Example:**
```ts
// In tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // Add any other paths where Tailwind classes are used
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**File Location:** `tailwind.config.ts`

**Implementation Notes:**
- Ensure all component paths are included in `content`
- Remove unused plugins
- Use PurgeCSS safelist for dynamic classes
- Test that all styles still work after changes
- Check production build size

---

## Example 10: Optimize Third-Party Scripts

### AI Recommendation

**Title:** Load chat widget on interaction

**Priority:** Medium  
**Category:** JavaScript  
**Expected Impact:** Reduce TBT by 300ms, improve Performance score by 6 points

**Description:**
The Shopify Inbox chat widget loads immediately, blocking the main thread. Loading it only when the user interacts (clicks chat button) will improve initial load performance.

**Code Example:**
```tsx
'use client';

import { useState } from 'react';
import Script from 'next/script';

export function ChatWidget() {
  const [loadChat, setLoadChat] = useState(false);

  return (
    <>
      <button
        onClick={() => setLoadChat(true)}
        className="fixed bottom-4 right-4 rounded-full bg-action p-4"
      >
        💬 Chat
      </button>
      
      {loadChat && (
        <Script
          src={process.env.NEXT_PUBLIC_SHOPIFY_INBOX_SCRIPT_URL}
          strategy="lazyOnload"
        />
      )}
    </>
  );
}
```

**File Location:** `components/ChatWidget.tsx`

**Implementation Notes:**
- Only load on user interaction
- Add visual feedback when loading
- Test chat functionality after changes
- Consider using Intersection Observer for automatic loading

---

## Common Patterns in Recommendations

### High Priority Issues Usually Include:
1. **Image optimization** - Biggest impact on LCP
2. **JavaScript reduction** - Biggest impact on TBT
3. **Layout shift fixes** - Biggest impact on CLS

### Medium Priority Issues Usually Include:
1. **Font optimization** - Moderate impact on FCP
2. **CSS optimization** - Moderate impact on bundle size
3. **Third-party scripts** - Moderate impact on TBT

### Low Priority Issues Usually Include:
1. **Preconnect hints** - Small impact on connection time
2. **Cache headers** - Small impact on repeat visits
3. **Minor HTML optimizations** - Small impact on parsing

## How to Prioritize

### Quick Wins (Do First)
- High impact, low effort
- Example: Add `loading="lazy"` to images
- Example: Use Next.js Image component
- Example: Add `priority` to hero image

### Major Improvements (Do Second)
- High impact, medium effort
- Example: Implement code splitting
- Example: Optimize font loading
- Example: Fix layout shifts

### Fine-Tuning (Do Last)
- Low impact, any effort
- Example: Add preconnect hints
- Example: Optimize cache headers
- Example: Minor CSS tweaks

## Testing Your Changes

After implementing recommendations:

1. **Run a new scan** to verify improvements
2. **Compare before/after scores**
3. **Check Core Web Vitals** for improvements
4. **Test on real devices** (mobile, tablet, desktop)
5. **Monitor production** for any issues

## Expected Results

### Typical Improvements After Implementation:

**Before:**
- Performance: 65/100
- LCP: 3.2s
- CLS: 0.18
- TBT: 800ms

**After (implementing top 5 recommendations):**
- Performance: 85/100 (+20 points)
- LCP: 2.1s (-1.1s)
- CLS: 0.05 (-0.13)
- TBT: 250ms (-550ms)

---

**Remember:** These are examples. Your actual recommendations will be specific to your site's performance issues and codebase structure.
