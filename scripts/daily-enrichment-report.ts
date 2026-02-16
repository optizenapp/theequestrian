#!/usr/bin/env tsx
/**
 * Daily SEO Enrichment Report
 * Comprehensive report of enrichments from the last 24 hours
 */

import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ No database URL found');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('📊 SEO Enrichment - Last 24 Hours Report');
  console.log('=' .repeat(70));
  console.log(`Report Date: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(70));
  console.log('');

  // Summary stats
  const summary = await sql`
    SELECT 
      COUNT(*) as total_enrichments,
      COUNT(DISTINCT page_identifier) as unique_pages,
      SUM(CASE WHEN applied = true THEN 1 ELSE 0 END) as applied,
      SUM(CASE WHEN applied = false THEN 1 ELSE 0 END) as not_applied,
      COUNT(CASE WHEN page_type = 'product' THEN 1 END) as products,
      COUNT(CASE WHEN page_type = 'collection' THEN 1 END) as collections,
      ROUND(SUM(total_cost_usd)::numeric, 4) as total_cost,
      ROUND(AVG(prompt_tokens)::numeric, 0) as avg_prompt_tokens,
      ROUND(AVG(completion_tokens)::numeric, 0) as avg_completion_tokens
    FROM enrichment_log
    WHERE created_at > NOW() - INTERVAL '24 hours';
  `;

  const stats = summary[0];
  
  console.log('📈 Summary:');
  console.log(`   Total Enrichments:    ${stats.total_enrichments}`);
  console.log(`   Unique Pages:         ${stats.unique_pages}`);
  console.log(`   Applied to Live:      ${stats.applied}`);
  console.log(`   Not Applied:          ${stats.not_applied}`);
  console.log(`   Products:             ${stats.products}`);
  console.log(`   Collections:          ${stats.collections}`);
  console.log(`   Total Cost:           $${stats.total_cost}`);
  console.log(`   Avg Prompt Tokens:    ${stats.avg_prompt_tokens}`);
  console.log(`   Avg Output Tokens:    ${stats.avg_completion_tokens}`);
  console.log('');

  // Internal linking stats
  const linkStats = await sql`
    SELECT 
      COUNT(*) as new_links,
      COUNT(DISTINCT source_path) as sources,
      COUNT(DISTINCT target_path) as targets
    FROM internal_link_graph
    WHERE created_at > NOW() - INTERVAL '24 hours';
  `;

  const links = linkStats[0];
  console.log('🔗 Internal Linking (Last 24h):');
  console.log(`   New Links Created:    ${links.new_links}`);
  console.log(`   Source Pages:         ${links.sources}`);
  console.log(`   Target Pages:         ${links.targets}`);
  console.log('');

  // Applied enrichments by page type
  console.log('📄 Applied Enrichments by Type:');
  const byType = await sql`
    SELECT 
      page_type,
      COUNT(*) as count,
      ROUND(SUM(total_cost_usd)::numeric, 4) as cost
    FROM enrichment_log
    WHERE applied = true
      AND created_at > NOW() - INTERVAL '24 hours'
    GROUP BY page_type
    ORDER BY count DESC;
  `;

  byType.forEach((row: any) => {
    console.log(`   ${row.page_type.padEnd(12)}: ${row.count.toString().padEnd(4)} ($${row.cost})`);
  });
  console.log('');

  // Top 10 applied enrichments
  console.log('✅ Top 10 Applied Enrichments:');
  console.log('-' .repeat(70));
  
  const applied = await sql`
    SELECT 
      page_type,
      page_identifier,
      canonical_path,
      prompt_tokens,
      completion_tokens,
      total_cost_usd,
      created_at
    FROM enrichment_log
    WHERE applied = true
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 10;
  `;

  applied.forEach((item: any, idx) => {
    const url = `https://www.theequestrian.com.au${item.canonical_path}`;
    const time = new Date(item.created_at).toLocaleTimeString();
    const cost = `$${item.total_cost_usd.toFixed(4)}`;
    
    console.log(`${(idx + 1).toString().padStart(2)}. ${item.page_type.toUpperCase().padEnd(10)} ${item.page_identifier.substring(0, 45).padEnd(47)}`);
    console.log(`    ${url}`);
    console.log(`    Tokens: ${item.prompt_tokens}→${item.completion_tokens} | Cost: ${cost} | Time: ${time}`);
    console.log('');
  });

  // Check for embedded links in recent enrichments
  console.log('🔗 Embedded Link Analysis:');
  console.log('-' .repeat(70));
  
  const linkAnalysis = await sql`
    SELECT 
      page_identifier,
      page_type,
      canonical_path,
      after_content
    FROM enrichment_log
    WHERE applied = true
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY created_at DESC
    LIMIT 5;
  `;

  linkAnalysis.forEach((item: any) => {
    const content = item.after_content as any;
    
    if (item.page_type === 'product') {
      const descHtml = content.description_html || '';
      const topHtml = content.top_description_html || '';
      const bottomHtml = content.bottom_description_html || '';
      const allHtml = descHtml + topHtml + bottomHtml;
      const linkCount = (allHtml.match(/<a href=/g) || []).length;
      
      console.log(`${item.page_identifier.substring(0, 50)}`);
      console.log(`  Embedded links: ${linkCount}`);
    } else {
      const shortDesc = content.short_description || '';
      const longDesc = content.long_description || '';
      const allHtml = shortDesc + longDesc;
      const linkCount = (allHtml.match(/<a href=/g) || []).length;
      
      console.log(`${item.page_identifier}`);
      console.log(`  Embedded links: ${linkCount}`);
    }
  });
  console.log('');

  // Queue status
  console.log('📋 Current Queue Status:');
  const queueStatus = await sql`
    SELECT status, COUNT(*) as count
    FROM enrichment_queue
    GROUP BY status
    ORDER BY status;
  `;

  queueStatus.forEach((row: any) => {
    const emoji = row.status === 'completed' ? '✅' : 
                  row.status === 'failed' ? '❌' : 
                  row.status === 'processing' ? '⏳' : '⏸️';
    console.log(`   ${emoji} ${row.status.padEnd(12)}: ${row.count}`);
  });
  console.log('');

  console.log('=' .repeat(70));
  console.log('Report Complete');
  console.log('=' .repeat(70));
}

main();
