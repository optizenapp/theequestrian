/**
 * Check GMC feed upload logs
 * 
 * Usage: tsx scripts/check-gmc-logs.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load env vars
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

import { getRecentGmcFeedUploads, getGmcFeedUploadStats } from '@/lib/db/gmc-feed-log';

async function checkLogs() {
  console.log('📊 GMC Feed Upload Logs\n');
  
  const [logs, stats] = await Promise.all([
    getRecentGmcFeedUploads(10),
    getGmcFeedUploadStats(),
  ]);
  
  if (stats) {
    console.log('Statistics (Last 30 days):');
    console.log(`  Total uploads: ${stats.totalUploads}`);
    console.log(`  Successful: ${stats.successfulUploads}`);
    console.log(`  Failed: ${stats.failedUploads}`);
    console.log(`  Avg items: ${Math.round(stats.avgItemCount)}`);
    console.log(`  Last success: ${stats.lastSuccessfulUpload || 'N/A'}`);
    console.log('');
  }
  
  console.log('Recent Uploads:');
  console.log('─'.repeat(80));
  
  if (logs.length === 0) {
    console.log('No uploads logged yet.');
  } else {
    logs.forEach((log, i) => {
      const status = log.success ? '✅' : '❌';
      const size = log.file_size_bytes ? `${(Number(log.file_size_bytes) / 1024 / 1024).toFixed(1)}MB` : 'N/A';
      console.log(`${i + 1}. ${status} [${log.source}] ${log.created_at}`);
      console.log(`   Items: ${log.item_count} | Size: ${size}`);
      if (log.success) {
        console.log(`   URL: ${log.s3_url}`);
      } else {
        console.log(`   Error: ${log.error_message}`);
      }
      console.log('');
    });
  }
}

if (require.main === module) {
  checkLogs()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { checkLogs };
