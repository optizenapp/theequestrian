import { NextRequest, NextResponse } from 'next/server';
import { getCollectionByHandle } from '@/lib/shopify/collections';
import { shopifyFetch } from '@/lib/shopify/client';
import { normalizeProductType } from '@/lib/shopify/collection-mapping';

const GET_COLLECTION_PRODUCTS = `
  query GetCollectionProducts($handle: String!, $first: Int = 250) {
    collection(handle: $handle) {
      handle
      title
      products(first: $first) {
        edges {
          node {
            id
            handle
            title
            productType
          }
        }
      }
    }
  }
`;

