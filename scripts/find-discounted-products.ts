/**
 * Find Products with Compare At Price (Discounts)
 * 
 * This script finds products that have a compareAtPrice set,
 * which would display the "Save" badge on the product page.
 * 
 * Usage: npx tsx scripts/find-discounted-products.ts
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { shopifyFetch } from '../lib/shopify/client';

const FIND_DISCOUNTED_PRODUCTS = `
  query FindDiscountedProducts {
    products(first: 50) {
      edges {
        node {
          id
          handle
          title
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price {
                  amount
                  currencyCode
                }
                compareAtPrice {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  }
`;

interface ProductsResponse {
  products: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
        priceRange: {
          minVariantPrice: {
            amount: string;
            currencyCode: string;
          };
        };
        variants: {
          edges: Array<{
            node: {
              id: string;
              title: string;
              price: {
                amount: string;
                currencyCode: string;
              };
              compareAtPrice: {
                amount: string;
                currencyCode: string;
              } | null;
            };
          }>;
        };
      };
    }>;
  };
}

async function findDiscountedProducts() {
  console.log('🔍 Searching for products with discounts...\n');

  try {
    const data = await shopifyFetch<ProductsResponse>({
      query: FIND_DISCOUNTED_PRODUCTS,
      variables: {},
    });

    const discountedProducts = data.products.edges.filter(({ node }) => {
      return node.variants.edges.some(({ node: variant }) => {
        return variant.compareAtPrice && 
               parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount);
      });
    });

    if (discountedProducts.length === 0) {
      console.log('❌ No products found with discounts (compareAtPrice set).');
      console.log('\nTo test the save badge, you need to:');
      console.log('1. Go to Shopify Admin');
      console.log('2. Edit a product');
      console.log('3. Set a "Compare at price" that is higher than the regular price');
      console.log('4. Save the product\n');
      return;
    }

    console.log(`✅ Found ${discountedProducts.length} product(s) with discounts:\n`);

    discountedProducts.forEach(({ node: product }) => {
      console.log(`📦 ${product.title}`);
      console.log(`   Handle: ${product.handle}`);
      console.log(`   URL: /products/${product.handle}`);
      
      product.variants.edges.forEach(({ node: variant }) => {
        if (variant.compareAtPrice && parseFloat(variant.compareAtPrice.amount) > parseFloat(variant.price.amount)) {
          const savings = parseFloat(variant.compareAtPrice.amount) - parseFloat(variant.price.amount);
          console.log(`   Variant: ${variant.title}`);
          console.log(`   Price: ${variant.price.currencyCode} ${parseFloat(variant.price.amount).toFixed(2)}`);
          console.log(`   Was: ${variant.compareAtPrice.currencyCode} ${parseFloat(variant.compareAtPrice.amount).toFixed(2)}`);
          console.log(`   💚 Save: ${variant.price.currencyCode} ${savings.toFixed(2)}`);
        }
      });
      console.log('');
    });

    console.log(`\n🎯 Visit any of these product URLs to see the save badge in action!`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
findDiscountedProducts()
  .then(() => {
    console.log('\n✅ Search complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });




