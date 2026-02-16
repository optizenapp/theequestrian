#!/usr/bin/env tsx
/**
 * SEO Enrichment Pipeline Status Report
 * Shows comprehensive status of the enrichment system
 */

import { neon } from '@neondatabase/serverless';

async function main() {
  const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ No database URL found in environment');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log('📊 SEO Enrichment Pipeline Status Report');
  console.log('=' .repeat(60));
  console.log('');

  // Queue status
  console.log('📋 Queue Status:');
  const queueStatus = await sql`
    SELECT status, COUNT(*) as count 
    FROM enrichment_queue 
    GROUP BY status 
    ORDER BY status;
  `;
  
  if (queueStatus.length === 0) {
    console.log('   No items in queue');
  } else {
    queueStatus.forEach((row: any) => {
      const emoji = row.status === 'completed' ? '✅' : 
                    row.status === 'failed' ? '❌' : 
                    row.status === 'processing' ? '⏳' : '⏸️';
      console.log(`   ${emoji} ${row.status.padEnd(12)}: ${row.count}`);
    });
  }
  console.log('');

  // Enrichment log summary
  console.log('📝 Enrichment Log:');
  const logSummary = await sql`
    SELECT 
      COUNT(*) as total_enrichments,
      COUNT(DISTINCT page_identifier) as unique_pages,
      SUM(CASE WHEN applied = true THEN 1 ELSE 0 END) as applied_count,
      SUM(CASE WHEN rolled_back = true THEN 1 ELSE 0 END) as rolled_back_count,
      ROUND(AVG(prompt_tokens)::numeric, 0) as avg_prompt_tokens,
      ROUND(AVG(completion_tokens)::numeric, 0) as avg_completion_tokens,
      ROUND(SUM(total_cost_usd)::numeric, 4) as total_cost_usd
    FROM enrichment_log;
  `;
  
  const log = logSummary[0];
  console.log(`   Total enrichments: ${log.total_enrichments}`);
  console.log(`   Unique pages:      ${log.unique_pages}`);
  console.log(`   Applied:           ${log.applied_count}`);
  console.log(`   Rolled back:       ${log.rolled_back_count}`);
  console.log(`   Avg prompt tokens: ${log.avg_prompt_tokens || 0}`);
  console.log(`   Avg output tokens: ${log.avg_completion_tokens || 0}`);
  console.log(`   Total cost:        $${log.total_cost_usd || 0}`);
  console.log('');

  // Internal linking
  console.log('🔗 Internal Link Graph:');
  const linkStats = await sql`
    SELECT 
      COUNT(*) as total_links,
      COUNT(DISTINCT link_type) as unique_link_types,
      COUNT(DISTINCT source_path) as sources,
      COUNT(DISTINCT target_path) as targets
    FROM internal_link_graph;
  `;
  
  const links = linkStats[0];
  console.log(`   Total links:       ${links.total_links}`);
  console.log(`   Link types:        ${links.unique_link_types}`);
  console.log(`   Source pages:      ${links.sources}`);
  console.log(`   Target pages:      ${links.targets}`);
  console.log('');

  // Link type breakdown
  console.log('   Link type breakdown:');
  const linkTypes = await sql`
    SELECT link_type, COUNT(*) as count 
    FROM internal_link_graph 
    GROUP BY link_type 
    ORDER BY count DESC;
  `;
  
  linkTypes.forEach((row: any) => {
    console.log(`     • ${row.link_type.padEnd(15)}: ${row.count}`);
  });
  console.log('');

  // SERP cache
  console.log('🔍 SERP Analysis Cache:');
  const serpCache = await sql`
    SELECT 
      COUNT(*) as total_cached,
      COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid_cache,
      COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_cache
    FROM serp_cache;
  `;
  
  const serp = serpCache[0];
  console.log(`   Total cached:      ${serp.total_cached}`);
  console.log(`   Valid:             ${serp.valid_cache}`);
  console.log(`   Expired:           ${serp.expired_cache}`);
  console.log('');

  // Recent activity
  console.log('⏰ Recent Activity (Last 24h):');
  const recentActivity = await sql`
    SELECT 
      COUNT(*) as enrichments_24h,
      COUNT(DISTINCT page_identifier) as pages_24h
    FROM enrichment_log
    WHERE created_at > NOW() - INTERVAL '24 hours';
  `;
  
  const recent = recentActivity[0];
  console.log(`   Enrichments:       ${recent.enrichments_24h}`);
  console.log(`   Unique pages:      ${recent.pages_24h}`);
  console.log('');

  // Latest enrichments
  console.log('📌 Latest 5 Enrichments:');
  const latest = await sql`
    SELECT 
      page_type,
      page_identifier,
      applied,
      created_at
    FROM enrichment_log
    ORDER BY created_at DESC
    LIMIT 5;
  `;
  
  latest.forEach((row: any) => {
    const appliedEmoji = row.applied ? '✅' : '⏸️';
    const date = new Date(row.created_at).toLocaleString();
    console.log(`   ${appliedEmoji} ${row.page_type.padEnd(10)} ${row.page_identifier.substring(0, 40).padEnd(42)} ${date}`);
  });
  console.log('');
  console.log('=' .repeat(60));
}

main();
