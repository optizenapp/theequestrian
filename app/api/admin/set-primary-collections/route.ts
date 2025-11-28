import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify/client';
import { determinePrimaryCollection } from '@/lib/shopify/primary-collection';

/**
 * Admin API Route: Bulk Set Primary Collection Metafields
 * 
 * This endpoint automatically sets the primary_collection metafield
 * for products based on their collections and tags.
 * 
 * ⚠️ REQUIREMENTS:
 * - This endpoint requires Shopify Admin API access (not Storefront API)
 * - You'll need to set up Admin API credentials in environment variables
 * - See AUTOMATE-BREADCRUMBS.md for setup instructions
 * 
 * Usage:
 * POST /api/admin/set-primary-collections
 * 
 * Query params:
 * - dryRun=true (optional) - Preview changes without saving
 * - limit=100 (optional) - Limit number of products to process
 * 
 * Note: Currently uses Storefront API for reading. Admin API needed for writing.
 * For now, use Shopify Flow or manual Admin API calls for setting metafields.
 */

// GraphQL query to get products with collections, tags, and productType
const GET_PRODUCTS_WITH_COLLECTIONS = `
  query GetProductsWithCollections($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          handle
          title
          tags
          productType
          collections(first: 20) {
            edges {
              node {
                id
                handle
                title
              }
            }
          }
          metafield(namespace: "custom", key: "primary_collection") {
            value
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// GraphQL mutation to set metafield
const SET_METAFIELD = `
  mutation SetMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface ProductNode {
  id: string;
  handle: string;
  title: string;
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

/**
 * Handle GET requests for dry run preview
 */
