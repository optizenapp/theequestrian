const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

(async () => {
  try {
    console.log('Adding link_color column to review_email_settings...');
    
    await sql`
      ALTER TABLE review_email_settings
      ADD COLUMN IF NOT EXISTS link_color TEXT DEFAULT '#3b82f6'
    `;
    
    console.log('✅ Migration complete');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
})();
