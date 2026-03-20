import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getProductByHandle, getProductById, getProductCanonicalUrl, getRecommendedProducts, hasProductImage } from '@/lib/shopify/products';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { generateProductSchemaGraph } from '@/lib/utils/product-schema';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import { getManualRedirect } from '@/lib/redirects/manual';
import { getEmptyCategoryRedirectTarget } from '@/lib/redirects/empty-category-redirect';
import { getProductOverrideByHandle, resolveProductHandleFromSlug } from '@/lib/content/product-overrides';
import { getProductAllocationByHandle } from '@/lib/db/product-allocations';
import ProductReviewSection from '@/components/reviews/ProductReviewSection';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getReviewStatsWithCache } from '@/lib/reviews/get-review-stats';
import { cache } from 'react';

export const revalidate = 300;
export const dynamic = 'force-static';

interface ProductCatchAllPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

const getResolvedProduct = cache(async (rawHandle: string) => {
  const handle = await resolveProductHandleFromSlug(rawHandle);
  const product = await getProductByHandle(handle);
  return { handle, product };
});

/**
 * Catch-all route for product pages at any category depth
 * Handles URLs like:
 * - /clothing/footwear/boots/product-handle
 * - /horse/boots/product-handle
 * - /rider/helmets/product-handle
 * 
 * The last segment is always the product handle
 */
export default async function ProductCatchAllPage({ params }: ProductCatchAllPageProps) {
  const { slug } = await params;

  const requestedPath = `/${slug.join('/')}`;
  const manualRedirect = await getManualRedirect(requestedPath);
  if (manualRedirect) {
    if (manualRedirect.type === '301' || manualRedirect.type === '308') {
      permanentRedirect(manualRedirect.to);
    }
    redirect(manualRedirect.to);
  }
  
  // Check for legacy cart permalink URLs (should be handled by middleware but catch here as backup)
  if (slug[0] === 'cart' && slug[1] === 'c') {
    redirect('/cart');
  }
  
  // Last segment is the product handle
  const rawHandle = slug[slug.length - 1];
  const { handle, product } = await getResolvedProduct(rawHandle);
  let resolvedProduct = product;
  const allocationByHandle = await getProductAllocationByHandle(handle);

  // Fallback: for allocated products, prefer ID lookup if handle lookup misses.
  // This avoids false "empty category" redirects when handle-based Storefront fetch lags.
  if (!resolvedProduct && allocationByHandle?.product_id) {
    resolvedProduct = await getProductById(allocationByHandle.product_id);
  }
  
  if (!resolvedProduct) {
    // When path has 4+ segments, may be an empty category (e.g. /pet/dog/accessories/dog-bandanas)
    // Redirect to parent if this path is a known category with 0 products
    if (slug.length >= 4) {
      const emptyRedirect = await getEmptyCategoryRedirectTarget(requestedPath);
      if (emptyRedirect) {
        redirect(emptyRedirect);
      }
    }
    notFound();
  }
  if (!hasProductImage(resolvedProduct)) {
    notFound();
  }
  const override = await getProductOverrideByHandle(handle);
  if (override?.is_published_headless === false) {
    notFound();
  }
  const displayTitle = override?.use_headless_title ? (override?.title_override || resolvedProduct.title) : resolvedProduct.title;
  const descriptionHtml = override?.use_headless_description
    ? (override?.description_html || resolvedProduct.descriptionHtml)
    : resolvedProduct.descriptionHtml;

  // Get the canonical URL for this product
  const canonicalUrl = await getProductCanonicalUrl(resolvedProduct);
  
  // If the requested path doesn't match the canonical URL, redirect
  // BUT: Only if the canonical is NOT /products/{handle} (which would create a loop)
  if (requestedPath !== canonicalUrl) {
    if (canonicalUrl.startsWith('/products/')) {
      // Product has no category mapping, render it here
      // (This prevents redirect loops for unmapped products)
    } else {
      // Redirect to the correct category-based URL
      redirect(canonicalUrl);
    }
  }
  
  // If we reach here, either:
  // 1. The requested path matches the canonical URL (correct URL)
  // 2. OR the product has no category mapping (canonical is /products/{handle})

  // Build breadcrumb paths from product type using mapping
  const breadcrumbPaths = await getBreadcrumbsForProduct(
    resolvedProduct.productType || '',
    resolvedProduct.id
  );
  
  // Primary breadcrumb path (most specific/longest path first)
  const primaryPath = breadcrumbPaths[0] || [];
  
  // Additional paths (other categories this product appears in)
  const additionalPaths = breadcrumbPaths.slice(1, 4); // Limit to 3 additional paths
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const breadcrumbSchemas = generateBreadcrumbSchema(
    displayTitle,
    primaryPath,
    additionalPaths,
    siteUrl
  );

  // Get product-specific bullet points
  let overrideBullets: string[] = [];
  if (Array.isArray(override?.bullet_points)) {
    overrideBullets = override.bullet_points as string[];
  } else if (typeof override?.bullet_points === 'string') {
    try {
      overrideBullets = JSON.parse(override.bullet_points || '[]') as string[];
    } catch {
      overrideBullets = [];
    }
  }
  const featureHighlights = override?.use_headless_bullets && overrideBullets.length > 0
    ? overrideBullets
    : getProductBulletPoints(resolvedProduct.id);
  const reviewStats = await getReviewStatsWithCache(resolvedProduct.handle);
  const reviewBadgeStats = reviewStats
    ? {
        total_reviews: reviewStats.reviewCount,
        average_rating: reviewStats.averageRating,
      }
    : null;
  const schemaGraph = generateProductSchemaGraph(
    { ...resolvedProduct, title: displayTitle },
    canonicalUrl,
    breadcrumbSchemas,
    siteUrl,
    reviewStats
  );

  // Fetch related products and review stats (server-side batch)
  const relatedProducts = await getRecommendedProducts(4, resolvedProduct.productType, resolvedProduct.handle);
  const relatedReviewStatsMap = await getReviewStatsForProducts(relatedProducts.map((p) => p.handle));
  const relatedReviewStats = Object.fromEntries(relatedReviewStatsMap);
  const showArcEquineGelPromo = resolvedProduct.handle === 'arcequine-complete-kit';

  return (
    <>
      <div className="bg-background min-h-screen pb-20">
        {/* Unified Schema Graph (BreadcrumbList + Product) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
        />

        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-4">
        
        {/* Breadcrumb */}
        <ProductBreadcrumbs
          productTitle={displayTitle}
          primaryPath={primaryPath}
          additionalPaths={additionalPaths}
        />

        {/* Mobile title & rating (between breadcrumbs & image) */}
        <div className="lg:hidden mt-4 mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{displayTitle}</h1>
          <ProductPageReviewBadge
            productId={resolvedProduct.id}
            productHandle={resolvedProduct.handle}
            initialStats={reviewBadgeStats}
          />
          <div className="space-y-2 mt-4">
            {featureHighlights.map((feature) => (
              <div key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{feature}</span>
              </div>
            ))}
          </div>
          {showArcEquineGelPromo && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3.5a2.5 2.5 0 01-2 2.45V16a1 1 0 01-1 1H6a1 1 0 01-1-1V8.95A2.5 2.5 0 013 6.5V3zm2 2v1.5a.5.5 0 00.5.5H9V5H5zm6 0v2h3.5a.5.5 0 00.5-.5V5h-4zM9 9H7v6h2V9zm2 0v6h2V9h-2z" />
                </svg>
                <p className="text-sm font-semibold text-green-900">
                  Get a FREE Bonus ArcEquine Conductive Gel with every order.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
          {/* Left Column: Image Gallery & Description */}
          <div className="lg:col-span-7 space-y-8">
            {/* Image Gallery */}
            <ProductImageGallery 
              images={resolvedProduct.images}
              productTitle={resolvedProduct.title}
            />

            {/* Full Width Description Section */}
            <ProductDescription html={descriptionHtml} productTitle={displayTitle} />
          </div>

          {/* Right Column: Product Info & Buy Box (Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 lg:mb-0">
            
              {/* Title & Rating */}
              <div className="hidden lg:block">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{displayTitle}</h2>
                <div className="mb-4">
                  <ProductPageReviewBadge
                    productId={resolvedProduct.id}
                    productHandle={resolvedProduct.handle}
                    initialStats={reviewBadgeStats}
                  />
                </div>

                {/* Key Features/Benefits */}
                <div className="space-y-2 mt-4">
                  {featureHighlights.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
                {showArcEquineGelPromo && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3.5a2.5 2.5 0 01-2 2.45V16a1 1 0 01-1 1H6a1 1 0 01-1-1V8.95A2.5 2.5 0 013 6.5V3zm2 2v1.5a.5.5 0 00.5.5H9V5H5zm6 0v2h3.5a.5.5 0 00.5-.5V5h-4zM9 9H7v6h2V9zm2 0v6h2V9h-2z" />
                      </svg>
                      <p className="text-sm font-semibold text-green-900">
                        Get a FREE Bonus ArcEquine Conductive Gel with every order.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Buy Box */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
                <ProductBuyBox product={resolvedProduct} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <ProductReviewSection
        productId={resolvedProduct.id}
        productHandle={resolvedProduct.handle}
        productTitle={resolvedProduct.title}
      />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <RelatedProducts
          products={relatedProducts}
          reviewStatsMap={relatedReviewStats}
        />
      </div>
    </>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: ProductCatchAllPageProps) {
  const { slug } = await params;
  const rawHandle = slug[slug.length - 1];
  const { handle, product } = await getResolvedProduct(rawHandle);
  
  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }
  if (!hasProductImage(product)) {
    return {
      title: 'Product Not Found',
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const canonicalUrl = `${siteUrl}${await getProductCanonicalUrl(product)}`;
  
  const override = await getProductOverrideByHandle(handle);
  if (override?.is_published_headless === false) {
    return {
      title: 'Product Not Found',
    };
  }
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const title = override?.use_headless_meta_title
    ? (override?.meta_title || `${displayTitle} | The Equestrian`)
    : `${displayTitle} | The Equestrian`;
  const description =
    override?.use_headless_meta_description
      ? (override?.meta_description || product.description || `Shop ${displayTitle} at The Equestrian. Quality equestrian supplies and equipment.`)
      : (product.description || `Shop ${displayTitle} at The Equestrian. Quality equestrian supplies and equipment.`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'The Equestrian',
      type: 'website',
      images: product.images.edges[0]?.node ? [
        {
          url: product.images.edges[0].node.url,
          width: product.images.edges[0].node.width || 1200,
          height: product.images.edges[0].node.height || 1200,
          alt: product.images.edges[0].node.altText || displayTitle,
        },
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: product.images.edges[0]?.node ? [product.images.edges[0].node.url] : [],
    },
  };
}

