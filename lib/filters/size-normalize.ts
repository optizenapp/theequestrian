/**
 * Conservative size facet normalisation. Merges only demonstrably equivalent
 * spellings (whitespace, case, age-range formatting). "0"/"00"/"000", AU/EU/UK/US
 * and shoe vs garment sizes stay distinct because their text differs.
 */

import { isColorValue } from '@/lib/utils/product-options';

const AGE_RANGE_YEARS = /^(\d+)\s*-\s*(\d+)\s*(years?|yrs?)$/i;
const AGE_RANGE_MONTHS = /^(\d+)\s*-\s*(\d+)\s*(months?|mths?)$/i;

function tidy(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Display label: whitespace tidied, supplier casing kept. */
export function sizeLabel(raw: string): string {
  return tidy(raw);
}

/** Comparison key without exclusion — used for URL values. */
export function looseSizeKey(raw: string): string {
  const value = tidy(raw);
  const years = value.match(AGE_RANGE_YEARS);
  if (years) return `${years[1]}-${years[2]} years`;
  const months = value.match(AGE_RANGE_MONTHS);
  if (months) return `${months[1]}-${months[2]} months`;
  return value.toLowerCase();
}

/** Facet key for a variant's size, or null when it looks like a colour mis-entered as size. */
export function sizeKey(raw: string): string | null {
  if (!raw.trim() || isColorValue(raw)) return null;
  return looseSizeKey(raw);
}
