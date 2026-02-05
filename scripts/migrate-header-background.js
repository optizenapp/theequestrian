const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

(async () => {
  try {
    console.log('Adding header_background column to review_email_settings...');
    
    await sql`
      ALTER TABLE review_email_settings
      ADD COLUMN IF NOT EXISTS header_background TEXT DEFAULT '#1a1a1a'
    `;
    
    console.log('✅ Migration complete');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
})();
