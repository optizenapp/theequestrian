import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getProductsByTypes, getProductByHandle } from '@/lib/shopify/products';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
import { 
  getProductTypesForCollection, 
  getCollectionTitle,
  getCollectionHierarchy
} from '@/lib/mapping/collection-mapping';
import { TrustSignals } from '@/components/TrustSignals';
import { CollectionDescription } from '@/components/CollectionDescription';
import { CollectionBreadcrumbs } from '@/components/CollectionBreadcrumbs';
import { getCategoryContent } from '@/lib/content/collections';
import Link from 'next/link';
import type { Metadata } from 'next';

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
  const { cursor } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;

  // 1. Check if this is a valid sub-subcategory
  const allowedProductTypes = getProductTypesForCollection(category, subcategory, thirdSegment);
  
  // If it maps to a collection, render the collection page
  if (allowedProductTypes.length > 0) {
    return renderSubSubcategoryPage(category, subcategory, thirdSegment, afterCursor);
  }

  // 2. If not a category, assume it's a product handle and redirect
  // Verify product exists before redirecting (optional, but good for UX)
  const product = await getProductByHandle(thirdSegment);

  if (!product) {
    notFound();
  }

  // Always redirect to canonical URL (301 permanent)
  redirect(`/products/${thirdSegment}`);
}

/**
 * Render the 3rd-level collection page
 */
async function renderSubSubcategoryPage(category: string, subcategory: string, subsubcategory: string, afterCursor: string | null = null) {
  // Get allowed product types for this collection
  const allowedProductTypes = getProductTypesForCollection(category, subcategory, subsubcategory);
  
  // Fetch products with pagination (36 per page)
  const { products: filteredProducts, pageInfo } = await getProductsByTypes(allowedProductTypes, 36, afterCursor);

  // Get collection titles and content
  const mappingTitle = getCollectionTitle(category, subcategory, subsubcategory);
  const breadcrumbs = getCollectionHierarchy(category, subcategory, subsubcategory);
  
  // Get rich content from CSV
  const content = getCategoryContent(category, subcategory, subsubcategory);
  
  // Use CSV content if available, otherwise fallback to mapping
  const pageTitle = content?.h1_title || mappingTitle;
  const description = content?.short_description || '';
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  // Build BreadcrumbList structured data
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 2, // +2 because Home is position 1
      "name": crumb.label,
      "item": `${siteUrl}${crumb.href}`
    }))
  };

  // Insert Home at position 1
  breadcrumbSchema.itemListElement.unshift({
    "@type": "ListItem",
    "position": 1,
    "name": "Home",
    "item": siteUrl || "/"
  });

  // Build CollectionPage structured data
  const collectionSchema = generateCollectionStructuredData(
    pageTitle,
    `${siteUrl}/${category}/${subcategory}/${subsubcategory}`,
    content?.meta_description || `Shop ${pageTitle} products at The Equestrian`,
    undefined,
    filteredProducts,
    { name: subcategory, url: `${siteUrl}/${category}/${subcategory}` }
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
          
          {/* Collection Description */}
          <CollectionDescription 
            description={description}
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
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category, subcategory, product: thirdSegment } = await params;
  
  // Check if it's a collection
  const allowedProductTypes = getProductTypesForCollection(category, subcategory, thirdSegment);
  
  if (allowedProductTypes.length > 0) {
    const collectionTitle = getCollectionTitle(category, subcategory, thirdSegment);
    const content = getCategoryContent(category, subcategory, thirdSegment);

    if (content) {
      return {
        title: content.meta_title,
        description: content.meta_description,
      };
    }

    return {
      title: `${collectionTitle} | The Equestrian`,
      description: `Shop ${collectionTitle} products at The Equestrian. Quality equestrian supplies and equipment.`,
    };
  }

  // If it's a product (will redirect anyway, but for completeness)
  return {
    title: 'The Equestrian',
  };
}
