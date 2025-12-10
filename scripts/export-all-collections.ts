
import * as fs from 'fs';
import * as path from 'path';
import { stringify } from 'csv-stringify/sync';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

import { shopifyAdminFetch } from '../lib/shopify/admin-client';

const GET_ALL_COLLECTIONS_QUERY = `
  query GetAllCollections($cursor: String) {
    collections(first: 250, after: $cursor) {
      edges {
        node {
          title
          handle
          productsCount {
            count
          }
          ruleSet {
            rules {
              column
              relation
              condition
            }
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

async function exportCollections() {
  console.log('🚀 Fetching all collections from Shopify...');
  
  let allCollections: any[] = [];
  let hasNextPage = true;
  let cursor = null;

  while (hasNextPage) {
    const data: any = await shopifyAdminFetch({
      query: GET_ALL_COLLECTIONS_QUERY,
      variables: { cursor }
    });

    const edges = data.collections.edges;
    allCollections = allCollections.concat(edges.map((edge: any) => edge.node));
    
    hasNextPage = data.collections.pageInfo.hasNextPage;
    cursor = data.collections.pageInfo.endCursor;
    
    process.stdout.write(`   Fetched ${allCollections.length} collections...\r`);
  }

  console.log(`\n✅ Found ${allCollections.length} total collections.`);

  // Format for CSV
  const rows = allCollections.map(c => ({
    title: c.title,
    handle: c.handle,
    url: `/collections/${c.handle}`,
    products_count: c.productsCount,
    rules: c.ruleSet ? JSON.stringify(c.ruleSet.rules) : 'Manual Collection'
  }));

  // Sort by title
  rows.sort((a, b) => a.title.localeCompare(b.title));

  // Write to CSV
  const csvContent = stringify(rows, { header: true });
  const outputPath = path.join(process.cwd(), 'exports', 'all-collections-draft.csv');
  
  fs.writeFileSync(outputPath, csvContent);
  console.log(`📝 Exported to: ${outputPath}`);
}

exportCollections().catch(console.error);

