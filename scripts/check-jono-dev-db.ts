/**
 * Check the jono-dev database (ep-square-dawn) for allocations
 * Run with: CUSTOM_DATABASE_URL="postgresql://..." npx tsx scripts/check-jono-dev-db.ts
 */

import { neon } from '@neondatabase/serverless';

async function main() {
  console.log('=== Checking jono-dev Database (ep-square-dawn) ===\n');
  
  // You need to provide the jono-dev connection string
  const jonoDevConnectionString = process.env.JONO_DEV_DATABASE_URL || process.env.CUSTOM_DATABASE_URL;
  
  if (!jonoDevConnectionString) {
    console.error('❌ Please provide JONO_DEV_DATABASE_URL or CUSTOM_DATABASE_URL');
    console.error('Example: CUSTOM_DATABASE_URL="postgresql://user:pass@ep-square-dawn-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require" npx tsx scripts/check-jono-dev-db.ts');
    process.exit(1);
  }
  
  const masked = jonoDevConnectionString.replace(/:([^:@]+)@/, ':***@');
  console.log('Connecting to:', masked);
  console.log('');
  
  const sql = neon(jonoDevConnectionString);
  
  try {
    // Test connection
    console.log('Testing connection...');
    const timeResult = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful:', timeResult[0].current_time);
    console.log('');
    
    // Check if table exists
    console.log('Checking product_category_assignments table...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_category_assignments'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      console.log('❌ Table product_category_assignments does not exist!');
      console.log('This database has not been set up for the new allocation system.');
      return;
    }
    
    console.log('✅ Table exists');
    console.log('');
    
    // Get total count
    console.log('Counting total allocations...');
    const countResult = await sql`
      SELECT COUNT(*)::int as total FROM product_category_assignments
    `;
    console.log(`Total allocations: ${countResult[0].total}`);
    console.log('');
    
    // Get count for /horse
    console.log('Counting allocations for /horse...');
    const horseCount = await sql`
      SELECT COUNT(*)::int as count 
      FROM product_category_assignments
      WHERE category_path = '/horse' OR category_path LIKE '/horse/%'
    `;
    console.log(`/horse allocations: ${horseCount[0].count}`);
    console.log('');
    
    // Get sample allocations
    if (horseCount[0].count > 0) {
      console.log('Sample /horse allocations (first 5):');
      const samples = await sql`
        SELECT product_handle, category_path, canonical_path
        FROM product_category_assignments
        WHERE category_path = '/horse' OR category_path LIKE '/horse/%'
        ORDER BY updated_at DESC
        LIMIT 5
      `;
      
      samples.forEach((row: any) => {
        console.log(`- ${row.product_handle} → ${row.category_path}`);
      });
      console.log('');
    }
    
    // Get category breakdown
    console.log('Category breakdown (top 10):');
    const breakdown = await sql`
      SELECT 
        category_path,
        COUNT(*)::int as count
      FROM product_category_assignments
      GROUP BY category_path
      ORDER BY count DESC
      LIMIT 10
    `;
    
    breakdown.forEach((row: any) => {
      console.log(`- ${row.category_path}: ${row.count} products`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
