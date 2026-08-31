/**
 * Single source of truth for Accessories homeware / kitchen / cards / books split.
 * Maps Shopify product_type (case-insensitive) → category leaf path (3 levels max).
 */

export type AccessoriesCategoryDef = {
  path: string;
  parentUrl: string;
  level: 2 | 3;
  breadcrumb: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
};

/** L2 hubs + L3 leaves to publish in collection_content */
export const ACCESSORIES_SPLIT_CATEGORIES: AccessoriesCategoryDef[] = [
  {
    path: '/accessories/homeware',
    parentUrl: '/accessories',
    level: 2,
    breadcrumb: 'Homeware',
    h1: 'Equestrian Homeware',
    metaTitle: 'Equestrian Homeware | Decor & Soft Furnishings',
    metaDescription:
      'Equestrian homeware for cushions, hooks, wall art and decor. Kitchen pieces and cards sit on their own pages.',
  },
  {
    path: '/accessories/homeware/cushions',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Cushions',
    h1: 'Equestrian Cushions',
    metaTitle: 'Equestrian Cushions | Horse Theme Covers',
    metaDescription:
      'Horse-themed cushions and cushion covers for the home. Throws and wall art sit on sibling homeware pages.',
  },
  {
    path: '/accessories/homeware/throws',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Throws',
    h1: 'Equestrian Throws',
    metaTitle: 'Equestrian Throws | Horse Theme Blankets',
    metaDescription:
      'Equestrian throws and soft blankets with horse motifs. Cushions and bedding sit on related homeware pages.',
  },
  {
    path: '/accessories/homeware/wall-art',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Wall Art',
    h1: 'Equestrian Wall Art',
    metaTitle: 'Equestrian Wall Art | Horse Prints & Signs',
    metaDescription:
      'Equestrian wall art, prints and wall signs. Statues and clocks sit on sibling homeware pages.',
  },
  {
    path: '/accessories/homeware/statues',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Statues',
    h1: 'Equestrian Statues',
    metaTitle: 'Equestrian Statues | Horse Sculptures',
    metaDescription:
      'Horse statues and sculptures for home or office. Garden pieces and wall art sit on related pages.',
  },
  {
    path: '/accessories/homeware/clocks',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Clocks',
    h1: 'Equestrian Clocks',
    metaTitle: 'Equestrian Clocks | Indoor & Outdoor',
    metaDescription:
      'Horse-themed clocks for home and stable walls. Lighting and wall art sit on sibling homeware pages.',
  },
  {
    path: '/accessories/homeware/lighting',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Lighting',
    h1: 'Equestrian Lighting',
    metaTitle: 'Equestrian Lighting | Lamps & Lights',
    metaDescription:
      'Equestrian lamps and lighting with horse detail. Clocks and decor sit on related homeware pages.',
  },
  {
    path: '/accessories/homeware/hooks',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Hooks',
    h1: 'Equestrian Hooks & Hardware',
    metaTitle: 'Equestrian Hooks | Key Racks & Hardware',
    metaDescription:
      'Horse-themed hooks, key racks and hardware for home or tack room. Garden pieces sit nearby.',
  },
  {
    path: '/accessories/homeware/garden',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Garden',
    h1: 'Equestrian Garden Decor',
    metaTitle: 'Equestrian Garden Decor | Outdoor Pieces',
    metaDescription:
      'Garden statues, weathervanes and outdoor horse decor. Indoor statues sit on the statues page.',
  },
  {
    path: '/accessories/homeware/bedding',
    parentUrl: '/accessories/homeware',
    level: 3,
    breadcrumb: 'Bedding',
    h1: 'Equestrian Bedding',
    metaTitle: 'Equestrian Bedding | Doonas & Linen',
    metaDescription:
      'Horse-themed bedding, doonas and linen. Throws and cushions sit on sibling homeware pages.',
  },
  {
    path: '/accessories/kitchen',
    parentUrl: '/accessories',
    level: 2,
    breadcrumb: 'Kitchen',
    h1: 'Equestrian Kitchen & Table',
    metaTitle: 'Equestrian Kitchenware | Mugs, Trays & Glass',
    metaDescription:
      'Horse-themed kitchen and tableware: mugs, trays, glassware and tea towels. Homeware decor is separate.',
  },
  {
    path: '/accessories/kitchen/mugs',
    parentUrl: '/accessories/kitchen',
    level: 3,
    breadcrumb: 'Mugs',
    h1: 'Equestrian Mugs',
    metaTitle: 'Equestrian Mugs | Horse Theme Cups',
    metaDescription:
      'Horse-themed mugs and cups for everyday use. Glassware and trays sit on sibling kitchen pages.',
  },
  {
    path: '/accessories/kitchen/trays',
    parentUrl: '/accessories/kitchen',
    level: 3,
    breadcrumb: 'Trays',
    h1: 'Equestrian Trays',
    metaTitle: 'Equestrian Trays | Serving & Scatter Trays',
    metaDescription:
      'Horse-themed trays and scatter trays for serving or display. Servingware sits on a sibling page.',
  },
  {
    path: '/accessories/kitchen/glassware',
    parentUrl: '/accessories/kitchen',
    level: 3,
    breadcrumb: 'Glassware',
    h1: 'Equestrian Glassware',
    metaTitle: 'Equestrian Glassware | Wine & Tumblers',
    metaDescription:
      'Horse-themed wine glasses, tumblers and glass sets. Barware and mugs sit on related kitchen pages.',
  },
  {
    path: '/accessories/kitchen/tea-towels',
    parentUrl: '/accessories/kitchen',
    level: 3,
    breadcrumb: 'Tea Towels',
    h1: 'Equestrian Tea Towels',
    metaTitle: 'Equestrian Tea Towels | Horse Kitchen Linen',
    metaDescription:
      'Horse-themed tea towels for the kitchen. Bath towels and bedding sit under homeware when separate.',
  },
  {
    path: '/accessories/kitchen/servingware',
    parentUrl: '/accessories/kitchen',
    level: 3,
    breadcrumb: 'Servingware',
    h1: 'Equestrian Servingware',
    metaTitle: 'Equestrian Servingware | Bowls & Platters',
    metaDescription:
      'Horse-themed serving bowls, platters and table pieces. Trays and coasters sit nearby.',
  },
  {
    path: '/accessories/kitchen/coasters',
    parentUrl: '/accessories/kitchen',
    level: 3,
    breadcrumb: 'Coasters',
    h1: 'Equestrian Coasters',
    metaTitle: 'Equestrian Coasters | Horse Theme Sets',
    metaDescription:
      'Horse-themed coaster sets for the table. Trays and barware sit on sibling kitchen pages.',
  },
  {
    path: '/accessories/kitchen/barware',
    parentUrl: '/accessories/kitchen',
    level: 3,
    breadcrumb: 'Barware',
    h1: 'Equestrian Barware',
    metaTitle: 'Equestrian Barware | Openers & Holders',
    metaDescription:
      'Horse-themed barware: bottle openers, stoppers and wine holders. Glassware sits nearby.',
  },
  {
    path: '/accessories/cards',
    parentUrl: '/accessories',
    level: 2,
    breadcrumb: 'Cards',
    h1: 'Equestrian Cards & Stationery',
    metaTitle: 'Equestrian Cards | Greeting Cards & Stationery',
    metaDescription:
      'Horse-themed greeting cards, fun cards and stationery. Books and colouring titles sit under books.',
  },
  {
    path: '/accessories/cards/greeting-cards',
    parentUrl: '/accessories/cards',
    level: 3,
    breadcrumb: 'Greeting Cards',
    h1: 'Equestrian Greeting Cards',
    metaTitle: 'Equestrian Greeting Cards | Horse Occasion Cards',
    metaDescription:
      'Horse-themed greeting and note cards for birthdays and occasions. Fun cards sit on a sibling page.',
  },
  {
    path: '/accessories/cards/fun-cards',
    parentUrl: '/accessories/cards',
    level: 3,
    breadcrumb: 'Fun Cards',
    h1: 'Equestrian Fun Cards',
    metaTitle: 'Equestrian Fun Cards | Humorous Horse Cards',
    metaDescription:
      'Playful horse-themed fun cards. Formal greeting cards and stationery sit on sibling pages.',
  },
  {
    path: '/accessories/cards/stationery',
    parentUrl: '/accessories/cards',
    level: 3,
    breadcrumb: 'Stationery',
    h1: 'Equestrian Stationery',
    metaTitle: 'Equestrian Stationery | Notebooks & Stickers',
    metaDescription:
      'Horse-themed notebooks, stickers and stationery. Greeting cards and books sit nearby.',
  },
  {
    path: '/accessories/books/colouring-books',
    parentUrl: '/accessories/books',
    level: 3,
    breadcrumb: 'Colouring Books',
    h1: 'Equestrian Colouring Books',
    metaTitle: 'Equestrian Colouring Books | Horse Activity Books',
    metaDescription:
      'Horse colouring and activity books. Reading titles and children\'s books sit under books.',
  },
  {
    path: '/accessories/books/childrens-books',
    parentUrl: '/accessories/books',
    level: 3,
    breadcrumb: "Children's Books",
    h1: "Children's Horse Books",
    metaTitle: "Children's Horse Books | Kids Equestrian Titles",
    metaDescription:
      "Children's horse books and finger-puppet titles. Colouring books and adult reading sit nearby.",
  },
];

/**
 * Lowercase product_type → leaf category_path.
 * Only types listed here MOVE off /accessories/gifts.
 */
const TYPE_TO_PATH: Record<string, string> = {
  cushion: '/accessories/homeware/cushions',
  cushions: '/accessories/homeware/cushions',
  throw: '/accessories/homeware/throws',
  throws: '/accessories/homeware/throws',
  'wall art': '/accessories/homeware/wall-art',
  artwork: '/accessories/homeware/wall-art',
  reliefs: '/accessories/homeware/wall-art',
  'wall sign': '/accessories/homeware/wall-art',
  statue: '/accessories/homeware/statues',
  statues: '/accessories/homeware/statues',
  figures: '/accessories/homeware/statues',
  clock: '/accessories/homeware/clocks',
  clocks: '/accessories/homeware/clocks',
  'outdoor clocks': '/accessories/homeware/clocks',
  lighting: '/accessories/homeware/lighting',
  lamp: '/accessories/homeware/lighting',
  lamps: '/accessories/homeware/lighting',
  'lamp base': '/accessories/homeware/lighting',
  lampshade: '/accessories/homeware/lighting',
  'lamp stand': '/accessories/homeware/lighting',
  hooks: '/accessories/homeware/hooks',
  hook: '/accessories/homeware/hooks',
  'haberdashery hardware': '/accessories/homeware/hooks',
  'paper towel holder': '/accessories/homeware/hooks',
  weathervane: '/accessories/homeware/garden',
  fountain: '/accessories/homeware/garden',
  'fountains & ponds': '/accessories/homeware/garden',
  doona: '/accessories/homeware/bedding',
  linen: '/accessories/homeware/bedding',
  'shelf sitter': '/accessories/homeware',
  'trinket box': '/accessories/homeware',
  'jewellery boxes': '/accessories/homeware',
  'photo frame': '/accessories/homeware',
  'letter rack': '/accessories/homeware',
  decor: '/accessories/homeware',
  mug: '/accessories/kitchen/mugs',
  mugs: '/accessories/kitchen/mugs',
  tray: '/accessories/kitchen/trays',
  glassware: '/accessories/kitchen/glassware',
  'wine glass': '/accessories/kitchen/glassware',
  tumbler: '/accessories/kitchen/glassware',
  'tea towels': '/accessories/kitchen/tea-towels',
  'tea towel': '/accessories/kitchen/tea-towels',
  towel: '/accessories/kitchen/tea-towels',
  servingware: '/accessories/kitchen/servingware',
  'serving ware': '/accessories/kitchen/servingware',
  'salt & pepper shakers': '/accessories/kitchen/servingware',
  coaster: '/accessories/kitchen/coasters',
  coasters: '/accessories/kitchen/coasters',
  'bottle opener': '/accessories/kitchen/barware',
  'bottle stopper': '/accessories/kitchen/barware',
  barware: '/accessories/kitchen/barware',
  card: '/accessories/cards/greeting-cards',
  cards: '/accessories/cards/greeting-cards',
  'greeting cards': '/accessories/cards/greeting-cards',
  'note card': '/accessories/cards/greeting-cards',
  'fun card': '/accessories/cards/fun-cards',
  stationary: '/accessories/cards/stationery',
  stationery: '/accessories/cards/stationery',
  notebook: '/accessories/cards/stationery',
  stickers: '/accessories/cards/stationery',
  'colouring books': '/accessories/books/colouring-books',
  'colouring book': '/accessories/books/colouring-books',
  'childrens books': '/accessories/books/childrens-books',
};

/** Canonical product_type label stored in collection_mapping for each leaf */
export const LEAF_CANONICAL_TYPES: Record<string, string[]> = {
  '/accessories/homeware/cushions': ['Cushion', 'Cushions'],
  '/accessories/homeware/throws': ['Throw', 'Throws'],
  '/accessories/homeware/wall-art': ['Wall Art', 'Artwork', 'Reliefs', 'Wall Sign'],
  '/accessories/homeware/statues': ['Statue', 'Statues', 'Figures'],
  '/accessories/homeware/clocks': ['Clock', 'Clocks', 'Outdoor Clocks'],
  '/accessories/homeware/lighting': [
    'Lighting',
    'Lamp',
    'Lamps',
    'Lamp Base',
    'Lampshade',
    'Lamp Stand',
  ],
  '/accessories/homeware/hooks': ['Hooks', 'Hook', 'Haberdashery Hardware', 'Paper Towel Holder'],
  '/accessories/homeware/garden': ['Weathervane', 'Fountain', 'Fountains & Ponds'],
  '/accessories/homeware/bedding': ['Doona', 'Linen'],
  '/accessories/homeware': ['Shelf Sitter', 'Trinket Box', 'Jewellery Boxes', 'Photo Frame', 'Letter Rack', 'Decor'],
  '/accessories/kitchen/mugs': ['Mug', 'Mugs'],
  '/accessories/kitchen/trays': ['Tray'],
  '/accessories/kitchen/glassware': ['Glassware', 'Wine Glass', 'Tumbler'],
  '/accessories/kitchen/tea-towels': ['Tea Towels', 'Tea Towel', 'Towel'],
  '/accessories/kitchen/servingware': ['Servingware', 'Serving Ware', 'Salt & Pepper Shakers'],
  '/accessories/kitchen/coasters': ['Coaster', 'Coasters'],
  '/accessories/kitchen/barware': ['Bottle Opener', 'Bottle Stopper', 'Barware'],
  '/accessories/cards/greeting-cards': ['Card', 'Cards', 'Greeting Cards', 'note card'],
  '/accessories/cards/fun-cards': ['Fun Card'],
  '/accessories/cards/stationery': ['Stationary', 'Stationery', 'Notebook', 'Stickers'],
  '/accessories/books/colouring-books': ['Colouring Books', 'Colouring Book'],
  '/accessories/books/childrens-books': ['Childrens Books'],
};

export function proposedPathForProductType(productType: string | null | undefined): string | null {
  const key = (productType || '').trim().toLowerCase();
  if (!key) return null;
  return TYPE_TO_PATH[key] || null;
}

export function isGiftsCategoryPath(categoryPath: string): boolean {
  const n = categoryPath.trim().replace(/\/$/, '') || '/';
  return n === '/accessories/gifts' || n.startsWith('/accessories/gifts/');
}

export function splitPathParts(categoryPath: string): {
  topLevel: string;
  parentCategory: string;
  subcategoryHandle: string;
} {
  const parts = categoryPath.replace(/^\//, '').split('/').filter(Boolean);
  return {
    topLevel: parts[0] || '',
    parentCategory: parts[1] || '',
    subcategoryHandle: parts[2] || '',
  };
}
