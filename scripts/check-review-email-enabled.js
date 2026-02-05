require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { sql } = require('@vercel/postgres');

(async () => {
  try {
    const result = await sql`SELECT enabled FROM review_email_settings WHERE id = 1`;
    console.log(result.rows[0] || null);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
