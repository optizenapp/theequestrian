import { notFound } from 'next/navigation';
import { getAllProducts } from '@/lib/shopify/products';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { generateCollectionStructuredData } from '@/lib/structured-data/collection';
import { 
  getProductTypesForCollection, 
  filterProductsByCollection,
  getSubcategoriesForCollection as getMappingSubcategories,
  getCollectionTitle,
  getCollectionHierarchy
} from '@/lib/mapping/collection-mapping';
import Link from 'next/link';
import type { Metadata } from 'next';

// ISR Configuration: Revalidate every 15 minutes
export const revalidate = 900;

interface SubcategoryPageProps {
  params: Promise<{
    category: string;
    subcategory: string;
  }>;
}

/**
 * Subcategory Collection Page: /{category}/{subcategory}
 * 
 * Uses the mapping CSV to filter products by productType
 */
export default async function SubcategoryPage({ params }: SubcategoryPageProps) {
  const { category, subcategory } = await params;

  // Check if this path exists in our mapping
  const allowedProductTypes = getProductTypesForCollection(category, subcategory);
  
  if (allowedProductTypes.length === 0) {
    notFound();
  }

  // Fetch ALL products from Shopify
  const allProducts = await getAllProducts();
  
  // Filter products by productType using our mapping
  const filteredProducts = filterProductsByCollection(
    allProducts,
    category,
    subcategory
  );

  // Get sub-subcategories from our mapping (third level)
  const subSubcategories = getMappingSubcategories(category, subcategory);

  // Get collection titles from mapping
  const collectionTitle = getCollectionTitle(category, subcategory);
  const breadcrumbs = getCollectionHierarchy(category, subcategory);
  
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
    collectionTitle,
    `${siteUrl}/${category}/${subcategory}`,
    `Shop ${collectionTitle} products at The Equestrian`,
    undefined,
    filteredProducts,
    category
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
        <nav className="text-sm text-gray-600 mb-6">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.href}>
              {index > 0 && ' / '}
              {index === breadcrumbs.length - 1 ? (
                <span className="text-gray-900">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:underline">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Collection Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{collectionTitle}</h1>
          <p className="text-lg text-gray-600">
            Showing {filteredProducts.length} products
          </p>
        </div>

        {/* Sub-subcategories (3rd level) */}
        {subSubcategories.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold mb-6">Refine by</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subSubcategories.map((subSub) => (
                <Link
                  key={subSub.handle}
                  href={`/${category}/${subcategory}/${subSub.handle}`}
                  className="group border rounded-lg p-6 hover:shadow-lg transition-shadow text-center"
                >
                  <h3 className="font-semibold text-lg">{subSub.label}</h3>
                  <p className="text-sm text-gray-500 mt-2">{subSub.count} items</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Products Grid with Filters */}
        <ProductGridWithFilters
          products={filteredProducts}
          subcategories={subSubcategories.map(s => ({
            handle: s.handle,
            label: s.label,
            value: s.handle,
            count: s.count,
            productType: s.label
          }))}
          currentCategory={category}
          currentSubcategory={subcategory}
          parentCollectionTitle={collectionTitle}
        />
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
  const collectionTitle = getCollectionTitle(category, subcategory);

  return {
    title: `${collectionTitle} | The Equestrian`,
    description: `Shop ${collectionTitle} products at The Equestrian. Quality equestrian supplies and equipment.`,
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
