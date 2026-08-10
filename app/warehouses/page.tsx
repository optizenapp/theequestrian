import Link from 'next/link';
import type { Metadata } from 'next';
import { listWarehouses, warehouseHref } from '@/lib/warehouses/registry';

export const revalidate = 3600;

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au').replace(
  /\/$/,
  ''
);

export const metadata: Metadata = {
  title: 'Search our warehouses | The Equestrian',
  description:
    'Browse products by Australian warehouse. Shop from the same warehouse to qualify for free shipping on that parcel.',
  alternates: { canonical: `${siteUrl}/warehouses` },
};

export default function WarehousesIndexPage() {
  const warehouses = listWarehouses();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/" className="hover:text-action">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Warehouses</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Search our warehouses</h1>
        <p className="text-gray-600 max-w-2xl mb-10 leading-relaxed">
          Each item ships direct from the warehouse that stocks it. Adding more from the{' '}
          <em>same</em> warehouse often unlocks free shipping on that parcel — browse by location
          below.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <li key={wh.slug}>
              <Link
                href={warehouseHref(wh.slug)}
                className="block h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-gray-200 transition"
              >
                <p className="text-lg font-semibold text-gray-900 group-hover:text-action">
                  {wh.displayName}
                </p>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                  {wh.shortDescription}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-action">
                  Shop this warehouse →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
