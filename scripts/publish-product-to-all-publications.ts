#!/usr/bin/env tsx
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { shopifyAdminFetch } from '@/lib/shopify/admin-client';

const GID_PREFIX = 'gid://shopify/Product/';

interface PublicationNode {
  id: string;
  name: string;
}

async function main() {
  const productIdArg = process.argv[2];
  if (!productIdArg) {
    console.error('Usage: npx tsx scripts/publish-product-to-all-publications.ts <productId>');
    process.exit(1);
  }

  const productGid = productIdArg.startsWith(GID_PREFIX) ? productIdArg : `${GID_PREFIX}${productIdArg}`;

  const pubs = await shopifyAdminFetch<{ publications: { edges: Array<{ node: PublicationNode }> } }>({
    query: `
      query GetPublications {
        publications(first: 50) {
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

  const publications = pubs.publications.edges.map((edge) => edge.node);
  console.log(`Found ${publications.length} publications.`);

  for (const publication of publications) {
    const result = await shopifyAdminFetch<{
      publishablePublish: {
        userErrors: Array<{ message: string }>;
      };
    }>({
      query: `
        mutation PublishProduct($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            userErrors {
              message
            }
          }
        }
      `,
      variables: {
        id: productGid,
        input: [{ publicationId: publication.id }],
      },
    });

    const firstError = result.publishablePublish.userErrors[0];
    if (firstError) {
      console.log(`✖ ${publication.name}: ${firstError.message}`);
    } else {
      console.log(`✔ ${publication.name}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
