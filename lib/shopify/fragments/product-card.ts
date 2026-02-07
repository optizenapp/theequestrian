/**
 * Optimized Product Fragment for Collection/Category Pages
 * 
 * This fragment includes only the fields needed for product cards,
 * reducing payload size and improving Speed Index
 */

export const PRODUCT_CARD_FRAGMENT = `
  fragment ProductCard on Product {
    id
    handle
    title
    availableForSale
    productType
    vendor
    tags
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      edges {
        node {
          url
          altText
          width
          height
        }
      }
    }
    metafield(namespace: "custom", key: "primary_collection") {
      value
    }
  }
`;

/**
 * Minimal Product Fragment for Counting/Listing
 * Used when only basic product info is needed
 */
export const PRODUCT_MINIMAL_FRAGMENT = `
  fragment ProductMinimal on Product {
    id
    handle
    title
    availableForSale
  }
`;
