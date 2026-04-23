import { notFound, permanentRedirect, redirect } from 'next/navigation';
import {
  getProductByHandle,
  getProductCanonicalUrl,
  getProductCanonicalUrls,
  getRecommendedProducts,
  hasProductImage,
} from '@/lib/shopify/products';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { ProductVideoSection } from '@/components/product/ProductVideoSection';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { extractVideosFromHtml } from '@/lib/products/extract-videos';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { generateProductSchemaGraph } from '@/lib/utils/product-schema';
import { getReviewStatsWithCache } from '@/lib/reviews/get-review-stats';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import ProductReviewSection from '@/components/reviews/ProductReviewSection';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import ProductIdentifierMetaRow from '@/components/product/ProductIdentifierMetaRow';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import { getProductIdentifiers } from '@/lib/products/product-identifiers';
import { getProductBrandForDisplay } from '@/lib/db/product-brand';
import {
  getPdpCroVariant,
  withPreservedPdpCroQuery,
  type PdpSearchParams,
} from '@/lib/products/pdp-cro-trial';
import ProductPdpCroTrialMain from '@/components/product/ProductPdpCroTrialMain';
import ProductPdpCroTwoMain from '@/components/product/ProductPdpCroTwoMain';
import { createManualRedirect, getManualRedirect } from '@/lib/redirects/manual';
import { getProductOverrideByHandle, resolveProductHandleFromSlug } from '@/lib/content/product-overrides';
import { buildProductSeoMetadata } from '@/lib/seo/product-metadata';
import { cache } from 'react';
import { ProductViewTracker } from '@/components/analytics/ProductViewTracker';

export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{
    handle: string;
  }>;
  searchParams: Promise<PdpSearchParams>;
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
export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { handle: rawHandle } = await params;
  const sp = await searchParams;
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
  const rawDescriptionHtml = override?.use_headless_description
    ? (override?.description_html || product.descriptionHtml)
    : product.descriptionHtml;
  const { html: descriptionHtml, videos: descriptionVideos } =
    extractVideosFromHtml(rawDescriptionHtml);

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
    permanentRedirect(withPreservedPdpCroQuery(canonicalUrl, sp));
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

  // Resolve canonical brand + hub handle BEFORE schema so the Product schema's
  // brand entity links to /brands/[hub] (not a slugified vendor guess) and uses
  // a stable @id for cross-page entity resolution.
  const { brand: canonicalBrand, brandHubHandle } = await getProductBrandForDisplay(product.handle);

  const schemaGraph = generateProductSchemaGraph(
    { ...product, title: displayTitle },
    currentUrl,
    breadcrumbSchemas,
    siteUrl,
    reviewStats,
    { brandHubHandle, brandName: canonicalBrand }
  );

  // Fetch related products (limit 4)
  const relatedProducts = await getRecommendedProducts(4, product.productType, product.handle);
  
  // Fetch review stats for related products (server-side batch)
  const relatedHandles = relatedProducts.map(p => p.handle);
  const relatedReviewStatsMap = await getReviewStatsForProducts(relatedHandles);
  const relatedReviewStats = Object.fromEntries(relatedReviewStatsMap);
  const relatedUrlMap = await getProductCanonicalUrls(relatedProducts);
  const relatedProductHrefByHandle = Object.fromEntries(
    relatedProducts.map((p) => [p.handle, relatedUrlMap.get(p.id) ?? `/products/${p.handle}`])
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
    : getProductBulletPoints(product.id);
  const identifiers = getProductIdentifiers(product, { canonicalBrand, brandHubHandle });
  const pdpCroVariant = getPdpCroVariant(product.handle, sp);
  const isCroTrialPdp = pdpCroVariant === 'cro1';
  const isCroTwoPdp = pdpCroVariant === 'cro2';
  const isCroThreePdp = pdpCroVariant === 'cro3';

  const firstAvailableVariant =
    product.variants.edges.find(({ node }) => node.availableForSale)?.node ??
    product.variants.edges[0]?.node;

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* Unified Schema Graph (BreadcrumbList + Product) */}
          <script
            type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaGraph) }}
          />

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-4">
        
        {/* Breadcrumb */}
        <ProductBreadcrumbs
          productTitle={product.title}
          primaryPath={primaryPath}
          additionalPaths={additionalPaths}
        />

        <ProductViewTracker
          product={product}
          displayTitle={displayTitle}
          defaultVariantId={firstAvailableVariant?.id}
          defaultVariantPrice={
            firstAvailableVariant
              ? parseFloat(firstAvailableVariant.price.amount)
              : undefined
          }
        />

      {isCroTrialPdp ? (
        <ProductPdpCroTrialMain
          product={product}
          displayTitle={displayTitle}
          descriptionHtml={descriptionHtml}
          featureHighlights={featureHighlights}
          reviewBadgeStats={reviewBadgeStats}
          canonicalBrand={canonicalBrand}
          brandHubHandle={brandHubHandle}
          videoSection={
            <ProductVideoSection
              videos={descriptionVideos}
              productTitle={displayTitle}
            />
          }
        >
          <ProductReviewSection
            productId={product.id}
            productHandle={product.handle}
            productTitle={product.title}
          />
        </ProductPdpCroTrialMain>
      ) : isCroTwoPdp || isCroThreePdp ? (
        <ProductPdpCroTwoMain
          product={product}
          displayTitle={displayTitle}
          descriptionHtml={descriptionHtml}
          featureHighlights={featureHighlights}
          reviewBadgeStats={reviewBadgeStats}
          styleMode={isCroThreePdp ? 'cro3' : 'cro2'}
          canonicalBrand={canonicalBrand}
          brandHubHandle={brandHubHandle}
          afterDescription={
            <ProductVideoSection
              videos={descriptionVideos}
              productTitle={displayTitle}
            />
          }
        />
      ) : (
      <article aria-labelledby="pdp-product-title">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-12 items-start">
          <section
            className="order-1 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-1 mt-4 lg:mt-0 mb-6 lg:mb-0 space-y-2"
            aria-label="Product summary"
          >
            <h1 id="pdp-product-title" className="text-3xl font-bold text-gray-900 lg:mb-2">
              {displayTitle}
            </h1>
            <div className="lg:mb-4">
              <ProductPageReviewBadge
                productId={product.id}
                productHandle={product.handle}
                initialStats={reviewBadgeStats}
              />
              <ProductIdentifierMetaRow identifiers={identifiers} />
            </div>
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
          </section>

          <section className="order-2 lg:order-none lg:col-span-7 lg:row-start-1 lg:row-span-2" aria-label="Product images">
            <ProductImageGallery images={product.images} productTitle={product.title} />
          </section>

          <section
            className="order-3 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:sticky lg:top-24 lg:self-start lg:z-10 mt-6 lg:mt-0"
            aria-label="Purchase options"
          >
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
              <ProductBuyBox product={product} />
            </div>
          </section>

          <section
            className="order-4 lg:order-none lg:col-span-7 lg:row-start-3 space-y-8 mt-8 lg:mt-0"
            aria-label="Product description"
          >
            <ProductDescription html={descriptionHtml} productTitle={displayTitle} />
          </section>
        </div>
      </article>
      )}

        {!isCroTrialPdp ? (
          <ProductVideoSection
            videos={descriptionVideos}
            productTitle={displayTitle}
          />
        ) : null}

        {!isCroTrialPdp ? (
          <ProductReviewSection
            productId={product.id}
            productHandle={product.handle}
            productTitle={product.title}
          />
        ) : null}

        {/* Related Products */}
        <RelatedProducts
          products={relatedProducts}
          reviewStatsMap={relatedReviewStats}
          productHrefByHandle={relatedProductHrefByHandle}
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
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}${await getProductCanonicalUrl(product)}`;
  
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const seoMetadata = buildProductSeoMetadata({
    displayTitle,
    productDescription: product.description,
    override,
  });
  const title = seoMetadata.proposedTitle;
  const description = seoMetadata.proposedDescription;

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
