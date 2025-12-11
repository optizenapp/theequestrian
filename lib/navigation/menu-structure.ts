/**
 * Navigation Menu Structure
 * 
 * Defines the top-level navigation menu items
 * and maps them to Shopify collections
 */

export interface TopLevelMenuItem {
  label: string;
  handle: string;
  href: string;
  shopifyCollectionHandle?: string; // Optional: if present, shows Mega Menu
  isHighlight?: boolean;
}

export const TOP_LEVEL_MENU: TopLevelMenuItem[] = [
  {
    label: 'Home',
    handle: 'home',
    href: '/',
  },
  {
    label: 'Good deals',
    handle: 'good-deals',
    href: '/on-sale',
    isHighlight: true,
  },
  {
    label: 'Horse',
    handle: 'horse',
    href: '/horse',
    shopifyCollectionHandle: 'horse',
  },
  {
    label: 'Rider',
    handle: 'rider',
    href: '/rider',
    shopifyCollectionHandle: 'rider',
  },
  {
    label: 'Clothing',
    handle: 'clothing',
    href: '/clothing',
    shopifyCollectionHandle: 'clothing',
  },
  {
    label: 'Pet',
    handle: 'pet',
    href: '/pet',
    shopifyCollectionHandle: 'pet',
  },
  {
    label: 'Accessories',
    handle: 'accessories',
    href: '/accessories',
    shopifyCollectionHandle: 'accessories',
  },
  {
    label: 'Brands',
    handle: 'brands',
    href: '/brands',
  },
  {
    label: 'Reviews',
    handle: 'reviews',
    href: '/reviews',
  },
  {
    label: 'Contact',
    handle: 'contact',
    href: '/contact',
  },
];

/**
 * Get Shopify collection handle for a menu item
 * Returns the actual Shopify collection handle to use for fetching data
 */
export function getShopifyCollectionHandle(menuLabel: string): string | null {
  const menuItem = TOP_LEVEL_MENU.find((item) => item.label === menuLabel);
  return menuItem?.shopifyCollectionHandle || null;
}

/**
 * Check if a menu item should show a mega menu
 */
export function shouldShowMegaMenu(menuLabel: string): boolean {
  const menuItem = TOP_LEVEL_MENU.find((item) => item.label === menuLabel);
  return !!menuItem?.shopifyCollectionHandle;
}
