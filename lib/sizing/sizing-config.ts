/**
 * Sizing Chart Configuration
 *
 * Central configuration for all brand sizing charts.
 * Maps brand slugs to their sizing chart data and vendor names for smart linking.
 */

export interface SizingChart {
  title: string;
  description?: string;
  images: string[]; // Paths to sizing chart images in /public/sizing/[brand]/
  isPlaceholder?: boolean; // Flag for placeholder images
}

export interface TextChart {
  title: string;
  content: string; // HTML content for text-based sizing
}

export interface BrandSizing {
  slug: string; // URL slug for the brand page
  name: string; // Brand name for internal use
  displayName: string; // Display name for the brand
  vendorNames: string[]; // Vendor names for smart linking from product pages
  charts: SizingChart[]; // Image-based sizing charts
  textCharts?: TextChart[]; // Optional text-based sizing charts
}

/**
 * Product categories that require sizing guides
 */
export const SIZING_REQUIRED_CATEGORIES = [
  'Apparel',
  'Footwear',
  'Helmets',
  'Gloves',
  'Boots',
  'Breeches',
  'Jackets',
  'Shirts',
  'Saddle Pads',
  'Tops',
  'Clothing',
  'Wear',
  'Jodhpurs',
  'Jeans',
  'Tights',
  'Leggings'
];

/**
 * All brand sizing data
 */
export const BRAND_SIZING_DATA: BrandSizing[] = [
  // ===== TUCCI & EGO 7 ===== (Previously Trailrace)
  {
    slug: 'tucci-and-ego-7',
    name: 'Tucci & Ego 7',
    displayName: 'Tucci & Ego 7',
    vendorNames: ['Trailrace', 'Tucci', 'Ego 7', 'Ego7'],
    charts: [
      {
        title: 'Tucci Sizing Charts',
        description: 'Sizing guide for Tucci boots and apparel',
        images: [
          '/sizing/tucci-and-ego-7/tucci-chart-1.png',
          '/sizing/tucci-and-ego-7/tucci-chart-2.png',
        ],
      },
      {
        title: 'Ego 7 Sizing Charts',
        description: 'Sizing guide for Ego 7 boots and apparel',
        images: [
          '/sizing/tucci-and-ego-7/ego7-chart-1.jpg',
          '/sizing/tucci-and-ego-7/ego7-chart-2.png',
          '/sizing/tucci-and-ego-7/ego7-chart-3.png',
        ],
      },
    ],
  },

  // ===== ANIMO ===== (Extracted from DappleEq)
  {
    slug: 'animo',
    name: 'Animo',
    displayName: 'Animo',
    vendorNames: ['Animo', 'DappleEq'],
    charts: [
      {
        title: 'Animo Sizing Charts',
        description: 'Sizing guide for Animo equestrian apparel',
        images: [
          '/sizing/animo/Animo 1.webp',
          '/sizing/animo/animo boots.webp',
        ],
      },
    ],
  },

  // ===== EQUILINE ===== (Extracted from DappleEq)
  {
    slug: 'equiline',
    name: 'Equiline',
    displayName: 'Equiline',
    vendorNames: ['Equiline', 'DappleEq'],
    charts: [
      {
        title: 'Equiline Sizing Charts',
        description: 'Sizing guide for Equiline riding apparel',
        images: [
          '/sizing/equiline/chart-1.jpg',
          '/sizing/equiline/chart-2.jpg',
          '/sizing/equiline/chart-3.jpg',
        ],
      },
    ],
  },

  // ===== PAMPEANO ===== (Extracted from DappleEq)
  {
    slug: 'pampeano',
    name: 'Pampeano',
    displayName: 'Pampeano',
    vendorNames: ['Pampeano', 'DappleEq'],
    charts: [
      {
        title: 'Pampeano Sizing Charts',
        description: 'Sizing guide for Pampeano belts and accessories',
        images: [
          '/sizing/pampeano/chart-1.jpg',
        ],
      },
    ],
  },

  // ===== SECCHIARI ===== (Extracted from DappleEq)
  {
    slug: 'secchiari',
    name: 'Secchiari',
    displayName: 'Secchiari',
    vendorNames: ['Secchiari', 'DappleEq'],
    charts: [
      {
        title: 'Secchiari Sizing Charts',
        description: 'Sizing guide for Secchiari riding boots',
        images: [
          '/sizing/secchiari/chart-1.jpg',
        ],
      },
    ],
  },

  // ===== VESTRUM ===== (Extracted from DappleEq)
  {
    slug: 'vestrum',
    name: 'Vestrum',
    displayName: 'Vestrum',
    vendorNames: ['Vestrum', 'DappleEq'],
    charts: [
      {
        title: 'Vestrum Sizing Charts',
        description: 'Sizing guide for Vestrum equestrian apparel',
        images: [
          '/sizing/vestrum/chart-1.jpg',
        ],
      },
    ],
  },

  // ===== ALESSANDRO ALBANESE ===== (Extracted from Little Equine Co)
  {
    slug: 'alessandro-albanese',
    name: 'Alessandro Albanese',
    displayName: 'Alessandro Albanese',
    vendorNames: ['Alessandro Albanese', 'Little Equine Co'],
    charts: [
      {
        title: 'Alessandro Albanese Sizing Charts',
        description: 'Sizing guide for Alessandro Albanese riding apparel',
        images: [
          '/sizing/alessandro-albanese/alessandro-sizing-1.webp',
          '/sizing/alessandro-albanese/alessandro-sizing-2.webp',
        ],
      },
    ],
  },

  // ===== CAVALLO ===== (Extracted from Little Equine Co)
  {
    slug: 'cavallo',
    name: 'Cavallo',
    displayName: 'Cavallo',
    vendorNames: ['Cavallo', 'Little Equine Co'],
    charts: [
      {
        title: 'Cavallo Sizing Charts',
        description: 'Sizing guide for Cavallo boots and apparel',
        images: [
          '/sizing/cavallo/chart-1.jpg',
          '/sizing/cavallo/chart-2.jpg',
          '/sizing/cavallo/chart-3.jpg',
        ],
      },
    ],
  },

  // ===== GHODHO ===== (Extracted from Little Equine Co)
  {
    slug: 'ghodho',
    name: 'GhoDho',
    displayName: 'GhoDho',
    vendorNames: ['GhoDho', 'Little Equine Co'],
    charts: [
      {
        title: 'GhoDho Sizing Charts',
        description: 'Sizing guide for GhoDho equestrian apparel',
        images: [
          '/sizing/ghodho/chart-1.jpg',
        ],
      },
    ],
  },

  // ===== HITCHLEY & HARROW =====
  {
    slug: 'hitchley-harrow',
    name: 'Hitchley & Harrow',
    displayName: 'Hitchley & Harrow',
    vendorNames: ['Hitchley & Harrow', 'Hitchley and Harrow'],
    charts: [
      {
        title: 'Hitchley & Harrow Sizing Charts',
        description: 'Sizing guide for Hitchley & Harrow products',
        images: [
          '/sizing/hitchley-harrow/sizing-chart.jpg',
        ],
      },
    ],
  },

  // ===== DIAMOND DELUXE =====
  {
    slug: 'diamond-deluxe',
    name: 'Diamond Deluxe',
    displayName: 'Diamond Deluxe',
    vendorNames: ['Diamond Deluxe'],
    charts: [
      {
        title: 'Diamond Deluxe Sizing Charts',
        description: 'Sizing guide for Diamond Deluxe horsewear',
        images: [
          '/sizing/diamond-deluxe/rug-sizing.jpg',
        ],
      },
    ],
  },

  // ===== JP EQUESTRIAN FASHION =====
  {
    slug: 'jp-equestrian',
    name: 'JP Equestrian Fashion',
    displayName: 'JP Equestrian Fashion',
    vendorNames: ['JP Equestrian Fashion', 'JP Equestrian'],
    textCharts: [
      {
        title: 'JP Equestrian Fashion Sizing Guide',
        content: `
          <h3>Women's Sizing</h3>
          <table class="min-w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-2">Size</th>
                <th class="border border-gray-300 px-4 py-2">AU/UK</th>
                <th class="border border-gray-300 px-4 py-2">US</th>
                <th class="border border-gray-300 px-4 py-2">EU</th>
                <th class="border border-gray-300 px-4 py-2">Bust (cm)</th>
                <th class="border border-gray-300 px-4 py-2">Waist (cm)</th>
                <th class="border border-gray-300 px-4 py-2">Hip (cm)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-4 py-2">XS</td>
                <td class="border border-gray-300 px-4 py-2">8</td>
                <td class="border border-gray-300 px-4 py-2">4</td>
                <td class="border border-gray-300 px-4 py-2">36</td>
                <td class="border border-gray-300 px-4 py-2">81-84</td>
                <td class="border border-gray-300 px-4 py-2">63-66</td>
                <td class="border border-gray-300 px-4 py-2">88-91</td>
              </tr>
              <tr>
                <td class="border border-gray-300 px-4 py-2">S</td>
                <td class="border border-gray-300 px-4 py-2">10</td>
                <td class="border border-gray-300 px-4 py-2">6</td>
                <td class="border border-gray-300 px-4 py-2">38</td>
                <td class="border border-gray-300 px-4 py-2">86-89</td>
                <td class="border border-gray-300 px-4 py-2">68-71</td>
                <td class="border border-gray-300 px-4 py-2">93-96</td>
              </tr>
              <tr>
                <td class="border border-gray-300 px-4 py-2">M</td>
                <td class="border border-gray-300 px-4 py-2">12</td>
                <td class="border border-gray-300 px-4 py-2">8</td>
                <td class="border border-gray-300 px-4 py-2">40</td>
                <td class="border border-gray-300 px-4 py-2">91-94</td>
                <td class="border border-gray-300 px-4 py-2">73-76</td>
                <td class="border border-gray-300 px-4 py-2">98-101</td>
              </tr>
              <tr>
                <td class="border border-gray-300 px-4 py-2">L</td>
                <td class="border border-gray-300 px-4 py-2">14</td>
                <td class="border border-gray-300 px-4 py-2">10</td>
                <td class="border border-gray-300 px-4 py-2">42</td>
                <td class="border border-gray-300 px-4 py-2">96-99</td>
                <td class="border border-gray-300 px-4 py-2">78-81</td>
                <td class="border border-gray-300 px-4 py-2">103-106</td>
              </tr>
              <tr>
                <td class="border border-gray-300 px-4 py-2">XL</td>
                <td class="border border-gray-300 px-4 py-2">16</td>
                <td class="border border-gray-300 px-4 py-2">12</td>
                <td class="border border-gray-300 px-4 py-2">44</td>
                <td class="border border-gray-300 px-4 py-2">101-104</td>
                <td class="border border-gray-300 px-4 py-2">83-86</td>
                <td class="border border-gray-300 px-4 py-2">108-111</td>
              </tr>
            </tbody>
          </table>
          <p class="text-sm text-gray-600 mt-4">All measurements are approximate. For best results, measure yourself and compare to the chart above.</p>
        `,
      },
    ],
    charts: [],
  },

  // ===== PLUM TACK =====
  {
    slug: 'plum-tack',
    name: 'Plum Tack',
    displayName: 'Plum Tack',
    vendorNames: ['Plum Tack'],
    charts: [
      {
        title: 'Plum Tack Sizing Charts',
        description: 'Sizing guide for Plum Tack jods and breeches',
        images: [
          '/sizing/plum-tack/measurements.png',
          '/sizing/plum-tack/size-chart.jpg',
        ],
      },
    ],
  },

  // ===== ANKY =====
  {
    slug: 'anky',
    name: 'Anky',
    displayName: 'Anky',
    vendorNames: ['Anky', 'ANKY'],
    charts: [
      {
        title: 'Anky Sizing Charts',
        description: 'Sizing guide for Anky riding apparel and accessories',
        images: [
          '/sizing/anky/upper-body.png',
          '/sizing/anky/breeches.png',
          '/sizing/anky/saddle-pads.png',
          '/sizing/anky/gloves.png',
        ],
      },
    ],
  },

  // ===== JNK COLLECTIVE =====
  {
    slug: 'jnk-collective',
    name: 'JNK Collective',
    displayName: 'JNK Collective',
    vendorNames: ['JNK Collective', 'JNK'],
    textCharts: [
      {
        title: 'JNK Collective Sizing Guide',
        content: `
          <h3>Australian Sizes</h3>
          
          <h4 class="font-semibold mt-4 mb-2">Ladies - Tights</h4>
          <table class="min-w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-2">XXXS</th>
                <th class="border border-gray-300 px-4 py-2">XXS</th>
                <th class="border border-gray-300 px-4 py-2">XS</th>
                <th class="border border-gray-300 px-4 py-2">S</th>
                <th class="border border-gray-300 px-4 py-2">M</th>
                <th class="border border-gray-300 px-4 py-2">L</th>
                <th class="border border-gray-300 px-4 py-2">XL</th>
                <th class="border border-gray-300 px-4 py-2">XXL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-4 py-2 text-center">4</td>
                <td class="border border-gray-300 px-4 py-2 text-center">6</td>
                <td class="border border-gray-300 px-4 py-2 text-center">8</td>
                <td class="border border-gray-300 px-4 py-2 text-center">10</td>
                <td class="border border-gray-300 px-4 py-2 text-center">12</td>
                <td class="border border-gray-300 px-4 py-2 text-center">14</td>
                <td class="border border-gray-300 px-4 py-2 text-center">16</td>
                <td class="border border-gray-300 px-4 py-2 text-center">18+</td>
              </tr>
            </tbody>
          </table>

          <h4 class="font-semibold mt-4 mb-2">Ladies - Breeches</h4>
          <table class="min-w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-2">XXS</th>
                <th class="border border-gray-300 px-4 py-2">XS</th>
                <th class="border border-gray-300 px-4 py-2">S</th>
                <th class="border border-gray-300 px-4 py-2">M</th>
                <th class="border border-gray-300 px-4 py-2">L</th>
                <th class="border border-gray-300 px-4 py-2">XL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-4 py-2 text-center">6</td>
                <td class="border border-gray-300 px-4 py-2 text-center">8</td>
                <td class="border border-gray-300 px-4 py-2 text-center">10</td>
                <td class="border border-gray-300 px-4 py-2 text-center">12</td>
                <td class="border border-gray-300 px-4 py-2 text-center">14</td>
                <td class="border border-gray-300 px-4 py-2 text-center">16</td>
              </tr>
            </tbody>
          </table>

          <h4 class="font-semibold mt-4 mb-2">Kids</h4>
          <p class="text-sm text-gray-600 mb-2">This size chart is only an estimate (not including Polos)</p>
          <table class="min-w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr class="bg-gray-100">
                <th class="border border-gray-300 px-4 py-2">XXXS</th>
                <th class="border border-gray-300 px-4 py-2">XXS</th>
                <th class="border border-gray-300 px-4 py-2">XS</th>
                <th class="border border-gray-300 px-4 py-2">S</th>
                <th class="border border-gray-300 px-4 py-2">M</th>
                <th class="border border-gray-300 px-4 py-2">L</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 px-4 py-2 text-center">6</td>
                <td class="border border-gray-300 px-4 py-2 text-center">8</td>
                <td class="border border-gray-300 px-4 py-2 text-center">10</td>
                <td class="border border-gray-300 px-4 py-2 text-center">12</td>
                <td class="border border-gray-300 px-4 py-2 text-center">14</td>
                <td class="border border-gray-300 px-4 py-2 text-center">16</td>
              </tr>
            </tbody>
          </table>
        `,
      },
    ],
    charts: [],
  },

  // ===== ROECKL =====
  {
    slug: 'roeckl',
    name: 'Roeckl',
    displayName: 'Roeckl',
    vendorNames: ['Roeckl'],
    charts: [
      {
        title: 'Roeckl Glove Sizing Chart',
        description: 'Sizing guide for Roeckl riding gloves',
        images: [
          '/sizing/roeckl/glove-size-chart.png',
        ],
      },
    ],
  },

  // ===== BAXTER =====
  {
    slug: 'baxter',
    name: 'Baxter',
    displayName: 'Baxter',
    vendorNames: ['Baxter', 'Baxter Boots'],
    charts: [
      {
        title: 'Baxter Boot Sizing Guide',
        description: 'Sizing guide for Baxter riding boots',
        images: [
          '/sizing/baxter/boot-sizing.png',
        ],
      },
    ],
  },

  // ===== CAVALLERIA TOSCANA =====
  {
    slug: 'cavalleria-toscana',
    name: 'Cavalleria Toscana',
    displayName: 'Cavalleria Toscana',
    vendorNames: ['Cavalleria Toscana'],
    charts: [
      {
        title: 'Cavalleria Toscana Sizing Charts',
        description: 'Sizing guide for Cavalleria Toscana products',
        images: [
          '/sizing/cavalleria-toscana/ct-sizing-charts.webp',
        ],
      },
    ],
  },

  // ===== ARIAT =====
  {
    slug: 'ariat',
    name: 'Ariat',
    displayName: 'Ariat',
    vendorNames: ['Ariat'],
    charts: [
      {
        title: 'Ariat Sizing Charts',
        description: 'Sizing guide for Ariat boots and apparel',
        images: [
          '/sizing/placeholder.svg',
        ],
        isPlaceholder: true,
      },
    ],
  },
];

/**
 * Helper Functions
 */

/**
 * Check if a product needs a sizing guide based on vendor and product type
 */
export interface BrandSizingContext {
  vendor?: string | null;
  productType?: string | null;
  title?: string | null;
  handle?: string | null;
}

const normalize = (value?: string | null) => (value ? value.trim().toLowerCase() : '');

function buildBrandKeywords(brand: BrandSizing) {
  const keywords = new Set<string>();

  brand.vendorNames.forEach((vendorName) => {
    const normalizedVendor = normalize(vendorName);
    if (normalizedVendor) {
      keywords.add(normalizedVendor);
    }
  });

  [brand.name, brand.displayName]
    .map(normalize)
    .forEach((value) => {
      if (value) {
        keywords.add(value);
      }
    });

  const slugKeyword = brand.slug.replace(/-/g, ' ').trim().toLowerCase();
  if (slugKeyword) {
    keywords.add(slugKeyword);
  }

  return keywords;
}

function matchesKeyword(value: string, keywords: Set<string>) {
  if (!value) return false;
  for (const keyword of keywords) {
    if (value.includes(keyword)) {
      return true;
    }
  }

  return false;
}

function findBrandSizingByContext(context: BrandSizingContext): BrandSizing | null {
  const vendorNormalized = normalize(context.vendor);
  const titleNormalized = normalize(context.title);
  const handleNormalized = normalize(context.handle);

  // 1. Try to match by Title or Handle (Strongest Signal)
  for (const brand of BRAND_SIZING_DATA) {
    const keywords = buildBrandKeywords(brand);

    if (titleNormalized && matchesKeyword(titleNormalized, keywords)) {
      return brand;
    }

    if (handleNormalized && matchesKeyword(handleNormalized, keywords)) {
      return brand;
    }
  }

  // 2. Fallback to Vendor match (Weakest Signal - might be distributor)
  for (const brand of BRAND_SIZING_DATA) {
    const keywords = buildBrandKeywords(brand);
    
    // Exact match on vendor is better than partial
    if (vendorNormalized && keywords.has(vendorNormalized)) {
        return brand;
    }
    
    // Partial match on vendor
    if (vendorNormalized && matchesKeyword(vendorNormalized, keywords)) {
      return brand;
    }
  }

  return null;
}

function isProductTypeRelevant(productType?: string | null) {
  if (!productType || productType.trim().length === 0) {
    return true;
  }

  const normalizedProductType = productType.trim().toLowerCase();
  return SIZING_REQUIRED_CATEGORIES.some((category) =>
    normalizedProductType.includes(category.toLowerCase())
  );
}

function resolveBrandSizingForProduct(context: BrandSizingContext): BrandSizing | null {
  const brand = findBrandSizingByContext(context);
  if (!brand) {
    return null;
  }

  if (!isProductTypeRelevant(context.productType)) {
    return null;
  }

  return brand;
}

export function needsSizingGuide(context: BrandSizingContext): boolean {
  return resolveBrandSizingForProduct(context) !== null;
}

/** 
 * Get sizing URL for a product based on vendor and product type
 */
export function getSizingUrl(context: BrandSizingContext): string | null {
  const brand = resolveBrandSizingForProduct(context);
  return brand ? `/sizing/${brand.slug}` : null;
}

/**
 * Get brand sizing data by slug
 */
export function getBrandSizing(slug: string): BrandSizing | null {
  return BRAND_SIZING_DATA.find((brand) => brand.slug === slug) || null;
}

/**
 * Get all brand slugs for static generation
 */
export function getAllBrandSlugs(): string[] {
  return BRAND_SIZING_DATA.map((brand) => brand.slug);
}

/**
 * Get all brands for the main sizing index page
 */
export function getAllBrands(): BrandSizing[] {
  return BRAND_SIZING_DATA;
}
