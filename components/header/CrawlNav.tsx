import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import {
  MOBILE_SECONDARY_LINKS,
  SHOP_MENU,
  UTILITY_MENU,
} from '@/lib/navigation/menu-structure';
import { getSubcategoriesForCollection } from '@/lib/mapping/collection-mapping';
import { listWarehouses, warehouseHref } from '@/lib/warehouses/registry';

type CrawlLink = { href: string; label: string };
type CrawlCategory = CrawlLink & { children: CrawlLink[] };

const getCrawlNavTree = unstable_cache(
  async (): Promise<CrawlCategory[]> => {
    return Promise.all(
      SHOP_MENU.filter((item) => item.shopifyCollectionHandle).map(async (item) => {
        const handle = item.shopifyCollectionHandle as string;
        const subs = await getSubcategoriesForCollection(handle);
        return {
          href: item.href,
          label: item.label,
          children: subs.map((sub) => ({
            href: `${item.href}/${sub.handle}`,
            label: sub.label,
          })),
        };
      })
    );
  },
  ['crawl-nav-tree-v1'],
  { revalidate: 3600 }
);

/**
 * Always-in-DOM category directory for Googlebot.
 * Mega menu / mobile drawer hide links until JS interaction; this does not.
 */
export async function CrawlNav() {
  let categories: CrawlCategory[] = [];
  try {
    categories = await getCrawlNavTree();
  } catch (error) {
    console.error('[CrawlNav] failed to load subcategory tree', error);
  }

  const warehouses = listWarehouses();

  return (
    <nav className="sr-only" aria-label="Site categories">
      <ul>
        {SHOP_MENU.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
        {UTILITY_MENU.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
        {MOBILE_SECONDARY_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
        {categories.map((category) => (
          <li key={`tree-${category.href}`}>
            <Link href={category.href}>{category.label}</Link>
            {category.children.length > 0 && (
              <ul>
                {category.children.map((child) => (
                  <li key={child.href}>
                    <Link href={child.href}>{child.label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
        {warehouses.map((wh) => (
          <li key={wh.slug}>
            <Link href={warehouseHref(wh.slug)}>{wh.displayName}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
