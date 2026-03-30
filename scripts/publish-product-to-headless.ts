#!/usr/bin/env tsx
/**
 * Publish a single product to the Headless/Storefront publication.
 * Usage: npx tsx scripts/publish-product-to-headless.ts 10390130524452
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

const GID_PREFIX = 'gid://shopify/Product/';

interface PublicationNode {
  id: string;
  name: string;
}

async function getHeadlessPublicationId(): Promise<string> {
  const result = await shopifyAdminFetch<{ publications: { edges: Array<{ node: PublicationNode }> } }>({
    query: `
      query GetPublications {
        publications(first: 25) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `,
  });

  const publications = result.publications.edges.map((edge) => edge.node);
  const headless = publications.find((publication) => {
    const name = publication.name.toLowerCase();
    return name.includes('headless') || name.includes('storefront');
  });

  if (!headless) {
    throw new Error(`No Headless/Storefront publication found. Available: ${publications.map((p) => p.name).join(', ')}`);
  }

  return headless.id;
}

async function publishProduct(productGid: string, publicationId: string): Promise<void> {
  const result = await shopifyAdminFetch<{
    publishablePublish: {
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>({
    query: `
      mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) {
          userErrors {
            field
            message
          }
        }
      }
    `,
    variables: {
      id: productGid,
      input: [{ publicationId }],
    },
  });

  const firstError = result.publishablePublish.userErrors[0];
  if (firstError) {
    throw new Error(firstError.message);
  }
}

async function main() {
  const productIdArg = process.argv[2];
  if (!productIdArg) {
    console.error('Usage: npx tsx scripts/publish-product-to-headless.ts <productId>');
    process.exit(1);
  }

  const productGid = productIdArg.startsWith(GID_PREFIX) ? productIdArg : `${GID_PREFIX}${productIdArg}`;
  const publicationId = await getHeadlessPublicationId();
  await publishProduct(productGid, publicationId);
  console.log(`Published ${productGid} to publication ${publicationId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
