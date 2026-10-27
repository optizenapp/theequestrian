/**
 * Colour facet normalisation. Display/discovery only — never rewrites the
 * Shopify option value used for variant selection or checkout.
 */

import { COMMON_COLORS } from '@/lib/utils/product-options';

/**
 * Supplier colour codes observed in the catalogue: "01-", "0001-", "2C00-",
 * "8BGO- ", "R810-". Uppercase alphanumeric, 2–4 chars, at least one digit,
 * followed by a hyphen and more text. Case-sensitive so "Off-White" is untouched.
 */
const VENDOR_CODE_PREFIX = /^(?=[A-Z]*\d)[0-9A-Z]{2,4}-\s*(?=\S)/;
/** Keys are lowercase, so legacy URL values ("2c00-pale mauve") need the same rule case-insensitively. */
const VENDOR_CODE_PREFIX_ANY_CASE = /^(?=[a-z]*\d)[0-9a-z]{2,4}-\s*(?=\S)/i;

const PLACEHOLDER = /^(default title|default|n\/?a|none|-+)$/i;
const PACK_QUANTITY = /^(\d+\s*-?\s*(pack|pk|pcs?|pieces?)|(pack|set) of \d+)$/i;
const BARE_NUMBER = /^\d+(\.\d+)?$/;
const MEASUREMENT = /\d+(\.\d+)?\s*(mm|cm|m|in|inch|inches|ft|kg|g|ml|l)\b/gi;
const ENGRAVING_LENGTH = /\bcharacters?\b/i;

export type ColourExclusion = 'placeholder' | 'pack' | 'number' | 'measurement' | 'engraving';

export function stripVendorCode(raw: string): string {
  return raw.trim().replace(VENDOR_CODE_PREFIX, '');
}

function hasColourWord(text: string): boolean {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((part) => COMMON_COLORS.has(part));
}

/** Why a value under a Colour option is not a colour, or null if it is usable. */
export function colourExclusionReason(raw: string): ColourExclusion | null {
  const value = stripVendorCode(raw);
  if (!value || PLACEHOLDER.test(value)) return 'placeholder';
  if (PACK_QUANTITY.test(value)) return 'pack';
  if (BARE_NUMBER.test(value)) return 'number';
  if (ENGRAVING_LENGTH.test(value)) return 'engraving';
  if (value.match(MEASUREMENT) && !hasColourWord(value.replace(MEASUREMENT, ''))) {
    return 'measurement';
  }
  return null;
}

/** Human-readable label: vendor code removed, whitespace tidied, supplier casing kept. */
export function colourLabel(raw: string): string {
  return stripVendorCode(raw).replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
}

/** Comparison key without exclusion — used for URL values (legacy lowercase keys included). */
export function looseColourKey(raw: string): string {
  return raw
    .trim()
    .replace(VENDOR_CODE_PREFIX_ANY_CASE, '')
    .toLowerCase()
    .replace(/[/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Facet key for a variant's colour, or null when the value must not appear as a colour. */
export function colourKey(raw: string): string | null {
  if (colourExclusionReason(raw)) return null;
  const key = looseColourKey(raw);
  return key || null;
}
