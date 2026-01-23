import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getProductsByTypes, getProductByHandle, getProductCanonicalUrl, getRecommendedProducts } from '@/lib/shopify/products';
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
import { getCategoryContent } from '@/lib/content/collections';
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
import ProductReviewSection from '@/components/reviews/ProductReviewSection';
import { ProductPageReviewBadge } from '@/components/reviews/ProductPageReviewBadge';
import { getProductBulletPoints } from '@/lib/products/bullet-points';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { ShopifyProduct } from '@/types/shopify';

// ISR Configuration: Revalidate every 15 minutes
export const revalidate = 900;

interface PageProps {
  params: Promise<{
    category: string;
    subcategory: string;
    product: string; // This segment can be either a product handle OR a sub-subcategory
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Dynamic Page: /{category}/{subcategory}/{product}
 * 
 * This route handles two scenarios:
 * 1. Sub-subcategory collection page (e.g., /horse/rugs/turnout)
 * 2. Product page fallback (legacy URL support) -> redirects to canonical
 */
export default async function Page({ params, searchParams }: PageProps) {
  const { category, subcategory, product: thirdSegment } = await params;
  const { cursor, brand, size, color } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brand ? (Array.isArray(brand) ? brand : brand.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  // 1. Check if this is a valid sub-subcategory
  const allowedProductTypes = getProductTypesForCollection(category, subcategory, thirdSegment);
  
  // If it maps to a collection, render the collection page
  if (allowedProductTypes.length > 0) {
    return renderSubSubcategoryPage(category, subcategory, thirdSegment, afterCursor, filterBrands, filterSizes, filterColors);
  }

  // 2. If not a category, assume it's a product handle
  const product = await getProductByHandle(thirdSegment);

  if (!product) {
    notFound();
  }

  // Get the canonical URL for this product
  const canonicalUrl = getProductCanonicalUrl(product);
  const currentPath = `/${category}/${subcategory}/${thirdSegment}`;
  
  // If we're already at the canonical URL, render the product page
  // Otherwise, redirect to the canonical URL
  if (currentPath !== canonicalUrl) {
    redirect(canonicalUrl);
  }
  
  // Render the product page (we're at the canonical URL)
  return renderProductPage(product);
}

/**
 * Render a product page
 */
async function renderProductPage(product: ShopifyProduct) {
  const price = product.priceRange.minVariantPrice;
  
  // Calculate compareAtPrice from variants
  const compareAtPrice = product.variants.edges
    .map(({ node }) => node.compareAtPrice)
    .filter((cp): cp is { amount: string; currencyCode: string } => cp !== null && cp !== undefined)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
  
  // Build breadcrumb paths from product type using mapping
  const breadcrumbPaths = product.productType 
    ? getBreadcrumbsForProduct(product.productType)
    : [];
  
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

  // Generate unified @graph with BreadcrumbList + Product (including review stats)
  const canonicalUrl = getProductCanonicalUrl(product);
  const primaryBreadcrumb = Array.isArray(breadcrumbSchemas) ? breadcrumbSchemas[0] : breadcrumbSchemas;
  const schemaGraph = generateProductSchemaGraph(product, canonicalUrl, primaryBreadcrumb, siteUrl, reviewStats);

  // Fetch related products (limit 4)
  const relatedProducts = await getRecommendedProducts(4, product.productType, product.handle);
  
  // Fetch review stats for related products (server-side batch)
  const relatedHandles = relatedProducts.map(p => p.handle);
  const relatedReviewStatsMap = await getReviewStatsForProducts(relatedHandles);

  // Get product-specific bullet points
  const featureHighlights = getProductBulletPoints(product.id);

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

        {/* Mobile title & rating */}
        <div className="lg:hidden mt-4 mb-8 space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">{product.title}</h1>
          <ProductPageReviewBadge productId={product.id} productHandle={product.handle} />
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
            <ProductImageGallery 
              images={product.images}
              productTitle={product.title}
            />
            <ProductDescription html={product.descriptionHtml} productTitle={product.title} />
          </div>

          {/* Right Column: Product Info & Buy Box (Sticky) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6 lg:mb-0">
            
            {/* Title & Rating */}
            <div className="hidden lg:block">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h2>
              <div className="mb-4">
                <ProductPageReviewBadge productId={product.id} productHandle={product.handle} />
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
            </div>

            {/* Buy Box */}
            <div className="bg-surface rounded-2xl p-6 shadow-sm border border-gray-100">
              <ProductBuyBox product={product} />
            </div>
          </div>
        </div>
        
        {/* Sizing Guide Link - Between Description and Reviews */}
        <SizingGuideLink
          vendor={product.vendor}
          productType={product.productType}
          productTitle={product.title}
          productHandle={product.handle}
        />
        
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
 * Render the 3rd-level collection page
 */
async function renderSubSubcategoryPage(
  category: string, 
  subcategory: string, 
  subsubcategory: string, 
  afterCursor: string | null = null,
  filterBrands?: string[],
  filterSizes?: string[],
  filterColors?: string[]
) {
  // Get allowed product types for this collection
  const allowedProductTypes = getProductTypesForCollection(category, subcategory, subsubcategory);
  
  // Fetch products with pagination (36 per page)
  const { products: filteredProducts, pageInfo, totalCount } = await getProductsByTypes(
    allowedProductTypes, 
    36, 
    afterCursor,
    {
      brands: filterBrands,
      sizes: filterSizes,
      colors: filterColors
    }
  );

  // Total count is now returned from getProductsByTypes (no separate API call needed)
  const totalProductCount = totalCount;

  // Get sibling sub-subcategories (for pills)
  const allSubSubcategories = getMappingSubcategories(category, subcategory);
  const siblingSubSubcategories = allSubSubcategories.filter(s => s.handle !== subsubcategory);

  // Get collection titles and content
  const mappingTitle = getCollectionTitle(category, subcategory, subsubcategory);
  const breadcrumbs = getCollectionHierarchy(category, subcategory, subsubcategory);
  
  // Get rich content from CSV
  const content = getCategoryContent(category, subcategory, subsubcategory);
  
  // Use CSV content if available, otherwise fallback to mapping
  const pageTitle = content?.h1_title || mappingTitle;
  const description = content?.short_description || '';
  
  // Generate canonical URLs for all products (fast with Neon DB)
  // Product cards will link directly to category-based URLs
  const { getProductCanonicalUrls } = await import('@/lib/shopify/products');
  const productUrls = getProductCanonicalUrls(filteredProducts);
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Get parent collection info
  const parentCollectionTitle = getCollectionTitle(category, subcategory);

  // Build "Best in Class" Collection Schema using FAST version (performance optimized)
  // Uses simple /products/{handle} URLs for schema (canonical URLs still used in product grid)
  const collectionSchema = generateCollectionSchemaFast({
    collectionName: pageTitle,
    collectionUrl: `${siteUrl}/${category}/${subcategory}/${subsubcategory}`,
    collectionDescription: content?.meta_description || `Shop premium ${pageTitle.toLowerCase()} from top equestrian brands. Quality products with fast shipping across Australia.`,
    breadcrumbs,
    products: filteredProducts,
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

        {/* Trust Signals */}
        <div className="mb-8 -mx-4">
          <TrustSignals />
        </div>

        {/* Collection Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-6">{pageTitle}</h1>
          
          {/* Collection Description */}
          <CollectionDescription 
            description={description}
          />
          
          {/* Sibling Sub-subcategories Pills */}
          {siblingSubSubcategories.length > 0 && (
            <CategoryPills 
              categories={siblingSubSubcategories.map(s => ({ handle: s.handle, label: s.label }))}
              basePath={`/${category}/${subcategory}`}
            />
          )}
        </div>

        {/* Products Grid with Filters */}
        <Suspense fallback={<div className="text-center py-12">Loading products...</div>}>
          <ProductGridWithFilters
            products={filteredProducts}
            currentCategory={category}
            currentSubcategory={subcategory}
            pageInfo={pageInfo}
            totalCount={totalProductCount}
            productUrls={productUrls}
          />
        </Suspense>

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
  const allowedProductTypes = getProductTypesForCollection(category, subcategory, thirdSegment);
  
  if (allowedProductTypes.length > 0) {
    const collectionTitle = getCollectionTitle(category, subcategory, thirdSegment);
    const content = getCategoryContent(category, subcategory, thirdSegment);
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

  // If it's a product (will redirect anyway, but for completeness)
  return {
    title: 'The Equestrian',
  };
}
