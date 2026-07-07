export type MegaMenuSubcategory = {
  handle: string;
  label: string;
  image?: { url: string } | null;
};

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

export function enrichMenuImageItems<
  T extends { title: string; imageUrl: string; link: string },
>(items: T[] | null | undefined, subcategories: MegaMenuSubcategory[], categoryHandle: string): T[] | null {
  if (!items?.length) return items ?? null;
  return items.map((item) => {
    const liveUrl = findSubcategoryImageUrl(subcategories, item.link, item.title, categoryHandle);
    return {
      ...item,
      imageUrl: liveUrl ?? item.imageUrl,
    };
  });
}
