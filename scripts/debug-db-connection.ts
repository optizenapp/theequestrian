/**
 * Debug script to check database connection and product allocations
 * Run with: npx tsx scripts/debug-db-connection.ts
 */

import 'dotenv/config';
import { sql } from '@/lib/db/client';

async function main() {
  console.log('=== Database Connection Debug ===\n');
  
  // Check environment
  console.log('Environment Variables:');
  console.log('- VERCEL_ENV:', process.env.VERCEL_ENV || 'not set');
  console.log('- CUSTOM_DATABASE_URL:', process.env.CUSTOM_DATABASE_URL ? 'SET' : 'not set');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET (masked)' : 'not set');
  console.log('- POSTGRES_URL:', process.env.POSTGRES_URL ? 'SET (masked)' : 'not set');
  
  // Mask and show connection string
  const connectionString = process.env.CUSTOM_DATABASE_URL || 
    (process.env.VERCEL_ENV === 'preview' 
      ? (process.env.DATABASE_URL || process.env.POSTGRES_URL)
      : (process.env.POSTGRES_URL || process.env.DATABASE_URL));
  
  if (connectionString) {
    const masked = connectionString.replace(/:([^:@]+)@/, ':***@');
    console.log('- Active connection:', masked);
    console.log('');
  }
  
  try {
    // Test connection
    console.log('Testing database connection...');
    const timeResult = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful:', timeResult[0].current_time);
    console.log('');
    
    // Check if product_category_assignments table exists
    console.log('Checking product_category_assignments table...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'product_category_assignments'
      ) as exists
    `;
    
    if (!tableCheck[0].exists) {
      console.log('❌ Table product_category_assignments does not exist!');
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
    console.log('Sample allocations (first 5):');
    const samples = await sql`
      SELECT product_handle, category_path, canonical_path
      FROM product_category_assignments
      WHERE category_path = '/horse' OR category_path LIKE '/horse/%'
      ORDER BY updated_at DESC
      LIMIT 5
    `;
    
    samples.forEach((row: any) => {
      console.log(`- ${row.product_handle} → ${row.category_path} (canonical: ${row.canonical_path})`);
    });
    console.log('');
    
    // Get category breakdown
    console.log('Category breakdown:');
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
