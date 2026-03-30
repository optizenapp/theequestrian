import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
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
  getSubcategoriesForCollection as getMappingSubcategories,
  getBreadcrumbsForProduct
} from '@/lib/mapping/collection-mapping';
import { TrustSignals } from '@/components/TrustSignals';
import { CategoryPills } from '@/components/CategoryPills';
import { CollectionDescription } from '@/components/CollectionDescription';
import { CollectionBreadcrumbs } from '@/components/CollectionBreadcrumbs';
import { FAQSection } from '@/components/collection/FAQSection';
import { RelatedCategories } from '@/components/collection/RelatedCategories';
import { RichContent } from '@/components/collection/RichContent';
import { getCategoryContent, getParentCollectionLink } from '@/lib/content/collections';
import { ProductImageGallery } from '@/components/ProductImageGallery';
import { ProductBreadcrumbs } from '@/components/ProductBreadcrumbs';
import { ProductBuyBox } from '@/components/product/ProductBuyBox';
import { ProductDescription } from '@/components/product/ProductDescription';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { SizingGuideLink } from '@/components/product/SizingGuideLink';
import { generateBreadcrumbSchema } from '@/lib/utils/breadcrumb-schema';
import { generateProductSchemaGraph } from '@/lib/utils/product-schema';
import { getReviewStatsWithCache } from '@/lib/reviews/get-review-stats';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getAllowedBrandVendors } from '@/lib/filters/brand-filter-helper';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import { LazySection } from '@/components/LazySection';
import type { Metadata } from 'next';
import type { ShopifyProduct } from '@/types/shopify';
import { getManualRedirect } from '@/lib/redirects/manual';
import { getProductOverrideByHandle, resolveProductHandleFromSlug } from '@/lib/content/product-overrides';
import { buildProductSeoMetadata } from '@/lib/seo/product-metadata';
import { cache } from 'react';
import { ProductViewTracker } from '@/components/analytics/ProductViewTracker';

// Lazy load heavy below-the-fold components to improve LCP
const ProductReviewSection = dynamicImport(
  () => import('@/components/reviews/ProductReviewSection'),
  {
    loading: () => <div className="h-96 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

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
  const { cursor, brand, size, color, sort } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const sortBy =
    typeof sort === 'string' ? (sort as 'featured' | 'on-sale' | 'newest' | 'oldest' | 'price-asc' | 'price-desc') : undefined;
  const filterBrands = brand ? (Array.isArray(brand) ? brand : brand.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  const manualRedirect = await getManualRedirect(`/${category}/${subcategory}/${thirdSegment}`);
  if (manualRedirect) {
    if (manualRedirect.type === '301' || manualRedirect.type === '308') {
      permanentRedirect(manualRedirect.to);
    }
    redirect(manualRedirect.to);
  }

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
    notFound();
  }
  if (!hasProductImage(product)) {
    notFound();
  }
  const productOverride = await getProductOverrideByHandle(resolvedHandle);
  if (productOverride?.is_published_headless === false) {
    notFound();
  }

  // Get the canonical URL for this product
  const canonicalUrl = await getProductCanonicalUrl(product);
  const currentPath = `/${category}/${subcategory}/${thirdSegment}`;
  
  // If we're already at the canonical URL, render the product page
  // Otherwise, redirect to the canonical URL
  if (currentPath !== canonicalUrl) {
    redirect(canonicalUrl);
  }
  
  // Render the product page (we're at the canonical URL)
  return renderProductPage(product, currentPath);
}

/**
 * Render a product page
 */
async function renderProductPage(product: ShopifyProduct, canonicalPath?: string) {
  if (!hasProductImage(product)) {
    notFound();
  }
  const override = await getProductOverrideByHandle(product.handle);
  if (override?.is_published_headless === false) {
    notFound();
  }
  const displayTitle = override?.use_headless_title ? (override?.title_override || product.title) : product.title;
  const descriptionHtml = override?.use_headless_description
    ? (override?.description_html || product.descriptionHtml)
    : product.descriptionHtml;
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

  // Fetch review stats for schema (server-side)
  const reviewStats = await getReviewStatsWithCache(product.handle);
  const reviewBadgeStats = reviewStats
    ? {
        total_reviews: reviewStats.reviewCount,
        average_rating: reviewStats.averageRating,
      }
    : null;

  // Generate unified @graph with BreadcrumbList + Product (including review stats)
  const canonicalUrl = canonicalPath || await getProductCanonicalUrl(product);
  const schemaGraph = generateProductSchemaGraph(
    { ...product, title: displayTitle },
    canonicalUrl,
    breadcrumbSchemas,
    siteUrl,
    reviewStats
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
  const showArcEquineGelPromo = product.handle === 'arcequine-complete-kit';

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
          productTitle={displayTitle}
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

        <article aria-labelledby="pdp-product-title">
        {/* Mobile title & rating */}
        <div className="lg:hidden mt-4 mb-8 space-y-2">
          <h1 id="pdp-product-title" className="text-3xl font-bold text-gray-900">{displayTitle}</h1>
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
          <section className="lg:col-span-7 space-y-8" aria-label="Product images and description">
            <ProductImageGallery 
              images={product.images}
              productTitle={product.title}
            />
            <ProductDescription html={descriptionHtml} productTitle={displayTitle} />
          </section>

          {/* Right Column: Product Info & Buy Box (Sticky) */}
          <section className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 lg:mb-0" aria-label="Purchase options">
            
            {/* Title & Rating */}
            <div className="hidden lg:block">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayTitle}</h1>
              <div className="mb-4">
                <ProductPageReviewBadge
                  productId={product.id}
                  productHandle={product.handle}
                  initialStats={reviewBadgeStats}
                />
              </div>

              {/* Key Features */}
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
              <ProductBuyBox product={product} />
            </div>
          </section>
        </div>
        </article>
        
        {/* Sizing Guide Link - Between Description and Reviews */}
        <SizingGuideLink
          vendor={product.vendor}
          productType={product.productType}
          productTitle={product.title}
          productHandle={product.handle}
        />
        
        {/* Reviews Section - Full Width Below Product */}
        <LazySection
          fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-lg" />}
          minHeight="24rem"
          rootMargin="300px"
        >
          <ProductReviewSection
            productId={product.id}
            productHandle={product.handle}
            productTitle={product.title}
          />
        </LazySection>

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

  // Get sibling sub-subcategories (for pills)
  const allSubSubcategories = await getMappingSubcategories(category, subcategory);
  const siblingSubSubcategories = allSubSubcategories.filter(s => s.handle !== subsubcategory);

  // Get collection titles and content
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

        {/* Sibling Sub-subcategories Pills */}
        {siblingSubSubcategories.length > 0 && (
          <CategoryPills 
            categories={siblingSubSubcategories.map(s => ({ handle: s.handle, label: s.label }))}
            basePath={`/${category}/${subcategory}`}
            sectionHeading={`Shop ${getCollectionTitle(category, subcategory)} by Type`}
          />
        )}

        {/* Products Grid with Filters */}
        <Suspense fallback={<div className="text-center py-12">Loading products...</div>}>
          <ProductGridWithFilters
            products={filteredProducts}
            currentCategory={category}
            currentSubcategory={subcategory}
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  
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
  const canonicalUrl = `${siteUrl}/${category}/${subcategory}/${thirdSegment}`;
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
