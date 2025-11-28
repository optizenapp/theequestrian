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
}

export const TOP_LEVEL_MENU: TopLevelMenuItem[] = [
  {
    label: 'Home',
    handle: 'home',
    href: '/',
  },
  {
    label: 'Horse',
    handle: 'horse',
    href: '/horse',
    // Map to your actual Shopify collection handle
    // Examples: 'horse-equipment', 'horse-boots', 'horse-rugs', etc.
    // You'll need to update this to match your actual collection
    shopifyCollectionHandle: 'horse-equipment', // TODO: Update to actual collection handle
  },
  {
    label: 'Rider',
    handle: 'rider',
    href: '/rider',
    // Map to your actual Shopify collection handle
    // Examples: 'womens-clothing', 'mens-clothing', 'footwear', etc.
    shopifyCollectionHandle: 'womens-clothing', // TODO: Update to actual collection handle
  },
  {
    label: 'Farm & Stable',
    handle: 'farm-stable',
    href: '/farm-stable',
    // Map to your actual Shopify collection handle
    // Examples: 'stable-equipment', 'stable-gear', etc.
    shopifyCollectionHandle: 'stable-equipment', // TODO: Update to actual collection handle
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
