#!/usr/bin/env tsx
/**
 * Check if enriched content has embedded internal links in HTML
 */

import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ No database URL found');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('🔍 Checking for embedded links in HTML content...\n');

  // Get recently applied enrichments
  const enrichments = await sql`
    SELECT 
      page_identifier,
      page_type,
      canonical_path,
      after_content,
      created_at
    FROM enrichment_log
    WHERE applied = true
    ORDER BY created_at DESC
    LIMIT 5;
  `;

  for (const item of enrichments) {
    console.log(`📄 ${item.page_identifier}`);
    console.log(`   URL: https://www.theequestrian.com.au${item.canonical_path}`);
    console.log(`   Enriched: ${new Date(item.created_at).toLocaleString()}`);
    
    const content = item.after_content as any;
    
    // Check for <a href links in HTML fields
    const htmlFields = item.page_type === 'product' 
      ? ['description_html', 'top_description_html', 'bottom_description_html']
      : ['short_description', 'long_description'];
    
    let hasEmbeddedLinks = false;
    let linkCount = 0;
    
    for (const field of htmlFields) {
      const html = content[field] || '';
      const matches = html.match(/<a\s+href="[^"]*"[^>]*>/g);
      if (matches && matches.length > 0) {
        hasEmbeddedLinks = true;
        linkCount += matches.length;
        console.log(`   ✅ ${field}: ${matches.length} embedded links`);
        
        // Show first link as example
        const firstLink = html.match(/<a\s+href="([^"]*)"[^>]*>([^<]*)<\/a>/);
        if (firstLink) {
          console.log(`      Example: "${firstLink[2]}" → ${firstLink[1]}`);
        }
      }
    }
    
    if (!hasEmbeddedLinks) {
      console.log(`   ❌ NO embedded links found in HTML`);
    } else {
      console.log(`   📊 Total embedded links: ${linkCount}`);
    }
    
    console.log('');
  }
}

main();
