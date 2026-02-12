import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { getProductByHandle, getProductCanonicalUrl, getRecommendedProducts, hasProductImage } from '@/lib/shopify/products';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { generateProductSchemaGraph } from '@/lib/utils/product-schema';
import { getReviewStatsWithCache } from '@/lib/reviews/get-review-stats';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import ProductReviewSection from '@/components/reviews/ProductReviewSection';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import { createManualRedirect, getManualRedirect } from '@/lib/redirects/manual';
import { getProductOverrideByHandle, resolveProductHandleFromSlug } from '@/lib/content/product-overrides';
import { cache } from 'react';

export const revalidate = 300;
export const dynamic = 'force-static';

interface ProductPageProps {
  params: Promise<{
    handle: string;
  }>;
}

const getResolvedProduct = cache(async (rawHandle: string) => {
  const resolvedHandle = await resolveProductHandleFromSlug(rawHandle);
  const product = await getProductByHandle(resolvedHandle);
  return { resolvedHandle, product };
});

/**
 * Legacy product route: /products/{handle}
 * 
 * Behavior:
 * - If product has a category mapping: redirects (301) to category-based URL
 * - If no mapping: renders product page (fallback for unmapped products)
 * 
 * Example redirect: /products/ariat-boot → /clothing/footwear/boots/ariat-boot
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { handle: rawHandle } = await params;
  const { resolvedHandle, product } = await getResolvedProduct(rawHandle);
  const manualRedirect = await getManualRedirect(`/products/${rawHandle}`);
  if (manualRedirect) {
    if (manualRedirect.type === '301' || manualRedirect.type === '308') {
      permanentRedirect(manualRedirect.to);
    }
    redirect(manualRedirect.to);
  }
  if (!product) {
    notFound();
  }
  if (!hasProductImage(product)) {
    notFound();
  }
  const override = await getProductOverrideByHandle(resolvedHandle);
  if (override?.is_published_headless === false) {
    notFound();
  }
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const descriptionHtml = override?.use_headless_description
    ? (override?.description_html || product.descriptionHtml)
    : product.descriptionHtml;

  // Get the canonical URL
  const canonicalUrl = await getProductCanonicalUrl(product);
  const currentUrl = `/products/${rawHandle}`;
  
  // Only redirect if canonical URL is different (i.e., product has a category mapping)
  if (canonicalUrl !== currentUrl) {
    try {
      await createManualRedirect(currentUrl, canonicalUrl, '301', 'auto');
    } catch (error) {
      console.error('Failed to create auto redirect:', error);
    }
    permanentRedirect(canonicalUrl);
  }

  // If we reach here, product has no mapping - render fallback page
  // Build breadcrumb paths from product type using mapping
  const breadcrumbPaths = await getBreadcrumbsForProduct(
    product.productType || '',
    product.id
  );
  
  // Primary breadcrumb path (most specific/longest path first)
  const primaryPath = breadcrumbPaths[0] || [];
  
  // Additional paths (other categories this product appears in)
  const additionalPaths = breadcrumbPaths.slice(1, 4); // Limit to 3 additional paths
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const breadcrumbSchemas = generateBreadcrumbSchema(
    product.title,
    primaryPath,
    additionalPaths,
    siteUrl
  );

  // Fetch review stats for schema (server-side)
  const reviewStats = await getReviewStatsWithCache(product.handle);
  const reviewBadgeStats = reviewStats
    ? {
        total_reviews: reviewStats.reviewCount,
        average_rating: reviewStats.averageRating,
      }
    : null;

  // Generate unified @graph with BreadcrumbList + Product (including review stats)
  // This creates a single knowledge graph entity for better entity resolution
  const primaryBreadcrumb = Array.isArray(breadcrumbSchemas) ? breadcrumbSchemas[0] : breadcrumbSchemas;
  const schemaGraph = generateProductSchemaGraph(
    { ...product, title: displayTitle },
    currentUrl,
    primaryBreadcrumb,
    siteUrl,
    reviewStats
  );

  // Fetch related products (limit 4)
  const relatedProducts = await getRecommendedProducts(4, product.productType, product.handle);
  
  // Fetch review stats for related products (server-side batch)
  const relatedHandles = relatedProducts.map(p => p.handle);
  const relatedReviewStatsMap = await getReviewStatsForProducts(relatedHandles);

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
    : getProductBulletPoints(product.id);

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Unified Schema Graph (BreadcrumbList + Product) */}
          <script
            type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
          />

      {/* Additional breadcrumb paths (if product appears in multiple categories) */}
      {Array.isArray(breadcrumbSchemas) && breadcrumbSchemas.slice(1).map((schema, index) => (
        <script
          key={`breadcrumb-alt-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-4">
        
        {/* Breadcrumb */}
        <ProductBreadcrumbs
          productTitle={product.title}
          primaryPath={primaryPath}
          additionalPaths={additionalPaths}
        />

      {/* Mobile title & rating (between breadcrumbs & image) */}
        <div className="lg:hidden mt-4 mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">{displayTitle}</h1>
          <ProductPageReviewBadge
            productId={product.id}
            productHandle={product.handle}
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
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 items-start">
          {/* Left Column: Image Gallery & Description */}
          <div className="lg:col-span-7 space-y-8">
            {/* Image Gallery */}
            <ProductImageGallery 
              images={product.images}
              productTitle={product.title}
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
                    productId={product.id}
                    productHandle={product.handle}
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
              </div>

              {/* Buy Box */}
              <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
                <ProductBuyBox product={product} />
              </div>
            </div>
          </div>
        
        {/* Reviews Section - Full Width Below Product */}
        <ProductReviewSection
          productId={product.id}
          productHandle={product.handle}
          productTitle={product.title}
        />

        {/* Related Products */}
        <RelatedProducts 
          products={relatedProducts} 
          reviewStatsMap={relatedReviewStatsMap}
        />
      </div>
    </div>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: ProductPageProps) {
  const { handle: rawHandle } = await params;
  const { resolvedHandle, product } = await getResolvedProduct(rawHandle);
  
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

  const override = await getProductOverrideByHandle(resolvedHandle);
  if (override?.is_published_headless === false) {
    return {
      title: 'Product Not Found',
    };
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const canonicalUrl = `${siteUrl}${await getProductCanonicalUrl(product)}`;
  
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
