/**
 * Initialize Database
 * Creates tables and indexes in Neon Database
 * 
 * Usage: npm run db:init
 */

// Load environment variables first
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { initializeSchema, testConnection } from '@/lib/db/client';

async function main() {
  console.log('🗄️  Initializing Neon Database\n');
  
  // Test connection first
  console.log('1️⃣  Testing database connection...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('❌ Database connection failed. Check your environment variables:');
    console.error('   - POSTGRES_URL or DATABASE_URL (should already be set for reviews)');
    process.exit(1);
  }
  
  console.log('✅ Database connection successful\n');
  
  // Initialize schema
  console.log('2️⃣  Creating tables and indexes...');
  await initializeSchema();
  
  console.log('\n✅ Database initialized successfully!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run db:sync');
  console.log('  2. This will fetch all products from Shopify and populate the database');
  console.log('  3. Takes about 2-5 minutes for 10k products\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
