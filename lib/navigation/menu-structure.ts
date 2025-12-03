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
  shopifyCollectionHandle?: string; // Optional: if different from handle
  isHighlight?: boolean;
}

export const TOP_LEVEL_MENU: TopLevelMenuItem[] = [
  {
    label: 'Good deals',
    handle: 'good-deals',
    href: '/good-deals',
    isHighlight: true,
  },
  {
    label: 'Home',
    handle: 'home',
    href: '/',
  },
  {
    label: 'Horse',
    handle: 'horse',
    href: '/horse',
    shopifyCollectionHandle: 'horse-equipment',
  },
  {
    label: 'Rider',
    handle: 'rider',
    href: '/rider',
    shopifyCollectionHandle: 'womens-clothing',
  },
  {
    label: 'Farm & Stable',
    handle: 'farm-stable',
    href: '/farm-stable',
    shopifyCollectionHandle: 'stable-equipment',
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
