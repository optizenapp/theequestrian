import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getProductsByTypes, getProductCountByTypes } from '@/lib/shopify/products';
import { getProductByHandle, getProductCanonicalUrl, getProductCanonicalUrls } from '@/lib/shopify/products';
import { getCategoryContent } from '@/lib/content/collections';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
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
import Link from 'next/link';
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
 * Uses the mapping CSV to determine which products to show
 * based on their productType field
 */
export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { category } = await params;
  const { cursor, brand } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brand ? (Array.isArray(brand) ? brand : brand.split(',')) : undefined;

  // Check if this category exists in our mapping
  const allowedProductTypes = getProductTypesForCollection(category);
  
  if (allowedProductTypes.length === 0) {
    // Try as a product (fallback)
    const product = await getProductByHandle(category);
    
    if (!product) {
      notFound();
    }

    // If product has a primary collection, redirect to canonical URL
    if ((product as any).primaryCollection) {
      const canonicalUrl = getProductCanonicalUrl(product);
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

  // Fetch products with pagination (36 per page)
  const { products: filteredProducts, pageInfo, facets } = await getProductsByTypes(
    allowedProductTypes, 
    36, 
    afterCursor,
    { brands: filterBrands }
  );

  // Get total product count
  const totalProductCount = await getProductCountByTypes(allowedProductTypes);
  
  // Calculate canonical URLs for all products (server-side only) - batch operation
  const productUrls = getProductCanonicalUrls(filteredProducts);
  
  // Get allowed brand vendors from brand-mapping.csv (only for equestrian categories)
  // For pet/accessories categories, show all brands
  const allowedBrands = (category === 'pet' || category === 'accessories') 
    ? undefined 
    : getAllowedBrandVendors();

  // Get subcategories from our mapping
  const subcategories = getMappingSubcategories(category);

  // Get collection title from mapping (Fallback)
  const mappingTitle = getCollectionTitle(category);
  const breadcrumbs = getCollectionHierarchy(category);
  
  // Get rich content from CSV
  const content = getCategoryContent(category);
  
  // Use CSV content if available, otherwise fallback to mapping
  const pageTitle = content?.h1_title || mappingTitle;
  const description = content?.short_description || '';
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Build BreadcrumbList structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": siteUrl || "/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": pageTitle,
        "item": `${siteUrl}/${category}`
      }
    ]
  };

  // Build CollectionPage structured data with hasOfferCatalog
  const collectionSchema = generateCollectionStructuredData(
    pageTitle,
    `${siteUrl}/${category}`,
    content?.meta_description || `Shop ${pageTitle} products at The Equestrian`,
    undefined,
    filteredProducts,
    undefined
  );

  return (
    <>
      {/* Structured Data - BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      
      {/* Structured Data - CollectionPage */}
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
  const content = getCategoryContent(category);
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
