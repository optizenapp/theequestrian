import { notFound, permanentRedirect, redirect } from 'next/navigation';
import { Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { getProductsByCategory, getProductCanonicalUrls } from '@/lib/shopify/products';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { generateCollectionSchemaFast } from '@/lib/utils/collection-schema-fast';
import { 
  getProductTypesForCollection, 
  getSubcategoriesForCollection as getMappingSubcategories,
  getCollectionTitle,
  getCollectionHierarchy
} from '@/lib/mapping/collection-mapping';
import { TrustSignals } from '@/components/TrustSignals';
import { CategoryPills } from '@/components/CategoryPills';
import { CollectionDescription } from '@/components/CollectionDescription';
import { CollectionBreadcrumbs } from '@/components/CollectionBreadcrumbs';
import { getCategoryContent } from '@/lib/content/collections';
import { getAllowedBrandVendors } from '@/lib/filters/brand-filter-helper';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getManualRedirect } from '@/lib/redirects/manual';

// Lazy load below-the-fold components for better Speed Index
const ProductGridWithFilters = dynamicImport(
  () => import('@/components/filters/ProductGridWithFilters').then((mod) => ({ default: mod.ProductGridWithFilters })),
  {
    loading: () => <div className="text-center py-12 min-h-[400px] bg-gray-50 animate-pulse rounded-lg">Loading products...</div>,
  }
);

const FAQSection = dynamicImport(
  () => import('@/components/collection/FAQSection').then((mod) => ({ default: mod.FAQSection })),
  {
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

const RelatedCategories = dynamicImport(
  () => import('@/components/collection/RelatedCategories').then((mod) => ({ default: mod.RelatedCategories })),
  {
    loading: () => <div className="h-48 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

const RichContent = dynamicImport(
  () => import('@/components/collection/RichContent').then((mod) => ({ default: mod.RichContent })),
  {
    loading: () => <div className="h-64 bg-gray-50 animate-pulse rounded-lg" />,
  }
);

// ISR Configuration: Revalidate every 15 minutes
export const revalidate = 900;

interface SubcategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Subcategory Collection Page: /{category}/{subcategory}
 */
export default async function SubcategoryPage({ params, searchParams }: SubcategoryPageProps) {
  const { category, subcategory } = await params;
  const { cursor, brand, size, color } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brand ? (Array.isArray(brand) ? brand : brand.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  const manualRedirect = await getManualRedirect(`/${category}/${subcategory}`);
  if (manualRedirect) {
    if (manualRedirect.type === '301' || manualRedirect.type === '308') {
      permanentRedirect(manualRedirect.to);
    }
    redirect(manualRedirect.to);
  }

  // Fetch products allocated to this category from product_category_assignments table
  const categoryPath = `/${category}/${subcategory}`;
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
  
  // If no products found, check if category exists in collection_content
  if (totalCount === 0) {
    // Try to fetch category content to see if it's a valid category
    const content = await getCategoryContent(category, subcategory);
    if (!content) {
      notFound();
    }
  }

  // Total count is now returned from getProductsByTypes (no separate API call needed)
  const totalProductCount = totalCount;

  // EMPTY CATEGORY REDIRECT: If this subcategory has no products and no filters are applied,
  // redirect up to the parent category
  if (totalProductCount === 0 && !filterBrands && !filterSizes && !filterColors && !afterCursor) {
    redirect(`/${category}`);
  }
  
  // Get allowed brand vendors from brand-mapping.csv (only for equestrian categories)
  // For pet/accessories categories, show all brands
  const allowedBrands = (category === 'pet' || category === 'accessories') 
    ? undefined 
    : getAllowedBrandVendors();
  
  // Generate canonical URLs for all products (fast with Neon DB)
  // Product cards will link directly to category-based URLs
  const productUrls = await getProductCanonicalUrls(filteredProducts);

  // Fetch review stats for all products in one batch (server-side)
  const productHandles = filteredProducts.map(p => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);

  // Get sub-subcategories from our mapping (third level)
  const subSubcategories = await getMappingSubcategories(category, subcategory);
  
  // Get collection data
  const mappingTitle = getCollectionTitle(category, subcategory);
  const breadcrumbs = getCollectionHierarchy(category, subcategory);
  
  // Get rich content from database
  const content = await getCategoryContent(category, subcategory);
  
  // Use database content if available, otherwise fallback to mapping
  const pageTitle = content?.breadcrumb_label || content?.h1_title || mappingTitle;
  const description = content?.short_description || '';
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Get parent collection info for isPartOf relationship
  const parentCollectionTitle = getCollectionTitle(category);
  
  // Build "Best in Class" Collection Schema using FAST version (performance optimized)
  // Uses simple /products/{handle} URLs for schema (canonical URLs still used in product grid)
  const collectionSchema = generateCollectionSchemaFast({
    collectionName: pageTitle,
    collectionUrl: `${siteUrl}/${category}/${subcategory}`,
    collectionDescription: content?.meta_description || `Shop premium ${pageTitle.toLowerCase()} from top equestrian brands. Quality products with fast shipping across Australia.`,
    breadcrumbs,
    products: filteredProducts,
    canonicalProductUrls: productUrls,
    parentCollection: {
      name: parentCollectionTitle,
      url: `${siteUrl}/${category}`,
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
          
          <CollectionDescription 
            description={description}
          />
        </div>

        {/* Trust Signals */}
        <div className="mb-8 -mx-4">
          <TrustSignals />
        </div>

        {/* Sub-subcategories as Pills (3rd level) */}
        <div className="mb-8">
          <CategoryPills 
            categories={subSubcategories.map(s => ({ handle: s.handle, label: s.label }))}
            basePath={`/${category}/${subcategory}`}
          />
        </div>

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
export async function generateMetadata({ params }: SubcategoryPageProps): Promise<Metadata> {
  const { category, subcategory } = await params;
  const content = await getCategoryContent(category, subcategory);
  const mappingTitle = getCollectionTitle(category, subcategory);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const canonicalUrl = `${siteUrl}/${category}/${subcategory}`;

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
 * Generate static params for popular subcategory combinations
 * Pre-renders the most visited pages for instant loading
 */
export async function generateStaticParams() {
  // Pre-render popular subcategory combinations from mapping
  // You can expand this list based on analytics
  const popularPaths = [
    { category: 'horse', subcategory: 'boots' },
    { category: 'horse', subcategory: 'rugs' },
    { category: 'horse', subcategory: 'bits' },
    { category: 'horse', subcategory: 'grooming' },
    { category: 'horse', subcategory: 'saddles' },
    { category: 'rider', subcategory: 'helmets' },
    { category: 'rider', subcategory: 'gloves' },
    { category: 'rider', subcategory: 'boots' },
    { category: 'clothing', subcategory: 'womens' },
    { category: 'clothing', subcategory: 'mens' },
    { category: 'pet', subcategory: 'dog' },
    { category: 'pet', subcategory: 'cat' },
  ];

  return popularPaths;
}
