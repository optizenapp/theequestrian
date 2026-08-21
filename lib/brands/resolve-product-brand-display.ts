import type { BrandContentRow } from '@/lib/content/brand-content';
import { slugFromBrandName } from '@/lib/brands/brand-slug';
import { resolveCanonicalBrandHubHandle } from '@/lib/brands/hub-consolidations';
import { isBlockedBrandHandle } from '@/lib/brands/blocked-brands';
import { inferProductBrand } from '@/lib/brands/infer-product-brand';
import { isMarketplaceAggregatorVendor } from '@/lib/brands/marketplace-vendors';

export type BrandLexiconEntry = {
  label: string;
  hubHandle: string;
};

export type ProductBrandDisplayInput = {
  brand: string | null;
  brandHubHandle: string | null;
  vendor: string | null;
  title: string | null;
  tags: string[];
};

export function buildBrandDisplayLexicon(brands: BrandContentRow[]): BrandLexiconEntry[] {
  const entries: BrandLexiconEntry[] = [];
  const seen = new Set<string>();

  const add = (label: string, hubHandle: string) => {
    const l = label.trim();
    const h = hubHandle.trim();
    if (!l || !h || isBlockedBrandHandle(h)) return;
    const key = `${l.toLowerCase()}\0${h}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ label: l, hubHandle: h });
  };

  for (const row of brands) {
    const display = row.breadcrumb_label?.trim() || row.title.trim();
    add(display, row.handle);

    const rulesStr = row.rules;
    if (!rulesStr || rulesStr === 'Manual Collection') continue;
    try {
      const rules = JSON.parse(rulesStr) as Array<{ column?: string; condition?: string }>;
      if (!Array.isArray(rules)) continue;
      for (const rule of rules) {
        const col = rule.column?.toUpperCase();
        if ((col === 'VENDOR' || col === 'BRAND') && rule.condition?.trim()) {
          add(rule.condition.trim(), row.handle);
        }
      }
    } catch {
      // ignore malformed rules JSON
    }
  }

  return entries.sort((a, b) => b.label.length - a.label.length);
}

export function findHubForBrandLabel(brand: string, lexicon: BrandLexiconEntry[]): string | null {
  const lower = brand.trim().toLowerCase();
  if (!lower) return null;

  const exact = lexicon.find((e) => e.label.toLowerCase() === lower);
  if (exact) return exact.hubHandle;

  const slug = resolveCanonicalBrandHubHandle(slugFromBrandName(brand));
  const bySlug = lexicon.find((e) => e.hubHandle === slug);
  return bySlug?.hubHandle ?? null;
}

function displayLabelForHub(hubHandle: string, fallback: string, lexicon: BrandLexiconEntry[]): string {
  const match =
    lexicon.find((e) => e.hubHandle === hubHandle && e.label.toLowerCase() === fallback.toLowerCase()) ||
    lexicon.find((e) => e.hubHandle === hubHandle);
  return match?.label ?? fallback;
}

/** Longest published brand name found in the product title (Trailrace / marketplace products). */
function matchBrandInTitle(title: string, lexicon: BrandLexiconEntry[]): BrandLexiconEntry | null {
  const lower = title.trim().toLowerCase();
  if (!lower) return null;

  for (const entry of lexicon) {
    const label = entry.label.trim();
    if (label.length < 2) continue;
    if (lower.includes(label.toLowerCase())) return entry;
  }
  return null;
}

/**
 * Resolve PDP brand label + `/brands/[handle]` link from DB columns, vendor, or title inference.
 */
export function resolveProductBrandDisplay(
  input: ProductBrandDisplayInput,
  lexicon: BrandLexiconEntry[]
): { brand: string | null; brandHubHandle: string | null } {
  const dbBrand = input.brand?.trim() || null;
  const dbHub = input.brandHubHandle?.trim() || null;

  if (dbBrand && dbHub) {
    return { brand: dbBrand, brandHubHandle: resolveCanonicalBrandHubHandle(dbHub) };
  }

  if (dbBrand && !dbHub) {
    const hub = findHubForBrandLabel(dbBrand, lexicon);
    if (hub) return { brand: dbBrand, brandHubHandle: hub };
  }

  const vendor = input.vendor?.trim() || null;
  const isMarketplace = isMarketplaceAggregatorVendor(vendor);

  // Vendor-as-brand only for direct-brand Collective vendors (e.g. QJ Riding Wear).
  if (vendor && !isMarketplace) {
    const hub = findHubForBrandLabel(vendor, lexicon);
    if (hub) {
      return {
        brand: displayLabelForHub(hub, vendor, lexicon),
        brandHubHandle: hub,
      };
    }
  }

  // Marketplace vendors (Trailrace): match product title against published brand hubs.
  const titleMatch = input.title ? matchBrandInTitle(input.title, lexicon) : null;
  if (titleMatch) {
    return { brand: titleMatch.label, brandHubHandle: titleMatch.hubHandle };
  }

  const inferred = inferProductBrand({
    handle: '',
    title: input.title || '',
    descriptionHtml: '',
    vendor: isMarketplace ? null : vendor,
    tags: input.tags,
    titleOverride: null,
    metaTitle: null,
    metaDescription: null,
    overrideDescriptionHtml: null,
    lexicon: lexicon.map((e) => e.label),
  });

  if (inferred.inferredBrand) {
    const hub = findHubForBrandLabel(inferred.inferredBrand, lexicon);
    if (hub) {
      return {
        brand: displayLabelForHub(hub, inferred.inferredBrand, lexicon),
        brandHubHandle: hub,
      };
    }
  }

  if (dbBrand) return { brand: dbBrand, brandHubHandle: null };
  return { brand: null, brandHubHandle: null };
}
