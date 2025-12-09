import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getProductsByTypes } from '@/lib/shopify/products';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
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
import Link from 'next/link';
import type { Metadata } from 'next';

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
  const { cursor } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;

  // Check if this path exists in our mapping
  const allowedProductTypes = getProductTypesForCollection(category, subcategory);
  
  if (allowedProductTypes.length === 0) {
    notFound();
  }

  // Fetch products with pagination (36 per page)
  const { products: filteredProducts, pageInfo } = await getProductsByTypes(allowedProductTypes, 36, afterCursor);

  // Get sub-subcategories from our mapping (third level)
  const subSubcategories = getMappingSubcategories(category, subcategory);
  
  // Get collection data
  const mappingTitle = getCollectionTitle(category, subcategory);
  const breadcrumbs = getCollectionHierarchy(category, subcategory);
  
  // Get rich content from CSV
  const content = getCategoryContent(category, subcategory);
  
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
      ...breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": crumb.label,
        "item": `${siteUrl}${crumb.href}`
      }))
    ]
  };

  // Build CollectionPage structured data
  const collectionSchema = generateCollectionStructuredData(
    pageTitle,
    `${siteUrl}/${category}/${subcategory}`,
    content?.meta_description || `Shop ${pageTitle} products at The Equestrian`,
    undefined,
    filteredProducts
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
          
          <CollectionDescription 
            description={description}
          />
          
          {/* Sub-subcategories as Pills (3rd level) */}
          <CategoryPills 
            categories={subSubcategories.map(s => ({ handle: s.handle, label: s.label }))}
            basePath={`/${category}/${subcategory}`}
          />
          
          <p className="text-base text-gray-600">
            {filteredProducts.length} products
          </p>
        </div>

        {/* Products Grid with Filters */}
        <Suspense fallback={<div className="text-center py-12">Loading products...</div>}>
          <ProductGridWithFilters
            products={filteredProducts}
            currentCategory={category}
            currentSubcategory={subcategory}
            pageInfo={pageInfo}
          />
        </Suspense>
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
  const content = getCategoryContent(category, subcategory);
  const mappingTitle = getCollectionTitle(category, subcategory);

  if (content) {
    return {
      title: content.meta_title,
      description: content.meta_description,
    };
  }

  return {
    title: `${mappingTitle} | The Equestrian`,
    description: `Shop ${mappingTitle} products at The Equestrian. Quality equestrian supplies and equipment.`,
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
