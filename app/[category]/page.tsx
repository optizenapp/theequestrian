import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getProductsByCategory } from '@/lib/shopify/products';
import { getProductByHandle, getProductCanonicalUrl, getProductCanonicalUrls, hasProductImage } from '@/lib/shopify/products';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getCategoryContent } from '@/lib/content/collections';
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
import Link from 'next/link';
import type { Metadata } from 'next';
import { getManualRedirect } from '@/lib/redirects/manual';

// Lazy load below-the-fold components for better Speed Index
const ProductGridWithFilters = dynamic(
  () => import('@/components/filters/ProductGridWithFilters').then((mod) => ({ default: mod.ProductGridWithFilters })),
  {
    loading: () => <div className="text-center py-12 min-h-[400px] bg-gray-50 animate-pulse rounded-lg">Loading products...</div>,
  }
);

const FAQSection = dynamic(
  () => import('@/components/collection/FAQSection').then((mod) => ({ default: mod.FAQSection })),
  {
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

const RelatedCategories = dynamic(
  () => import('@/components/collection/RelatedCategories').then((mod) => ({ default: mod.RelatedCategories })),
  {
    loading: () => <div className="h-48 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

const RichContent = dynamic(
  () => import('@/components/collection/RichContent').then((mod) => ({ default: mod.RichContent })),
  {
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

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
 * Uses the mapping CSV to determine which products to show
 * based on their productType field
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const { cursor, brand, size, color } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brand ? (Array.isArray(brand) ? brand : brand.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  const manualRedirect = await getManualRedirect(`/${category}`);
  if (manualRedirect) {
    if (manualRedirect.type === '301' || manualRedirect.type === '308') {
      permanentRedirect(manualRedirect.to);
    }
    redirect(manualRedirect.to);
  }

  // Fetch products allocated to this category from product_category_assignments table
  const categoryPath = `/${category}`;
  const { products: filteredProducts, pageInfo, facets, totalCount } = await getProductsByCategory(
    categoryPath,
    36, 
    afterCursor,
    { 
      brands: filterBrands,
      sizes: filterSizes,
      colors: filterColors
    }
  );
  
  // If no products found, try as a product (fallback)
  if (totalCount === 0) {
    const product = await getProductByHandle(category);
    
    if (!product) {
      notFound();
    }
    if (!hasProductImage(product)) {
      notFound();
    }

    // If product has a primary collection, redirect to canonical URL
    if ((product as any).primaryCollection) {
      const canonicalUrl = await getProductCanonicalUrl(product);
      redirect(canonicalUrl);
    }

    // Render fallback product page
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

              {/* Variants */}
              {product.variants.edges.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Options:</h3>
                  <div className="space-y-2">
                    {product.variants.edges.map(({ node: variant }) => (
                      <div key={variant.id} className="flex items-center gap-2">
                        <span>{variant.title}</span>
                        <span className="text-gray-600">
                          - {variant.price.currencyCode} {variant.price.amount}
                        </span>
                        {!variant.availableForSale && (
                          <span className="text-red-500 text-sm">(Out of stock)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collections */}
              {product.collections.edges.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Categories:</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.collections.edges.map(({ node: collection }) => (
                      <a
                        key={collection.id}
                        href={`/${collection.handle}`}
                        className="px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
                      >
                        {collection.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
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

  // Products already fetched above via getProductsByCategory

  // Total count is now returned from getProductsByTypes (no separate API call needed)
  const totalProductCount = totalCount;

  // EMPTY CATEGORY REDIRECT: If this category has no products and no filters are applied,
  // redirect to the homepage or a parent category (if applicable)
  if (totalProductCount === 0 && !filterBrands && !filterSizes && !filterColors && !afterCursor) {
    // For top-level categories with no products, redirect to homepage
    redirect('/');
  }
  
  // Generate canonical URLs for all products (fast with Neon DB)
  // Product cards will link directly to category-based URLs
  const productUrls = await getProductCanonicalUrls(filteredProducts);

  // Fetch review stats for all products in one batch (server-side)
  // This avoids 36+ client-side API calls
  const productHandles = filteredProducts.map(p => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);
  
  // Get allowed brand vendors from brand-mapping.csv (only for equestrian categories)
  // For pet/accessories categories, show all brands
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

  // Build "Best in Class" Collection Schema using FAST version (performance optimized)
  // Uses simple /products/{handle} URLs for schema (canonical URLs still used in product grid)
  const collectionSchema = generateCollectionSchemaFast({
    collectionName: pageTitle,
    collectionUrl: `${siteUrl}/${category}`,
    collectionDescription: content?.meta_description || `Shop premium ${pageTitle.toLowerCase()} from top equestrian brands. Quality products with fast shipping across Australia.`,
    breadcrumbs,
    products: filteredProducts,
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
          
          {/* Short Description */}
          <CollectionDescription 
            description={description}
          />
        </div>

        {/* Trust Signals */}
        <div className="mb-8 -mx-4">
          <TrustSignals />
        </div>

        {/* Subcategories as Pills */}
        <div className="mb-8">
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
 * This pre-renders the most important pages for instant loading
 */
export async function generateStaticParams() {
  // Pre-render all top-level categories from mapping
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
