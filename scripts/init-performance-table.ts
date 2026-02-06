import { sql } from '@vercel/postgres';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function initPerformanceTable() {
  try {
    console.log('Initializing performance_scans table...');

    // Read the SQL schema file
    const schemaPath = path.join(process.cwd(), 'lib/db/schema/performance-scans.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Execute the schema
    await sql.query(schema);

    console.log('✅ Performance scans table created successfully!');

    // Check if table exists and show structure
    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'performance_scans'
      ORDER BY ordinal_position
    `;

    console.log('\nTable structure:');
    console.table(result.rows);

    console.log('\n✅ Setup complete! You can now use the Performance page in the admin dashboard.');
    console.log('\n📝 Note: Add PAGESPEED_API_KEY to your .env file for higher rate limits.');
    console.log('   Get your API key at: https://developers.google.com/speed/docs/insights/v5/get-started');
  } catch (error) {
    console.error('Error initializing performance table:', error);
    process.exit(1);
  }
}

initPerformanceTable();
