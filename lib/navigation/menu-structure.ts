/**
 * Navigation Menu Structure
 *
 * Centered shop-first nav: categories, then Sale + Brands together.
 */

export type MenuGroup = 'shop' | 'utility';

export interface TopLevelMenuItem {
  label: string;
  handle: string;
  href: string;
  group: MenuGroup;
  shopifyCollectionHandle?: string;
  isHighlight?: boolean;
  showChevron?: boolean;
}

/** Category links — left cluster with mega menus */
export const SHOP_MENU: TopLevelMenuItem[] = [
  {
    label: 'Horse',
    handle: 'horse',
    href: '/horse',
    group: 'shop',
    shopifyCollectionHandle: 'horse',
    showChevron: true,
  },
  {
    label: 'Rider',
    handle: 'rider',
    href: '/rider',
    group: 'shop',
    shopifyCollectionHandle: 'rider',
    showChevron: true,
  },
  {
    label: 'Clothing',
    handle: 'clothing',
    href: '/clothing',
    group: 'shop',
    shopifyCollectionHandle: 'clothing',
    showChevron: true,
  },
  {
    label: 'Pet',
    handle: 'pet',
    href: '/pet',
    group: 'shop',
    shopifyCollectionHandle: 'pet',
    showChevron: true,
  },
  {
    label: 'Accessories',
    handle: 'accessories',
    href: '/accessories',
    group: 'shop',
    shopifyCollectionHandle: 'accessories',
    showChevron: true,
  },
];

/** Sale + Brands + Warehouses — grouped after categories */
export const UTILITY_MENU: TopLevelMenuItem[] = [
  {
    label: 'Sale',
    handle: 'sale',
    href: '/on-sale',
    group: 'utility',
    isHighlight: true,
  },
  {
    label: 'Brands',
    handle: 'brands',
    href: '/brands',
    group: 'utility',
  },
  {
    label: 'Search our warehouses',
    handle: 'warehouses',
    href: '/warehouses',
    group: 'utility',
    showChevron: true,
  },
];

/** Full secondary nav row (desktop + mobile base list) */
export const TOP_LEVEL_MENU: TopLevelMenuItem[] = [...SHOP_MENU, ...UTILITY_MENU];

/** Extra links shown in mobile drawer footer area */
export const MOBILE_SECONDARY_LINKS = [
  { label: 'Reviews', href: '/reviews' },
  { label: 'Contact', href: '/contact' },
  { label: 'About', href: '/about' },
] as const;

function findMenuItem(menuLabel: string): TopLevelMenuItem | undefined {
  return TOP_LEVEL_MENU.find((item) => item.label === menuLabel);
}

export function getShopifyCollectionHandle(menuLabel: string): string | null {
  return findMenuItem(menuLabel)?.shopifyCollectionHandle ?? null;
}

export function shouldShowMegaMenu(menuLabel: string): boolean {
  const item = findMenuItem(menuLabel);
  if (!item) return false;
  if (item.handle === 'warehouses') return true;
  return !!item.shopifyCollectionHandle;
}

/** API fetch key for mega menu prefetch / wrapper (category menus only) */
export function getMegaMenuFetchKey(menuLabel: string): string | null {
  return findMenuItem(menuLabel)?.shopifyCollectionHandle ?? null;
}

export function isWarehousesNavItem(menuLabel: string): boolean {
  return findMenuItem(menuLabel)?.handle === 'warehouses';
}

/** Whether a pathname is under this nav item */
export function isNavItemActive(pathname: string, item: TopLevelMenuItem): boolean {
  if (item.handle === 'sale') {
    return pathname === '/on-sale' || pathname.startsWith('/on-sale/');
  }
  if (item.handle === 'brands') {
    return pathname === '/brands' || pathname.startsWith('/brands/');
  }
  if (item.handle === 'warehouses') {
    return pathname === '/warehouses' || pathname.startsWith('/warehouses/');
  }
  const base = `/${item.handle}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}
