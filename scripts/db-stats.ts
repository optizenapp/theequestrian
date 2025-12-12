/**
 * Database Statistics
 * Shows current database status and sync information
 * 
 * Usage: npm run db:stats
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { getDatabaseStats, testConnection } from '@/lib/db/client';

async function main() {
  console.log('📊 Database Statistics\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to database');
    process.exit(1);
  }
  
  // Get stats
  const stats = await getDatabaseStats();
  
  if (!stats) {
    console.error('❌ Failed to retrieve statistics');
    process.exit(1);
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total Products: ${stats.totalProducts.toLocaleString()}`);
  
  if (stats.lastSync) {
    console.log(`Last Sync: ${new Date(stats.lastSync.completed_at).toLocaleString()}`);
    console.log(`Products Synced: ${stats.lastSync.products_synced.toLocaleString()}`);
  } else {
    console.log('Last Sync: Never');
    console.log('\n⚠️  Database is empty. Run: npm run db:sync');
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
