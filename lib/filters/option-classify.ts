/**
 * Classify Shopify variant option names into filter types by explicit name.
 * Never by option position. Ambiguous names ("Style", "Type", "Size/Colour",
 * "Leather Colour", "US Size") are deliberately unclassified so they cannot
 * leak into the colour or size facets.
 */

export type OptionType = 'colour' | 'size' | 'pack' | 'length';
export type FacetOptionType = 'colour' | 'size';

const OPTION_TYPE_BY_NAME: Record<string, OptionType> = {
  color: 'colour',
  colour: 'colour',
  size: 'size',
  'pack size': 'pack',
  'pack quantity': 'pack',
  pack: 'pack',
  length: 'length',
};

export function classifyOptionName(name: string): OptionType | null {
  return OPTION_TYPE_BY_NAME[name.trim().toLowerCase()] ?? null;
}
