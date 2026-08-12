export type MegaMenuSubcategory = {
  handle: string;
  label: string;
  image?: { url: string } | null;
};

export type MegaMenuThumbImage = {
  url: string;
  altText: string;
  width: number;
  height: number;
};

/** Extra Storefront search types when mapped product_type queries return nothing. */
const SUBCATEGORY_IMAGE_TYPE_FALLBACKS: Record<string, string[]> = {
  'stock-western': ['Western & Accessories', 'Western Pads'],
};

/**
 * Hard overrides for mega-menu cards whose CMS/CDN assets 404.
 * Used when Storefront cannot resolve a live subcategory product image.
 */
const MENU_CARD_IMAGE_BY_PATH: Record<string, string> = {
  '/pet/cat':
    'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/CuraPet_RemedeazCoatConditioner_2048x_0c9d7711-7372-4c20-88e6-02cafce0883b.webp?v=1783319389',
  '/pet/dog/collars-and-leads':
    'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/C4_Dog_Collar_Pink_Rescue.webp?v=1785900747',
  '/clothing/womens/tops':
    'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/A005122_V_8Q_01_1920x1920_9df6a614-2260-4c75-addc-42cba2ff45aa.webp?v=1785819201',
  '/clothing/womens/breeches':
    'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/QJ2023Sep33.jpg?v=1783390768',
  '/clothing/mens/breeches':
    'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/EDOUARD-ASFALTO-01.jpg?v=1783317932',
  '/horse/stock-western':
    'https://cdn.shopify.com/s/files/1/0562/0963/7457/files/9012-ah-steer.png?v=1786001081',
};

/** Hardcoded featured heroes — always win over CMS/CDN (served from /public/mega-menu). */
export const FEATURED_IMAGE_BY_CATEGORY: Record<string, string> = {
  rider: '/mega-menu/rider.png',
  clothing: '/mega-menu/clothing.png',
  pet: '/mega-menu/pet.png',
};

export function resolveFeaturedImageUrl(categoryHandle: string, cmsUrl?: string | null): string | null {
  const hardcoded = FEATURED_IMAGE_BY_CATEGORY[categoryHandle];
  if (hardcoded) return hardcoded;
  const trimmed = cmsUrl?.trim();
  return trimmed || null;
}

export function extractSubcategoryHandleFromLink(
  link: string,
  categoryHandle: string
): string | null {
  const path = link.replace(/^https?:\/\/[^/]+/i, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === categoryHandle && parts[1]) {
    return parts[1].replace(/\/$/, '');
  }
  const categoryIndex = parts.indexOf(categoryHandle);
  if (categoryIndex >= 0 && parts[categoryIndex + 1]) {
    return parts[categoryIndex + 1].replace(/\/$/, '');
  }
  const last = parts[parts.length - 1];
  return last ? last.replace(/\/$/, '') : null;
}

function normalizeLabel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeMenuPath(link: string): string {
  const path = link.replace(/^https?:\/\/[^/]+/i, '').split('?')[0] || '/';
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path.startsWith('/') ? path : `/${path}`;
}

export function buildProductTypeImageQuery(productTypes: string[]): string {
  return productTypes
    .slice(0, 5)
    .map((type) => `product_type:"${type.replace(/"/g, '\\"')}"`)
    .join(' OR ');
}

export function productTypesForMegaMenuThumb(
  handle: string,
  mappedTypes: string[]
): string[] {
  const fallbacks = SUBCATEGORY_IMAGE_TYPE_FALLBACKS[handle] ?? [];
  return [...new Set([...mappedTypes, ...fallbacks])].filter(Boolean);
}

/** Prefer a live Shopify thumbnail matched by menu link/title. */
export function findSubcategoryImageUrl(
  subcategories: MegaMenuSubcategory[],
  link: string,
  title: string,
  categoryHandle: string
): string | null {
  const handle = extractSubcategoryHandleFromLink(link, categoryHandle);
  if (handle) {
    const byHandle = subcategories.find(
      (sub) => sub.handle === handle || sub.handle === handle.replace(/\/$/, '')
    );
    if (byHandle?.image?.url) return byHandle.image.url;
  }

  const byTitle = subcategories.find((sub) => normalizeLabel(sub.label) === normalizeLabel(title));
  return byTitle?.image?.url ?? null;
}

export function firstSubcategoryImageUrl(subcategories: MegaMenuSubcategory[]): string | null {
  return subcategories.find((sub) => sub.image?.url)?.image?.url ?? null;
}

/** True for links deeper than /{category}/{subcategory} (e.g. /clothing/womens/tops). */
export function isNestedCategoryLink(link: string, categoryHandle: string): boolean {
  const parts = normalizeMenuPath(link).split('/').filter(Boolean);
  return parts[0] === categoryHandle && parts.length > 2;
}

export function resolveMenuCardImageUrl(
  link: string,
  liveUrl: string | null,
  customUrl: string,
  categoryHandle?: string
): string {
  const override = MENU_CARD_IMAGE_BY_PATH[normalizeMenuPath(link)];
  if (override) return override;

  // Nested CMS links keep curated images — live thumbs only key on the first
  // subcategory segment (e.g. both /womens/tops and /womens/breeches → "womens").
  const trimmedCustom = customUrl?.trim() ?? '';
  if (categoryHandle && isNestedCategoryLink(link, categoryHandle) && trimmedCustom) {
    return trimmedCustom;
  }

  if (liveUrl) return liveUrl;
  return trimmedCustom;
}

export function enrichMenuImageItems<
  T extends { title: string; imageUrl: string; link: string },
>(items: T[] | null | undefined, subcategories: MegaMenuSubcategory[], categoryHandle: string): T[] | null {
  if (!items?.length) return items ?? null;
  return items.map((item) => {
    const liveUrl = findSubcategoryImageUrl(subcategories, item.link, item.title, categoryHandle);
    return {
      ...item,
      imageUrl: resolveMenuCardImageUrl(item.link, liveUrl, item.imageUrl, categoryHandle),
    };
  });
}
