import { notFound, redirect } from 'next/navigation';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getBrandContentByHandle, getBrandIndexDisplayName } from '@/lib/content/brand-content';
import { FAQSection } from '@/components/collection/FAQSection';
import { generateBrandPageSchema } from '@/lib/utils/brand-page-schema';
import { FAQItem } from '@/lib/content/collections';
import { getBrandProductsFromDb } from '@/lib/brands/get-brand-products';
import { getBrandCategories } from '@/lib/brands/get-brand-categories';
import { BrandQuickAnswer } from '@/components/brand/BrandQuickAnswer';
import { BrandProductLines } from '@/components/brand/BrandProductLines';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BrandHubDescriptionSizingTabs } from '@/components/brand/BrandHubDescriptionSizingTabs';
import { RichContent } from '@/components/collection/RichContent';
import {
  resolveBrandLogoUrl,
  resolveExistingBrandLogoAbsoluteUrl,
} from '@/lib/brands/resolve-brand-logo';
import { getCanonicalSiteUrl } from '@/lib/seo/site-url';
import { getBrandSizingForHandle } from '@/lib/sizing/resolve-brand-sizing';
import Link from 'next/link';
import type { Metadata } from 'next';

export const revalidate = 3600;

interface BrandPageProps {
  params: Promise<{
    handle: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { handle } = await params;
  const brand = await getBrandContentByHandle(handle);

  if (!brand) {
    return {
      title: 'Brand Not Found',
      robots: { index: false, follow: false },
    };
  }

  const { totalCount, degraded } = await getBrandProductsFromDb(brand, 1, null);
  const isEmpty = !degraded && totalCount === 0;

  const title = brand.meta_title || `${brand.title} | The Equestrian`;
  const description = brand.meta_description || `Shop the full range of ${brand.title} equestrian products. Saddles, tack, clothing and more from ${brand.title}.`;
  const siteUrl = getCanonicalSiteUrl();
  const canonicalUrl = `${siteUrl}/brands/${handle}`;
  const logoAbsolute = resolveExistingBrandLogoAbsoluteUrl(brand, siteUrl);
  const ogImages = logoAbsolute ? [{ url: logoAbsolute }] : undefined;

  if (isEmpty) {
    return {
      title,
      description,
      robots: { index: false, follow: true },
      alternates: { canonical: canonicalUrl },
    };
  }

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
      type: 'website',
      siteName: 'The Equestrian',
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: logoAbsolute ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(logoAbsolute ? { images: [logoAbsolute] } : {}),
    },
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { handle } = await params;
  const { cursor, brand: brandParam, size, color } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brandParam ? (Array.isArray(brandParam) ? brandParam : brandParam.split(',')) : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  // 1. Verify Brand Exists in Mapping
  const brand = await getBrandContentByHandle(handle);
  if (!brand) {
    notFound();
  }

  // Brand PLPs always use Postgres + brand rules so new brands work without a matching Shopify collection.
  // Variants for cart CTAs are merged from Storefront inside getBrandProductsFromDb.
  // Sequential on purpose: parallel products+categories+facets was killing Neon (`08P01`).
  const hasFilters = Boolean(filterBrands?.length || filterSizes?.length || filterColors?.length);
  const {
    products,
    pageInfo,
    totalCount: totalProductCount,
    productUrls: productUrlsMap,
    facets,
    degraded,
  } = await getBrandProductsFromDb(brand, 36, afterCursor, {
    brands: filterBrands,
    sizes: filterSizes,
    colors: filterColors,
  });

  // Confirmed-empty hubs stay in brand_content; temp-redirect home until sellable stock returns.
  if (!degraded && !hasFilters && !afterCursor && totalProductCount === 0) {
    redirect('/');
  }

  const brandCategories = await getBrandCategories(brand, 12);
  const brandSizing = await getBrandSizingForHandle(handle, getBrandIndexDisplayName(brand));

  // Fetch review stats for all products in one batch (server-side)
  const productHandles = products.map(p => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);

  // Serialize Maps to plain objects for Client Components (Maps are not JSON-serializable in RSC)
  const productUrls = Object.fromEntries(productUrlsMap);
  const reviewStats = Object.fromEntries(reviewStatsMap);
  
  // Parse content
  const pageTitle = brand.h1_title || brand.title;
  const shortDescription = brand.short_description || `Shop our comprehensive collection of ${brand.title} products.`;
  const longDescription = brand.long_description || '';
  
  let faqItems: FAQItem[] = [];
  try {
    if (brand.faq_json) {
      faqItems = JSON.parse(brand.faq_json);
    }
  } catch (e) {
    console.warn(`Failed to parse FAQ JSON for brand ${brand.handle}`, e);
  }

  const siteUrl = getCanonicalSiteUrl();
  const logoUrl = resolveBrandLogoUrl(brand);
  const logoAbsolute = resolveExistingBrandLogoAbsoluteUrl(brand, siteUrl);
  const relatedCollections =
    brandCategories.brandFilterValue
      ? brandCategories.categories.map((c) => ({
          name: `${getBrandIndexDisplayName(brand)} ${c.label}`,
          url: `${siteUrl}${c.url_path}?brand=${encodeURIComponent(brandCategories.brandFilterValue!)}`,
        }))
      : [];

  const enhancedSchema = generateBrandPageSchema({
    brand: {
      handle,
      name: brand.title,
      h1: pageTitle,
      description: brand.short_description || brand.meta_description || shortDescription,
      brandDescription: brand.quick_answer || brand.short_description || brand.meta_description,
      breadcrumbLabel: brand.breadcrumb_label,
      logoUrl: logoAbsolute,
    },
    products,
    productUrls: productUrlsMap,
    siteUrl,
    maxProductsInSchema: 12,
    faqs: faqItems,
    relatedCollections,
  });

  return (
    <>
      {/* Structured Data - @graph with BreadcrumbList + CollectionPage + ItemList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(enhancedSchema) }}
      />

      <div className="bg-gray-50 min-h-screen pb-12">
        {/* Breadcrumbs */}
        <nav className="container mx-auto px-4 py-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <Link href="/brands" className="hover:text-primary transition-colors">
                Brands
              </Link>
            </li>
            <li>
              <span className="mx-2">/</span>
              <span className="text-gray-900 font-medium" aria-current="page">
                {brand.breadcrumb_label || brand.title}
              </span>
            </li>
          </ol>
        </nav>

        {/* Hero Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-4 py-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                  {pageTitle}
                </h1>
                {brand.quick_answer && <BrandQuickAnswer text={brand.quick_answer} />}
                <div className="mt-6">
                  <BrandHubDescriptionSizingTabs
                    shortDescription={shortDescription}
                    sizing={brandSizing}
                  />
                  {totalProductCount > 0 && (
                    <p className="mt-4 text-sm text-gray-500">
                      Showing {totalProductCount} results
                    </p>
                  )}
                </div>
              </div>
              {logoUrl && (
                <BrandLogo
                  src={logoUrl}
                  alt={`${brand.title} logo`}
                  size="md"
                  className="self-start md:self-center"
                />
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Product Grid */}
          <ProductGridWithFilters
            products={products}
            currentCategory="brands"
            currentSubcategory={brand.handle}
            pageInfo={{
              hasNextPage: pageInfo.hasNextPage,
              endCursor: pageInfo.endCursor
            }}
            totalCount={totalProductCount}
            serverFacets={facets}
            productUrls={productUrls}
            reviewStatsMap={reviewStats}
          />

          {/* Long about copy — below grid (same pattern as category PLPs) */}
          {longDescription ? <RichContent html={longDescription} /> : null}

          {/* Auto-generated Product Lines from product → category joins */}
          <BrandProductLines
            brandName={getBrandIndexDisplayName(brand)}
            brandFilterValue={brandCategories.brandFilterValue}
            categories={brandCategories.categories}
          />

          {faqItems.length > 0 && (
            <FAQSection
              faqs={faqItems}
              categoryTitle={brand.title}
              emitJsonLd={false}
            />
          )}
        </div>
      </div>
    </>
  );
}

