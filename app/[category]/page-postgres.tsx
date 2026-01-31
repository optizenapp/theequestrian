/**
 * Category Collection Page (Postgres Version)
 * 
 * This is the NEW version that uses Vercel Postgres for fast queries
 * To enable: rename this file to page.tsx and rename the old page.tsx to page-shopify.tsx
 * 
 * Performance: <200ms (vs 10-12s with Shopify direct queries)
 */

import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getProductByHandle } from '@/lib/shopify/products';
import { getProductsByTypesFromDB } from '@/lib/products/postgres-adapter';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getCategoryContent } from '@/lib/content/collections';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionSchemaFast } from '@/lib/utils/collection-schema-fast';
import { 
  getProductTypesForCollection, 
  getSubcategoriesForCollection as getMappingSubcategories,
  getCollectionTitle,
  getCollectionHierarchy
} from '@/lib/mapping/collection-mapping';
import { getAllowedBrandVendors } from '@/lib/filters/brand-filter-helper';
import { TrustSignals } from '@/components/TrustSignals';
import { CategoryPills } from '@/components/CategoryPills';
import { CollectionDescription } from '@/components/CollectionDescription';
import { CollectionBreadcrumbs } from '@/components/CollectionBreadcrumbs';
import { FAQSection } from '@/components/collection/FAQSection';
import { RelatedCategories } from '@/components/collection/RelatedCategories';
import { RichContent } from '@/components/collection/RichContent';
import type { Metadata } from 'next';

// ISR Configuration: Revalidate every 15 minutes
export const revalidate = 900;

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Category Collection Page: /{category}
 * 
 * Uses Postgres for fast product queries (200ms vs 10s)
 * Prices and inventory are hydrated client-side for 100% accuracy
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const { cursor, brand, size, color } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brand ? (Array.isArray(brand) ? brand : brand.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  // Check if this category exists in our mapping
  const allowedProductTypes = await getProductTypesForCollection(category);
  
  if (allowedProductTypes.length === 0) {
    // Try as a product (fallback)
    const product = await getProductByHandle(category);
    
    if (!product) {
      notFound();
    }

    // If product has a primary collection, redirect to canonical URL
    if ((product as any).primaryCollection) {
      const { getProductCanonicalUrl } = await import('@/lib/shopify/products');
      const canonicalUrl = getProductCanonicalUrl(product);
      redirect(canonicalUrl);
    }

    // Render fallback product page (same as before)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Images */}
            <div>
              {product.images.edges.length > 0 && (
                <img
                  src={product.images.edges[0].node.url}
                  alt={product.images.edges[0].node.altText || product.title}
                  className="w-full rounded-lg"
                />
              )}
            </div>

            {/* Product Details */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
              
              <div className="text-2xl font-semibold mb-6">
                {product.priceRange.minVariantPrice.currencyCode}{' '}
                {product.priceRange.minVariantPrice.amount}
              </div>

              <div 
                className="prose mb-6"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />

              <button
                className="w-full bg-black text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300"
                disabled={!product.availableForSale}
              >
                {product.availableForSale ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log(`[CategoryPage] Fetching products for ${category} (${allowedProductTypes.length} types)`);
  const startTime = Date.now();

  // Fetch products from Postgres (FAST - 50-200ms)
  const { products: filteredProducts, pageInfo, facets, totalCount } = await getProductsByTypesFromDB(
    allowedProductTypes, 
    36, 
    afterCursor,
    { 
      brands: filterBrands,
      sizes: filterSizes,
      colors: filterColors
    }
  );

  const queryTime = Date.now() - startTime;
  console.log(`[CategoryPage] ✅ Query completed in ${queryTime}ms (${filteredProducts.length} products)`);

  // Total count from Postgres
  const totalProductCount = totalCount;
  
  // PERFORMANCE: Skip canonical URL generation for now - use simple product URLs
  const productUrls = new Map<string, string>();

  // Fetch review stats for all products in one batch (server-side)
  const productHandles = filteredProducts.map(p => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);
  
  // Get allowed brand vendors from brand-mapping.csv
  const allowedBrands = (category === 'pet' || category === 'accessories') 
    ? undefined 
    : getAllowedBrandVendors();

  // Get subcategories from our mapping
  const subcategories = await getMappingSubcategories(category);

  // Get collection title from mapping (Fallback)
  const mappingTitle = getCollectionTitle(category);
  const breadcrumbs = getCollectionHierarchy(category);
  
  // Get rich content from database
  const content = await getCategoryContent(category);
  
  // Use database content if available, otherwise fallback to mapping
  const pageTitle = content?.h1_title || mappingTitle;
  const description = content?.short_description || '';
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Build "Best in Class" Collection Schema
  const collectionSchema = generateCollectionSchemaFast({
    collectionName: pageTitle,
    collectionUrl: `${siteUrl}/${category}`,
    collectionDescription: content?.meta_description || `Shop premium ${pageTitle.toLowerCase()} from top equestrian brands. Quality products with fast shipping across Australia.`,
    breadcrumbs,
    products: filteredProducts,
    siteUrl,
    maxProducts: 12,
  });

  return (
    <>
      {/* Structured Data */}
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
          
          {/* Short Description */}
          <CollectionDescription 
            description={description}
          />
          
          {/* Subcategories as Pills */}
          <CategoryPills 
            categories={subcategories.map(s => ({ handle: s.handle, label: s.label }))}
            basePath={`/${category}`}
          />
        </div>

        {/* Products Grid with Filters */}
        <Suspense fallback={<div className="text-center py-12">Loading products...</div>}>
          <ProductGridWithFilters
            products={filteredProducts}
            currentCategory={category}
            pageInfo={pageInfo}
            totalCount={totalProductCount}
            allowedBrands={allowedBrands}
            serverFacets={facets}
            productUrls={productUrls}
            reviewStatsMap={reviewStatsMap}
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
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const content = await getCategoryContent(category);
  const mappingTitle = getCollectionTitle(category);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const canonicalUrl = `${siteUrl}/${category}`;

  const title = content?.meta_title || `${mappingTitle} | The Equestrian`;
  const description = content?.meta_description || `Shop ${mappingTitle} products at The Equestrian. Quality equestrian supplies and equipment.`;

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

/**
 * Generate static params for all top-level categories at build time
 */
export async function generateStaticParams() {
  const topLevelCategories = [
    'horse',
    'rider',
    'clothing',
    'pet',
    'accessories',
  ];

  return topLevelCategories.map((category) => ({
    category,
  }));
}
