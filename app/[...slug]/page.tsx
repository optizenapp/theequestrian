import { notFound, permanentRedirect, redirect } from 'next/navigation';
import {
  getProductByHandle,
  getProductById,
  getProductCanonicalUrl,
  getProductCanonicalUrls,
  getRecommendedProducts,
  hasProductImage,
} from '@/lib/shopify/products';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { generateProductSchemaGraph } from '@/lib/utils/product-schema';
import { resolveProductShippingDisplay } from '@/lib/shipping/product-shipping-display';
import { getBreadcrumbsForProduct } from '@/lib/mapping/collection-mapping';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { StoreRatingBadge } from '@/components/reviews/StoreRatingBadge';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import { composeProductDescriptionHtml } from '@/lib/products/compose-product-description';
import ProductIdentifierMetaRow from '@/components/product/ProductIdentifierMetaRow';
import { getProductIdentifiers } from '@/lib/products/product-identifiers';
import { getProductBrandForDisplay } from '@/lib/db/product-brand';
import {
  getPdpCroVariant,
  withPreservedPdpCroQuery,
  type PdpSearchParams,
} from '@/lib/products/pdp-cro-trial';
import ProductPdpCroTrialMain from '@/components/product/ProductPdpCroTrialMain';
import ProductPdpCroTwoMain from '@/components/product/ProductPdpCroTwoMain';
import { getManualRedirect } from '@/lib/redirects/manual';
import { getEmptyCategoryRedirectTarget } from '@/lib/redirects/empty-category-redirect';
import { getProductOverrideByHandle, resolveProductHandleFromSlug } from '@/lib/content/product-overrides';
import { getProductAllocationByHandle } from '@/lib/db/product-allocations';
import ProductReviewSection from '@/components/reviews/ProductReviewSection';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getStoreReviewStats } from '@/lib/reviews/store-stats';
import { getReviewStatsWithCache } from '@/lib/reviews/get-review-stats';
import { cache } from 'react';
import { ProductViewTracker } from '@/components/analytics/ProductViewTracker';
import type { ShopifyBuyBoxProduct } from '@/types/shopify';

export const revalidate = 300;

interface ProductCatchAllPageProps {
  params: Promise<{
    slug: string[];
  }>;
  searchParams: Promise<PdpSearchParams>;
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
export default async function ProductCatchAllPage({ params, searchParams }: ProductCatchAllPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

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
  const descriptionHtml = composeProductDescriptionHtml({
    shopifyDescriptionHtml: resolvedProduct.descriptionHtml,
    override,
  }).html;

  // Get the canonical URL for this product
  const canonicalUrl = await getProductCanonicalUrl(resolvedProduct);
  
  // If the requested path doesn't match the canonical URL, redirect
  // BUT: Only if the canonical is NOT /products/{handle} (which would create a loop)
  if (requestedPath !== canonicalUrl) {
    if (canonicalUrl.startsWith('/products/')) {
      // Product has no category mapping, render it here
      // (This prevents redirect loops for unmapped products)
    } else {
      // Redirect to the correct category-based URL (preserve ?cro= for CRO preview)
      redirect(withPreservedPdpCroQuery(canonicalUrl, sp));
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
  // Resolve canonical brand + hub handle BEFORE schema so the Product schema's
  // brand entity links to /brands/[hub] and uses a stable @id.
  const { brand: canonicalBrand, brandHubHandle } = await getProductBrandForDisplay(resolvedProduct.handle);

  const shippingDisplay = await resolveProductShippingDisplay({
    vendor: resolvedProduct.vendor || '',
    tags: resolvedProduct.tags || [],
    price: parseFloat(resolvedProduct.priceRange.minVariantPrice.amount),
  });
  const storeReviewStats = await getStoreReviewStats();

  const schemaGraph = generateProductSchemaGraph(
    { ...resolvedProduct, title: displayTitle },
    canonicalUrl,
    breadcrumbSchemas,
    siteUrl,
    reviewStats,
    { brandHubHandle, brandName: canonicalBrand, hasFreeShipping: shippingDisplay.hasFreeShipping }
  );

  // Fetch related products and review stats (server-side batch)
  const relatedProducts = await getRecommendedProducts(4, resolvedProduct.productType, resolvedProduct.handle);
  const relatedReviewStatsMap = await getReviewStatsForProducts(relatedProducts.map((p) => p.handle));
  const relatedReviewStats = Object.fromEntries(relatedReviewStatsMap);
  const relatedUrlMap = await getProductCanonicalUrls(relatedProducts);
  const relatedProductHrefByHandle = Object.fromEntries(
    relatedProducts.map((p) => [p.handle, relatedUrlMap.get(p.id) ?? `/products/${p.handle}`])
  );
  const showArcEquineGelPromo = resolvedProduct.handle === 'arcequine-complete-kit';
  const identifiers = getProductIdentifiers(resolvedProduct, { canonicalBrand, brandHubHandle });
  const pdpCroVariant = getPdpCroVariant(resolvedProduct.handle, sp);
  const isCroTrialPdp = pdpCroVariant === 'cro1';
  const isCroTwoPdp = pdpCroVariant === 'cro2';
  const isCroThreePdp = pdpCroVariant === 'cro3';

  const firstAvailableVariant =
    resolvedProduct.variants.edges.find(({ node }) => node.availableForSale)?.node ??
    resolvedProduct.variants.edges[0]?.node;
  const buyBoxProduct: ShopifyBuyBoxProduct = {
    id: resolvedProduct.id,
    title: resolvedProduct.title,
    vendor: resolvedProduct.vendor,
    productType: resolvedProduct.productType,
    availableForSale: resolvedProduct.availableForSale,
    priceRange: resolvedProduct.priceRange,
    compareAtPriceRange: resolvedProduct.compareAtPriceRange,
    variants: resolvedProduct.variants,
  };

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

        <ProductViewTracker
          productId={resolvedProduct.id}
          productTitle={resolvedProduct.title}
          productVendor={resolvedProduct.vendor}
          productType={resolvedProduct.productType}
          productPriceAmount={resolvedProduct.priceRange.minVariantPrice.amount}
          productPriceCurrencyCode={resolvedProduct.priceRange.minVariantPrice.currencyCode}
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
            product={resolvedProduct}
            displayTitle={displayTitle}
            descriptionHtml={descriptionHtml}
            featureHighlights={featureHighlights}
            reviewBadgeStats={reviewBadgeStats}
            canonicalBrand={canonicalBrand}
            brandHubHandle={brandHubHandle}
            shippingDisplay={shippingDisplay}
          >
            <ProductReviewSection
              productId={resolvedProduct.id}
              productHandle={resolvedProduct.handle}
              productTitle={resolvedProduct.title}
            />
          </ProductPdpCroTrialMain>
        ) : isCroTwoPdp || isCroThreePdp ? (
          <ProductPdpCroTwoMain
            product={resolvedProduct}
            displayTitle={displayTitle}
            descriptionHtml={descriptionHtml}
            featureHighlights={featureHighlights}
            reviewBadgeStats={reviewBadgeStats}
            showArcEquineGelPromo={showArcEquineGelPromo}
            styleMode={isCroThreePdp ? 'cro3' : 'cro2'}
            canonicalBrand={canonicalBrand}
            brandHubHandle={brandHubHandle}
            shippingDisplay={shippingDisplay}
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
                productId={resolvedProduct.id}
                productHandle={resolvedProduct.handle}
                initialStats={reviewBadgeStats}
              />
              <ProductIdentifierMetaRow identifiers={identifiers} />
              <StoreRatingBadge stats={storeReviewStats} />
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
          </section>

          <section className="order-2 lg:order-none lg:col-span-7 lg:row-start-1 lg:row-span-2" aria-label="Product images">
            <ProductImageGallery
              images={resolvedProduct.images.edges.map(({ node }) => node)}
              productTitle={resolvedProduct.title}
            />
          </section>

          <section
            className="order-3 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:sticky lg:top-24 lg:self-start lg:z-10 mt-6 lg:mt-0"
            aria-label="Purchase options"
          >
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
              <ProductBuyBox product={buyBoxProduct} shippingDisplay={shippingDisplay} />
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
      </div>
      </div>
      {!isCroTrialPdp ? (
        <ProductReviewSection
          productId={resolvedProduct.id}
          productHandle={resolvedProduct.handle}
          productTitle={resolvedProduct.title}
        />
      ) : null}
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <RelatedProducts
          products={relatedProducts}
          reviewStatsMap={relatedReviewStats}
          productHrefByHandle={relatedProductHrefByHandle}
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

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  const canonicalPath = await getProductCanonicalUrl(product);
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  
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
    ...(canonicalPath.startsWith('/products/')
      ? { robots: { index: false, follow: true } }
      : {}),
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

