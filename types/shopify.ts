/**
 * Shopify Storefront API Types
 */

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  createdAt?: string; // ISO 8601 date string
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  compareAtPriceRange?: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
    maxVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  images: {
    edges: Array<{
      node: {
        url: string;
        altText: string | null;
        width: number;
        height: number;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
  tags: string[];
  vendor: string;
  productType: string;
  collections: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }>;
  };
  metafield?: {
    value: string;
  } | null;
  // Additional metafields for specific use cases
  primaryCollection?: {
    value: string;
  } | null;
  reviewRating?: {
    value: string;
  } | null;
  reviewCount?: {
    value: string;
  } | null;
}

/**
 * Lightweight product shape for grids/carousels.
 * (We intentionally do NOT require the full ShopifyProduct fields like variants,
 * collections, description, etc. because our handle-based homepage queries only
 * fetch a subset.)
 */
export type ShopifyProductCard = Pick<
  ShopifyProduct,
  | 'id'
  | 'handle'
  | 'title'
  | 'availableForSale'
  | 'vendor'
  | 'priceRange'
  | 'compareAtPriceRange'
  | 'images'
  | 'metafield'
  | 'primaryCollection'
  | 'reviewRating'
  | 'reviewCount'
>;

export interface ShopifyVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: string;
  } | null;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  image?: {
    url: string;
    altText: string | null;
    width: number;
    height: number;
  } | null;
  product?: {
    handle: string;
    title: string;
    productType: string;
    vendor: string;
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
  };
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  image?: {
    url: string;
    altText: string | null;
    width: number;
    height: number;
  } | null;
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      endCursor: string | null;
    };
  };
  metafield?: {
    value: string;
  } | null;
  metafields?: Array<{
    namespace: string;
    key: string;
    value: string;
  }>;
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  cost: {
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalTaxAmount?: {
      amount: string;
      currencyCode: string;
    } | null;
  };
  lines: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        merchandise: ShopifyVariant;
      };
    }>;
  };
  totalQuantity: number;
}

/**
 * Product with primary collection metafield.
 *
 * NOTE: This name is kept for backwards compatibility across the codebase.
 * The Storefront API returns the primary collection as a metafield object
 * (e.g. `primaryCollection: { value } | null`), which is already represented
 * on `ShopifyProduct`. We therefore alias to `ShopifyProduct` to avoid
 * incompatible structural typing.
 */
export type ProductWithPrimaryCollection = ShopifyProduct;

/**
 * Collection with parent reference and content
 */
export interface CollectionWithParent extends ShopifyCollection {
  parentCollection?: string; // Parent collection handle
  pageContent?: string; // Rich HTML content
  seoDescription?: string; // SEO meta description
  featuredLinks?: Array<{
    type: 'product' | 'collection';
    handle: string;
    text: string;
  }>;
}

export interface ShopifyImage {
  url: string;
  altText: string | null;
  width: number;
  height: number;
}

export interface ShopifyAuthor {
  name: string;
  // Note: Shopify Storefront API doesn't support bio or image
}

export interface ShopifyArticle {
  id: string;
  handle: string;
  title: string;
  contentHtml: string;
  excerpt?: string;
  excerptHtml?: string;
  publishedAt: string;
  image?: ShopifyImage | null;
  seo?: {
    title?: string;
    description?: string;
  };
  tags: string[];
  author: ShopifyAuthor;
  blog: {
    handle: string;
  };
}

export interface ShopifyBlog {
  handle: string;
  title: string;
  articles: {
    edges: Array<{
      node: ShopifyArticle;
    }>;
  };
}
