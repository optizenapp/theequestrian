#!/usr/bin/env tsx
import { neon } from '@neondatabase/serverless';

const PROD_URL = "postgresql://neondb_owner:npg_1Gzor6vnKkdu@ep-floral-wind-a7w6deck-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(PROD_URL);

async function checkSchema() {
  console.log('🔍 Checking production database schema...\n');

  // Check collection_content columns
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'collection_content'
      ORDER BY ordinal_position
    `;
    console.log('✅ collection_content columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Get a sample row
    const sample = await sql`SELECT * FROM collection_content LIMIT 1`;
    console.log('\n   Sample row keys:', Object.keys(sample[0] || {}));
  } catch (error: any) {
    console.log(`❌ collection_content: ${error.message}`);
  }

  console.log('\n');

  // Check collection_mapping columns
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'collection_mapping'
      ORDER BY ordinal_position
    `;
    console.log('✅ collection_mapping columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // Get a sample row
    const sample = await sql`SELECT * FROM collection_mapping LIMIT 1`;
    console.log('\n   Sample row keys:', Object.keys(sample[0] || {}));
  } catch (error: any) {
    console.log(`❌ collection_mapping: ${error.message}`);
  }
}

checkSchema().catch(console.error);
