import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductGridWithFilters } from '@/components/filters/ProductGridWithFilters';
import { getReviewStatsForProducts } from '@/lib/reviews/stats';
import { getWarehouseProductsFromDb } from '@/lib/warehouses/get-warehouse-products';
import {
  getWarehouseBySlug,
  listWarehouses,
  warehouseHref,
} from '@/lib/warehouses/registry';

/** Old slug before Sydney location was named precisely */
const WAREHOUSE_SLUG_ALIASES: Record<string, string> = {
  nsw: 'sydney',
};

export const revalidate = 3600;

interface WarehousePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export function generateStaticParams() {
  return listWarehouses().map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: WarehousePageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug =
    WAREHOUSE_SLUG_ALIASES[rawSlug.trim().toLowerCase()] ?? rawSlug.trim().toLowerCase();
  if (slug !== rawSlug.trim().toLowerCase()) {
    permanentRedirect(warehouseHref(slug));
  }
  const warehouse = getWarehouseBySlug(slug);
  if (!warehouse) {
    return { title: 'Warehouse Not Found', robots: { index: false, follow: false } };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(
    /\/$/,
    ''
  );
  const title = `Shop from ${warehouse.displayName} warehouse | The Equestrian`;
  const description = warehouse.shortDescription;
  const canonicalUrl = `${siteUrl}${warehouseHref(warehouse.slug)}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'The Equestrian',
    },
  };
}

export default async function WarehousePage({ params, searchParams }: WarehousePageProps) {
  const { slug: rawSlug } = await params;
  const slug =
    WAREHOUSE_SLUG_ALIASES[rawSlug.trim().toLowerCase()] ?? rawSlug.trim().toLowerCase();
  if (slug !== rawSlug.trim().toLowerCase()) {
    permanentRedirect(warehouseHref(slug));
  }
  const warehouse = getWarehouseBySlug(slug);
  if (!warehouse) notFound();

  const { cursor, brand: brandParam, size, color } = await searchParams;
  const afterCursor = typeof cursor === 'string' ? cursor : null;
  const filterBrands = brandParam
    ? Array.isArray(brandParam)
      ? brandParam
      : brandParam.split(',')
    : undefined;
  const filterSizes = size ? (Array.isArray(size) ? size : size.split(',')) : undefined;
  const filterColors = color ? (Array.isArray(color) ? color : color.split(',')) : undefined;

  const { products, pageInfo, totalCount, productUrls: productUrlsMap, facets, degraded } =
    await getWarehouseProductsFromDb(warehouse, 36, afterCursor, {
      brands: filterBrands,
      sizes: filterSizes,
      colors: filterColors,
    });

  const productHandles = products.map((p) => p.handle);
  const reviewStatsMap = await getReviewStatsForProducts(productHandles);
  const productUrls = Object.fromEntries(productUrlsMap);
  const reviewStats = Object.fromEntries(reviewStatsMap);

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-action">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/warehouses" className="hover:text-action">
            Warehouses
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{warehouse.displayName}</span>
        </nav>

        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Shop from our {warehouse.displayName} warehouse
          </h1>
          <p className="text-gray-600 leading-relaxed">{warehouse.shortDescription}</p>
          <p className="mt-3 text-sm text-gray-500">
            {degraded
              ? 'Product counts may be temporarily incomplete.'
              : `${totalCount} product${totalCount === 1 ? '' : 's'} from this warehouse.`}{' '}
            <Link href="/shipping-delivery" className="text-action font-medium hover:underline">
              How multi-parcel shipping works
            </Link>
          </p>
        </header>

        <ProductGridWithFilters
          products={products}
          pageInfo={pageInfo}
          currentCategory="warehouses"
          currentSubcategory={warehouse.slug}
          productUrls={productUrls}
          reviewStatsMap={reviewStats}
          serverFacets={facets}
          totalCount={totalCount}
        />
      </div>
    </div>
  );
}
