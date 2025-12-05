'use client';

/**
 * Product Variant Selector Component
 * 
 * Features:
 * - Separates variants by option type (Size, Color, etc.)
 * - Color swatches for color options
 * - Inline layout that wraps to multiple lines if needed
 * - Controlled component (receives selectedOptions and onOptionSelect)
 */

import { ShopifyProduct } from '@/types/shopify';

interface ProductVariantSelectorProps {
  product: ShopifyProduct;
  selectedOptions: Record<string, string>;
  onOptionSelect: (optionName: string, value: string) => void;
}

// Color mapping for common color names
// TODO: This should eventually come from Shopify metafields or a database
const COLOR_MAP: Record<string, string> = {
  'black': '#000000',
  'white': '#FFFFFF',
  'red': '#DC2626',
  'blue': '#2563EB',
  'navy': '#1E3A8A',
  'green': '#16A34A',
  'yellow': '#EAB308',
  'orange': '#EA580C',
  'pink': '#EC4899',
  'purple': '#9333EA',
  'brown': '#92400E',
  'grey': '#6B7280',
  'gray': '#6B7280',
  'beige': '#D4C5B9',
  'cream': '#FFFDD0',
  'tan': '#D2B48C',
  'burgundy': '#800020',
  'maroon': '#800000',
  'teal': '#14B8A6',
  'turquoise': '#06B6D4',
  'lime': '#84CC16',
  'olive': '#808000',
  'khaki': '#C3B091',
  'silver': '#C0C0C0',
  'gold': '#FFD700',
  'chocolate': '#7B3F00',
  'emerald': '#50C878',
  'mustard': '#FFDB58',
  'sky': '#87CEEB',
};

function getColorHex(colorName: string): string | null {
  const normalized = colorName.toLowerCase().trim();
  return COLOR_MAP[normalized] || null;
}

export function ProductVariantSelector({ product, selectedOptions, onOptionSelect }: ProductVariantSelectorProps) {
  const variants = product.variants.edges;

  if (variants.length <= 1) {
    return null; // Don't show selector if only one variant
  }

  // Extract all unique option names and their values
  const optionTypes = new Map<string, Set<string>>();
  
  variants.forEach(({ node: variant }) => {
    variant.selectedOptions.forEach(option => {
      if (!optionTypes.has(option.name)) {
        optionTypes.set(option.name, new Set());
      }
      optionTypes.get(option.name)?.add(option.value);
    });
  });

  return (
    <div className="space-y-4">
      {Array.from(optionTypes.entries()).map(([optionName, values]) => {
        const isColorOption = optionName.toLowerCase() === 'color' || optionName.toLowerCase() === 'colour';
        const valuesArray = Array.from(values);

        return (
          <div key={optionName}>
            <label className="text-sm font-semibold text-gray-900 mb-2 block">
              {optionName}
            </label>

            {isColorOption ? (
              // Color Swatches
              <div className="flex flex-wrap gap-2">
                {valuesArray.map(value => {
                  const colorHex = getColorHex(value);
                  const isSelected = selectedOptions[optionName] === value;

                  return (
                    <button
                      key={value}
                      onClick={() => onOptionSelect(optionName, value)}
                      className={`relative group ${
                        isSelected ? 'ring-2 ring-action ring-offset-2' : ''
                      }`}
                      title={value}
                    >
                      {colorHex ? (
                        // Color swatch
                        <div className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-gray-400 transition-colors overflow-hidden">
                          <div 
                            className="w-full h-full"
                            style={{ backgroundColor: colorHex }}
                          />
                          {colorHex === '#FFFFFF' && (
                            <div className="absolute inset-0 border border-gray-200 rounded-full pointer-events-none" />
                          )}
                        </div>
                      ) : (
                        // Text fallback for colors without hex mapping
                        <div
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-action text-white'
                              : 'bg-white text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          {value}
                        </div>
                      )}
                      
                      {/* Tooltip */}
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {value}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              // Regular options (Size, etc.) - Inline layout
              <div className="flex flex-wrap gap-2">
                {valuesArray.map(value => {
                  const isSelected = selectedOptions[optionName] === value;
                  
                  // Find if this variant is available
                  const variantWithThisOption = variants.find(({ node }) =>
                    node.selectedOptions.some(opt => opt.name === optionName && opt.value === value)
                  );
                  const isAvailable = variantWithThisOption?.node.availableForSale ?? true;

                  return (
                    <button
                      key={value}
                      onClick={() => onOptionSelect(optionName, value)}
                      disabled={!isAvailable}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-action bg-action text-white'
                          : isAvailable
                            ? 'border-gray-300 hover:border-gray-400 text-gray-900'
                            : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

