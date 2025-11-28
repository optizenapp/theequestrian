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
}

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
 * Custom metafield for primary collection
 */
export interface ProductWithPrimaryCollection extends ShopifyProduct {
  primaryCollection?: string; // Format: "category-handle/subcategory-handle"
}

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




 */

export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
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
}

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
 * Custom metafield for primary collection
 */
export interface ProductWithPrimaryCollection extends ShopifyProduct {
  primaryCollection?: string; // Format: "category-handle/subcategory-handle"
}

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



