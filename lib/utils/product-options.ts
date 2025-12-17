
/**
 * Product Option Normalization Utilities
 * 
 * Helper functions to clean up and normalize product option values
 * specifically for handling messy color and size data from different vendors.
 */

export const COMMON_COLORS = new Set([
  'black', 'white', 'blue', 'red', 'green', 'yellow', 'orange', 'purple', 'pink',
  'brown', 'grey', 'gray', 'navy', 'beige', 'tan', 'cream', 'silver', 'gold',
  'bronze', 'burgundy', 'maroon', 'teal', 'turquoise', 'indigo', 'violet',
  'charcoal', 'ivory', 'khaki', 'olive', 'coral', 'peach', 'mint', 'lime',
  'mustard', 'lavender', 'lilac', 'salmon', 'rose', 'rust', 'copper', 'mocha',
  'chocolate', 'taupe', 'sand', 'stone', 'slate', 'graphite', 'emerald',
  'ruby', 'sapphire', 'amethyst', 'topaz', 'garnet', 'pearl', 'champagne',
  'bordeaux', 'berry', 'plum', 'mauve', 'cognac', 'camel', 'espresso', 'obsidian',
  'onyx', 'anthracite', 'midnight', 'royal', 'sky', 'baby', 'pastel', 'neon',
  'metallic', 'matte', 'gloss', 'clear', 'transparent', 'multicolor', 'multi',
  'rainbow', 'pattern', 'print', 'stripe', 'dot', 'check', 'plaid', 'fuchsia', 
  'magenta', 'cyan', 'azure', 'crimson', 'scarlet', 'denim', 'blush', 'biscuit',
  'nude', 'natural', 'hazel', 'honey', 'vanilla', 'wheat', 'caramel', 'cinnamon',
  'nutmeg', 'coffee', 'ebony', 'jet', 'ink', 'azure', 'cerulean', 'cobalt',
  'periwinkle', 'lavender', 'thistle', 'orchid', 'fuchsia', 'magenta', 'rose',
  'salmon', 'coral', 'peach', 'apricot', 'tangerine', 'lemon', 'chartreuse',
  'olive', 'sage', 'emerald', 'jade', 'teal', 'aqua', 'turquoise', 'cyan',
  'azure', 'cerulean', 'cobalt', 'indigo', 'violet', 'purple', 'magenta',
  'fuchsia', 'rose', 'crimson', 'scarlet', 'red', 'maroon', 'burgundy', 'brown',
  'beige', 'tan', 'khaki', 'cream', 'ivory', 'white', 'grey', 'gray', 'silver',
  'gold', 'bronze', 'copper', 'black', 'charcoal', 'slate', 'graphite'
]);

// Regex to identify vendor codes prefixing color names
// Matches patterns like "01-", "7C00-", "8989-", "0001-", "02-Black/"
const VENDOR_CODE_PREFIX = /^[\w\d]{2,6}[-/\s]/;

/**
 * Normalize a color value to group similar colors together
 * e.g. "7C00-Light Blue" -> "light blue"
 * e.g. "7C00-Light/Blue" -> "light blue"
 */
export function normalizeColor(value: string): string {
  if (!value) return '';

  let normalized = value.trim();

  // Remove vendor code prefixes (e.g. "01-White", "7C00-Blue")
  if (VENDOR_CODE_PREFIX.test(normalized)) {
    // Keep removing until no prefix match (in case of multiple like "01-02-Blue")
    while (VENDOR_CODE_PREFIX.test(normalized)) {
      normalized = normalized.replace(VENDOR_CODE_PREFIX, '');
    }
  }

  // Replace separators with spaces
  normalized = normalized.replace(/[-/_]/g, ' ');

  // Normalize spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized.toLowerCase();
}

/**
 * Check if a value appears to be a color
 * Used to exclude colors from appearing in the Size filter
 */
export function isColorValue(value: string): boolean {
  if (!value) return false;
  
  // Clean it up first
  const normalized = normalizeColor(value);
  
  // Direct match
  if (COMMON_COLORS.has(normalized)) return true;

  // Check if it contains a color word (e.g. "dark blue", "navy blue", "rose gold")
  // We split by space and check if ANY part is a common color
  // But we need to be careful not to match things like "Blue Ribbon" (if that was a size?)
  // Generally, if it contains a color name, it's likely a color or color-variant, not a size.
  // Exception: "16 inch black" -> arguably a size, but mixed. 
  // However, usually sizes are "S", "M", "L", "16", "Cob", "Full".
  
  const parts = normalized.split(' ');
  
  // If the value consists ONLY of color words (e.g. "light blue"), it's definitely a color
  const allPartsAreColors = parts.every(part => 
    COMMON_COLORS.has(part) || 
    part === 'light' || 
    part === 'dark' || 
    part === 'pale' || 
    part === 'deep' ||
    part === 'soft' ||
    part === 'bright' ||
    part === 'metallic'
  );
  
  if (allPartsAreColors) return true;
  
  // Heuristic: If it has a color word AND doesn't look like a measurement (no numbers)
  const hasColor = parts.some(part => COMMON_COLORS.has(part));
  const hasNumber = /\d/.test(value);
  
  // If it has a color but no number, assume it's a color (e.g. "Midnight Blue")
  if (hasColor && !hasNumber) return true;
  
  // Specific check for the user's issue: "01-White/Fleece" -> has color "white", no numbers in normalized "white fleece"
  // Wait "01-" has numbers. But normalized "white fleece" does not.
  
  return false;
}

