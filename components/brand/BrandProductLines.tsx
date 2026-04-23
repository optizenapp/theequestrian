import Link from 'next/link';
import type { BrandCategoryEntry } from '@/lib/brands/get-brand-categories';

interface BrandProductLinesProps {
  /** Short display name used in copy and headings (e.g. "Acavallo"). */
  brandName: string;
  /**
   * Canonical brand value for the `?brand=` URL param — must match
   * `LOWER(TRIM(products.brand))`. May differ from `brandName` (e.g.
   * brandName="Acavallo" vs filter="acavallo horse riding essentials").
   */
  brandFilterValue: string | null;
  categories: BrandCategoryEntry[];
}

/**
 * Auto-generated "What We Stock from [Brand]" section.
 *
 * Replaces the framework's manually-authored Product Lines block for brands
 * where stocked ranges map cleanly onto site categories. Each H3 links to the
 * relevant category page filtered to this brand, satisfying the framework's
 * internal linking requirement without per-brand authoring overhead.
 */
export function BrandProductLines({
  brandName,
  brandFilterValue,
  categories,
}: BrandProductLinesProps) {
  if (!categories?.length) return null;
  if (!brandFilterValue) return null;

  return (
    <section className="mt-12 rounded-lg bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-2xl font-bold text-gray-900">
        What We Stock from {brandName}
      </h2>
      <p className="mb-6 text-gray-600">
        Browse {brandName} by category — every link below filters the relevant
        collection to {brandName} only.
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const href = `${c.url_path}?brand=${encodeURIComponent(brandFilterValue)}`;
          return (
            <li key={c.url_path} className="rounded-md border border-gray-200 p-4 transition-colors hover:border-primary hover:bg-primary/5">
              <h3 className="text-lg font-semibold text-gray-900">
                <Link href={href} className="hover:text-primary">
                  {brandName} {c.label}
                </Link>
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {c.count} {c.count === 1 ? 'product' : 'products'} in stock
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
