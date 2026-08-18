import { permanentRedirect, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getProductsByCategoryForCollectionPage } from '@/lib/shopify/category-collection-fetch';
import {
  getProductByHandle,
  getProductCanonicalUrl,
  getProductCanonicalUrls,
  getRecommendedProducts,
  hasProductImage,
} from '@/lib/shopify/products';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionSchemaFast } from '@/lib/utils/collection-schema-fast';
import { 
  getProductTypesForCollection, 
  getCollectionTitle,
  getCollectionHierarchy,
  getBreadcrumbsForProduct
} from '@/lib/mapping/collection-mapping';
import { TrustSignals } from '@/components/TrustSignals';
import { CollectionDescription } from '@/components/CollectionDescription';
import { CollectionBreadcrumbs } from '@/components/CollectionBreadcrumbs';
import { FAQSection } from '@/components/collection/FAQSection';
import { RelatedCategories } from '@/components/collection/RelatedCategories';
import { RichContent } from '@/components/collection/RichContent';
import { getCategoryContent, getParentCollectionLink } from '@/lib/content/collections';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescriptionSizingTabs } from '@/components/product/ProductDescriptionSizingTabs';
import { ProductVideoSection } from '@/components/product/ProductVideoSection';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { getBrandSizingForProduct } from '@/lib/sizing/resolve-brand-sizing';
import { extractVideosFromHtml } from '@/lib/products/extract-videos';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { generateProductSchemaGraph } from '@/lib/utils/product-schema';
import { resolveProductShippingDisplay } from '@/lib/shipping/product-shipping-display';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getStoreReviewStats } from '@/lib/reviews/store-stats';
import { getAllowedBrandVendors } from '@/lib/filters/brand-filter-helper';
import { getCategorySiloNav } from '@/lib/nav/category-silo';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { StoreRatingBadge } from '@/components/reviews/StoreRatingBadge';
import ProductIdentifierMetaRow from '@/components/product/ProductIdentifierMetaRow';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import { sanitizeBulletBrandLines } from '@/lib/products/sanitize-bullet-brand';
import { composeProductDescriptionHtml } from '@/lib/products/compose-product-description';
import { getProductIdentifiers } from '@/lib/products/product-identifiers';
import { getProductBrandForDisplay } from '@/lib/db/product-brand';
import {
  getPdpCroVariant,
  withPreservedPdpCroQuery,
  type PdpSearchParams,
} from '@/lib/products/pdp-cro-trial';
import ProductPdpCroTrialMain from '@/components/product/ProductPdpCroTrialMain';
import ProductPdpCroTwoMain from '@/components/product/ProductPdpCroTwoMain';
import ProductReviewSection from '@/components/reviews/ProductReviewSection';
import type { Metadata } from 'next';
import type { ShopifyBuyBoxProduct, ShopifyProduct } from '@/types/shopify';
import {
  followManualRedirectUnlessProductRestored,
  permanentRedirectMissingProduct,
  redirectMissingProduct,
} from '@/lib/redirects/missing-product-redirect';
import { getProductOverrideByHandle, resolveProductHandleFromSlug } from '@/lib/content/product-overrides';
import { buildProductSeoMetadata, resolveProductPageDescription, resolveProductPageTitle } from '@/lib/seo/product-metadata';
import { cache } from 'react';
import { ProductViewTracker } from '@/components/analytics/ProductViewTracker';
import { ProductGridSkeleton } from '@/components/filters/ProductGridSkeleton';
import { getProductReviewsWithStats } from '@/lib/reviews/product-reviews';

export const revalidate = 172800;
export const preferredRegion = 'syd1';

interface PageProps {
  params: Promise<{
    category: string;
    subcategory: string;
    product: string; // This segment can be either a product handle OR a sub-subcategory
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const getResolvedProductBySlug = cache(async (slug: string) => {
  const resolvedHandle = await resolveProductHandleFromSlug(slug);
  const product = await getProductByHandle(resolvedHandle);
  return { resolvedHandle, product };
});

/**
 * Dynamic Page: /{category}/{subcategory}/{product}
 * 
 * This route handles two scenarios:
 * 1. Sub-subcategory collection page (e.g., /horse/rugs/turnout)
 * 2. Product page fallback (legacy URL support) -> redirects to canonical
 */
export default async function Page({ params, searchParams }: PageProps) {
  const { category, subcategory, product: thirdSegment } = await params;
  const sp = await searchParams;
  const { cursor, brand, size, color, sort } = sp;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const sortBy =
    typeof sort === 'string' ? (sort as 'featured' | 'on-sale' | 'newest' | 'oldest' | 'price-asc' | 'price-desc') : undefined;
  const filterBrands = brand ? (Array.isArray(brand) ? brand : brand.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  const currentPath = `/${category}/${subcategory}/${thirdSegment}`;
  const { resolvedHandle: preResolvedHandle, product: productAtPath } =
    await getResolvedProductBySlug(thirdSegment);

  const productAvailable = !!(productAtPath && hasProductImage(productAtPath));
  let preCanonical: string | undefined;
  if (productAtPath && productAvailable) {
    const preOverride = await getProductOverrideByHandle(preResolvedHandle);
    if (preOverride?.is_published_headless !== false) {
      preCanonical = await getProductCanonicalUrl(productAtPath);
      if (preCanonical === currentPath) {
        return renderProductPage(productAtPath, currentPath, sp);
      }
    }
  }

  await followManualRedirectUnlessProductRestored({
    pathname: currentPath,
    handle: preResolvedHandle,
    productAvailable,
    canonicalPath: preCanonical,
  });

  // 1. Check if this is a valid sub-subcategory
  // First check if it exists in the database (collection_content table)
  const { categoryExists } = await import('@/lib/content/collections');
  const existsInDatabase = await categoryExists(category, subcategory, thirdSegment);
  
  if (existsInDatabase) {
    // Category exists in database, render it (will redirect if empty)
    return renderSubSubcategoryPage(
      category,
      subcategory,
      thirdSegment,
      afterCursor,
      filterBrands,
      filterSizes,
      filterColors,
      sortBy
    );
  }
  
  // Check if it has product types mapped (for categories not in database yet)
  const allowedProductTypes = await getProductTypesForCollection(category, subcategory, thirdSegment);
  
  // If it maps to a collection, render the collection page
  if (allowedProductTypes.length > 0) {
    return renderSubSubcategoryPage(
      category,
      subcategory,
      thirdSegment,
      afterCursor,
      filterBrands,
      filterSizes,
      filterColors,
      sortBy
    );
  }

  // 2. If not a category, assume it's a product handle
  const { resolvedHandle, product } = await getResolvedProductBySlug(thirdSegment);

  if (!product) {
    return permanentRedirectMissingProduct(currentPath, resolvedHandle);
  }
  if (!hasProductImage(product)) {
    return redirectMissingProduct(currentPath, resolvedHandle);
  }
  const productOverride = await getProductOverrideByHandle(resolvedHandle);
  if (productOverride?.is_published_headless === false) {
    return redirectMissingProduct(currentPath, resolvedHandle);
  }

  // Get the canonical URL for this product
  const canonicalUrl = await getProductCanonicalUrl(product);
  // If we're already at the canonical URL, render the product page
  // Otherwise, redirect to the canonical URL
  if (currentPath !== canonicalUrl) {
    redirect(withPreservedPdpCroQuery(canonicalUrl, sp));
  }
  
  // Render the product page (we're at the canonical URL)
  return renderProductPage(product, currentPath, sp);
}

/**
 * Render a product page
 */
async function renderProductPage(
  product: ShopifyProduct,
  canonicalPath?: string,
  searchParams: PdpSearchParams = {}
) {
  const productPath = canonicalPath || `/${product.handle}`;
  if (!hasProductImage(product)) {
    return redirectMissingProduct(productPath, product.handle);
  }
  const override = await getProductOverrideByHandle(product.handle);
  if (override?.is_published_headless === false) {
    return redirectMissingProduct(productPath, product.handle);
  }
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const composedDescription = composeProductDescriptionHtml({
    shopifyDescriptionHtml: product.descriptionHtml,
    override,
  });
  const { html: descriptionHtml, videos: descriptionVideos } =
    extractVideosFromHtml(composedDescription.html);
  // Build breadcrumb paths from allocation table (priority) or product type (fallback)
  const breadcrumbPaths = await getBreadcrumbsForProduct(
    product.productType || '',
    product.id
  );
  
  // Primary breadcrumb path (most specific/longest path first)
  const primaryPath = breadcrumbPaths[0] || [];
  
  // Additional paths (other categories this product appears in)
  const additionalPaths = breadcrumbPaths.slice(1, 4);
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const breadcrumbSchemas = generateBreadcrumbSchema(
    product.title,
    primaryPath,
    additionalPaths,
    siteUrl
  );

  // Use a single server source for both badge/reviews SSR and schema aggregateRating.
  const { reviews: initialReviews, stats: initialReviewStats } =
    await getProductReviewsWithStats(product.handle);
  const reviewStats =
    initialReviewStats.total_reviews > 0
      ? {
          reviewCount: initialReviewStats.total_reviews,
          averageRating: initialReviewStats.average_rating,
        }
      : null;
  const reviewBadgeStats =
    initialReviewStats.total_reviews > 0
      ? {
          total_reviews: initialReviewStats.total_reviews,
          average_rating: initialReviewStats.average_rating,
        }
      : null;

  // Resolve canonical brand + hub handle BEFORE schema so the Product schema's
  // brand entity links to /brands/[hub] and uses a stable @id.
  const { brand: canonicalBrand, brandHubHandle } = await getProductBrandForDisplay(product.handle);

  const shippingDisplay = await resolveProductShippingDisplay({
    vendor: product.vendor || '',
    tags: product.tags || [],
    price: parseFloat(product.priceRange.minVariantPrice.amount),
    productId: product.id,
  });
  const storeReviewStats = await getStoreReviewStats();

  const canonicalUrl = canonicalPath || await getProductCanonicalUrl(product);
  const schemaGraph = generateProductSchemaGraph(
    { ...product, title: displayTitle },
    canonicalUrl,
    breadcrumbSchemas,
    siteUrl,
    reviewStats,
    { brandHubHandle, brandName: canonicalBrand, hasFreeShipping: shippingDisplay.hasFreeShipping }
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
  const rawHighlights = override?.use_headless_bullets && overrideBullets.length > 0
    ? overrideBullets
    : getProductBulletPoints(product.id);
  const featureHighlights = sanitizeBulletBrandLines(rawHighlights, {
    canonicalBrand,
    vendor: product.vendor,
  });
  const showArcEquineGelPromo = product.handle === 'arcequine-complete-kit';
  const identifiers = getProductIdentifiers(product, { canonicalBrand, brandHubHandle });
  const brandSizing = await getBrandSizingForProduct({
    brandHubHandle,
    brandDisplayName: canonicalBrand,
    vendor: product.vendor,
    title: product.title,
    handle: product.handle,
    productType: product.productType,
  });
  const pdpCroVariant = getPdpCroVariant(product.handle, searchParams);
  const isCroTrialPdp = pdpCroVariant === 'cro1';
  const isCroTwoPdp = pdpCroVariant === 'cro2';
  const isCroThreePdp = pdpCroVariant === 'cro3';

  const firstAvailableVariant =
    product.variants.edges.find(({ node }) => node.availableForSale)?.node ??
    product.variants.edges[0]?.node;
  const buyBoxProduct: ShopifyBuyBoxProduct = {
    id: product.id,
    title: product.title,
    vendor: product.vendor,
    productType: product.productType,
    availableForSale: product.availableForSale,
    priceRange: product.priceRange,
    compareAtPriceRange: product.compareAtPriceRange,
    variants: product.variants,
  };

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
          productTitle={displayTitle}
          primaryPath={primaryPath}
          additionalPaths={additionalPaths}
        />

        <ProductViewTracker
          productId={product.id}
          productTitle={product.title}
          productVendor={product.vendor}
          productType={product.productType}
          productPriceAmount={product.priceRange.minVariantPrice.amount}
          productPriceCurrencyCode={product.priceRange.minVariantPrice.currencyCode}
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
            shippingDisplay={shippingDisplay}
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
              initialReviews={initialReviews}
              initialStats={initialReviewStats}
            />
          </ProductPdpCroTrialMain>
        ) : isCroTwoPdp || isCroThreePdp ? (
          <ProductPdpCroTwoMain
            product={product}
            displayTitle={displayTitle}
            descriptionHtml={descriptionHtml}
            featureHighlights={featureHighlights}
            reviewBadgeStats={reviewBadgeStats}
            showArcEquineGelPromo={showArcEquineGelPromo}
            styleMode={isCroThreePdp ? 'cro3' : 'cro2'}
            canonicalBrand={canonicalBrand}
            brandHubHandle={brandHubHandle}
            shippingDisplay={shippingDisplay}
            afterDescription={
              <>
                <ProductVideoSection
                  videos={descriptionVideos}
                  productTitle={displayTitle}
                />
              </>
            }
          />
        ) : (
        <>
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
              <StoreRatingBadge stats={storeReviewStats} />
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
              images={product.images.edges.map(({ node }) => node)}
              productTitle={product.title}
            />
          </section>

          <section
            className="order-3 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-2 lg:sticky lg:top-24 lg:self-start lg:z-10 mt-6 lg:mt-0"
            aria-label="Purchase options"
          >
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
              <ProductBuyBox
                product={buyBoxProduct}
                shippingDisplay={shippingDisplay}
                sizing={brandSizing}
              />
            </div>
          </section>

          <section
            className="order-4 lg:order-none lg:col-span-7 lg:row-start-3 space-y-8 mt-8 lg:mt-0"
            aria-label="Product description"
          >
            <ProductDescriptionSizingTabs
              descriptionHtml={descriptionHtml}
              productTitle={displayTitle}
              sizing={brandSizing}
              specifications={featureHighlights}
            />
          </section>
        </div>
        </article>

        {/* Videos extracted from description (e.g. YouTube embed) */}
        <ProductVideoSection
          videos={descriptionVideos}
          productTitle={displayTitle}
        />
        </>
        )}
        
        {!isCroTrialPdp ? (
          <ProductReviewSection
            productId={product.id}
            productHandle={product.handle}
            productTitle={product.title}
            initialReviews={initialReviews}
            initialStats={initialReviewStats}
          />
        ) : null}

        {/* Related Products - Already has intersection observer built-in */}
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
 * Render the 3rd-level collection page
 */
async function renderSubSubcategoryPage(
  category: string, 
  subcategory: string, 
  subsubcategory: string, 
  afterCursor: string | null = null,
  filterBrands?: string[],
  filterSizes?: string[],
  filterColors?: string[],
  sortBy?: 'featured' | 'on-sale' | 'newest' | 'oldest' | 'price-asc' | 'price-desc'
) {
  // Fetch products allocated to this sub-subcategory from product_category_assignments table
  const categoryPath = `/${category}/${subcategory}/${subsubcategory}`;
  const { products: filteredProducts, pageInfo, facets, totalCount } =
    await getProductsByCategoryForCollectionPage(
      categoryPath,
      36,
      afterCursor,
      {
        brands: filterBrands,
        sizes: filterSizes,
        colors: filterColors,
      },
      sortBy
    );

  // Total count is returned from getProductsByCategoryForCollectionPage (no separate API call needed)
  const totalProductCount = totalCount;

  // EMPTY CATEGORY REDIRECT: If this sub-subcategory has no products and no filters are applied,
  // redirect up to the parent subcategory
  if (totalProductCount === 0 && !filterBrands && !filterSizes && !filterColors && !afterCursor) {
    const { redirect } = await import('next/navigation');
    redirect(`/${category}/${subcategory}`);
  }

  // Allowed brands for the filter sidebar (same logic as 2nd-level pages)
  const allowedBrands = (category === 'pet' || category === 'accessories')
    ? undefined
    : await getAllowedBrandVendors();

  // Review stats for product cards
  const productHandles = filteredProducts.map((p) => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);
  const siloNav = await getCategorySiloNav(
    `/${category}/${subcategory}/${subsubcategory}`
  );

  const mappingTitle = getCollectionTitle(category, subcategory, subsubcategory);
  const breadcrumbs = getCollectionHierarchy(category, subcategory, subsubcategory);
  
  // Get rich content from database
  const content = await getCategoryContent(category, subcategory, subsubcategory);

  // Use database breadcrumb_label for the last breadcrumb item if set
  if (content?.breadcrumb_label && breadcrumbs.length > 0) {
    breadcrumbs[breadcrumbs.length - 1].label = content.breadcrumb_label;
  }
  
  // Use database content if available, otherwise fallback to mapping
  const pageTitle = content?.h1_title || mappingTitle;
  const description = content?.short_description || '';

  const parentCollectionLink = await getParentCollectionLink(
    content?.parent_url?.trim() || `/${category}/${subcategory}`
  );

  // Generate canonical URLs for all products (fast with Neon DB)
  // Product cards will link directly to category-based URLs
  const { getProductCanonicalUrls } = await import('@/lib/shopify/products');
  const productUrlsMap = await getProductCanonicalUrls(filteredProducts);

  // Serialize Maps to plain objects for Client Components (Maps are not JSON-serializable in RSC)
  const productUrls = Object.fromEntries(productUrlsMap);
  const reviewStats = Object.fromEntries(reviewStatsMap);
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Get parent collection info
  const parentCollectionTitle = getCollectionTitle(category, subcategory);

  const collectionSchema = generateCollectionSchemaFast({
    collectionName: pageTitle,
    collectionUrl: `${siteUrl}/${category}/${subcategory}/${subsubcategory}`,
    collectionDescription: content?.meta_description || `Shop premium ${pageTitle.toLowerCase()} from top equestrian brands. Quality products with fast shipping across Australia.`,
    breadcrumbs,
    products: filteredProducts,
    canonicalProductUrls: productUrlsMap,
    parentCollection: {
      name: parentCollectionTitle,
      url: `${siteUrl}/${category}/${subcategory}`,
    },
    siteUrl,
    maxProducts: 12, // Limit schema to 12 products for performance
  });

  return (
    <>
      {/* Structured Data - @graph with BreadcrumbList + CollectionPage + ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <CollectionBreadcrumbs breadcrumbs={breadcrumbs} />

        {/* Collection Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6">{pageTitle}</h1>
          
          {/* Collection Description */}
          <CollectionDescription
            description={description}
            parentCollectionLink={parentCollectionLink}
          />
        </div>

        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGridWithFilters
            products={filteredProducts}
            currentCategory={category}
            currentSubcategory={subcategory}
            siloNav={siloNav}
            pageInfo={pageInfo}
            totalCount={totalProductCount}
            allowedBrands={allowedBrands}
            serverFacets={facets}
            productUrls={productUrls}
            reviewStatsMap={reviewStats}
          />
        </Suspense>

        {/* Trust Signals */}
        <div className="mb-8 -mx-4 mt-8">
          <TrustSignals />
        </div>

        {/* Long Description (Rich Content) */}
        {content?.long_description && (
          <RichContent html={content.long_description} />
        )}

        {/* FAQ Section */}
        {content?.faq_items && content.faq_items.length > 0 && (
          <FAQSection 
            faqs={content.faq_items}
            categoryTitle={pageTitle}
          />
        )}

        {/* Related Categories */}
        {content?.related_categories && content.related_categories.length > 0 && (
          <RelatedCategories 
            categories={content.related_categories}
          />
        )}
      </div>
    </div>
    </>
  );
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, subcategory, product: thirdSegment } = await params;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(/\/$/, '');
  
  // Check if it's a collection
  const allowedProductTypes = await getProductTypesForCollection(category, subcategory, thirdSegment);
  
  if (allowedProductTypes.length > 0) {
    const collectionTitle = getCollectionTitle(category, subcategory, thirdSegment);
    const content = await getCategoryContent(category, subcategory, thirdSegment);
    const canonicalUrl = `${siteUrl}/${category}/${subcategory}/${thirdSegment}`;

    const title = content?.meta_title || `${collectionTitle} | The Equestrian`;
    const description = content?.meta_description || `Shop ${collectionTitle} products at The Equestrian. Quality equestrian supplies and equipment.`;

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
        images: [
          {
            url: `${siteUrl}/og-image.jpg`,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [`${siteUrl}/og-image.jpg`],
      },
    };
  }

  // It's a product - fetch and generate full metadata
  const { resolvedHandle, product } = await getResolvedProductBySlug(thirdSegment);
  const productPath = `/${category}/${subcategory}/${thirdSegment}`;

  if (!product) {
    return permanentRedirectMissingProduct(productPath, resolvedHandle);
  }
  if (!hasProductImage(product)) {
    return redirectMissingProduct(productPath, resolvedHandle);
  }

  const override = await getProductOverrideByHandle(resolvedHandle);
  if (override?.is_published_headless === false) {
    return redirectMissingProduct(productPath, resolvedHandle);
  }
  const productCanonicalPath = await getProductCanonicalUrl(product);
  const canonicalUrl = `${siteUrl}${productCanonicalPath}`;
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const seoMetadata = buildProductSeoMetadata({
    displayTitle,
    productDescription: product.description,
    override,
  });
  const title = resolveProductPageTitle(seoMetadata, override);
  const description = resolveProductPageDescription(seoMetadata, override);

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
