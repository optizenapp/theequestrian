const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);

(async () => {
  try {
    console.log('Creating review_email_settings table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS review_email_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        enabled BOOLEAN DEFAULT true,
        delay_days INTEGER DEFAULT 20,
        subject_template TEXT NOT NULL,
        html_template TEXT NOT NULL,
        blocks JSONB,
        from_name TEXT NOT NULL,
        from_email TEXT NOT NULL,
        brand_primary TEXT,
        brand_dark TEXT,
        logo_url TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_review_email_settings_singleton
        ON review_email_settings (id)
    `;
    
    console.log('✅ Table created');
    
    console.log('Inserting default settings...');
    
    const defaultTemplate = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review Request</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: {{brandDark}}; padding: 32px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      {{logoSection}}
      <h1 style="color: #ffffff; margin: 0; font-size: 26px;">The Equestrian</h1>
    </div>
    <div style="background: #ffffff; padding: 32px 28px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
      <h2 style="color: #1a1a1a; margin-top: 0; font-size: 22px;">Hi {{customerName}},</h2>
      <p style="font-size: 15px; color: #555;">
        Thank you for your recent purchase from The Equestrian! We hope you're enjoying your new <strong>{{productTitle}}</strong>.
      </p>
      <p style="font-size: 15px; color: #555;">
        We'd love to hear about your experience. Your feedback helps other equestrians make informed decisions and helps us continue to provide the best products and service.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{{productUrl}}" style="display: inline-block; background: {{brandPrimary}}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: 600; font-size: 15px;">
          Write a Review
        </a>
      </div>
      <p style="font-size: 13px; color: #777; text-align: center;">
        Order #{{orderNumber}}
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;">
      <p style="font-size: 12px; color: #999; text-align: center; margin-bottom: 0;">
        The Equestrian<br>
        Quality equestrian supplies and equipment<br>
        <a href="{{siteUrl}}" style="color: {{brandPrimary}}; text-decoration: none;">theequestrian.com.au</a>
      </p>
    </div>
  </body>
</html>`;
    
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'reviews@theequestrian.com.au';
    
    await sql`
      INSERT INTO review_email_settings (
        id,
        enabled,
        delay_days,
        subject_template,
        html_template,
        from_name,
        from_email,
        brand_primary,
        brand_dark,
        logo_url,
        updated_at
      ) VALUES (
        1,
        true,
        20,
        ${'How was your {{productTitle}}?'},
        ${defaultTemplate},
        ${'The Equestrian'},
        ${fromEmail},
        ${'#e91e63'},
        ${'#1a1a1a'},
        NULL,
        NOW()
      )
      ON CONFLICT (id) DO NOTHING
    `;
    
    console.log('✅ Default settings inserted');
    
    const result = await sql`SELECT * FROM review_email_settings WHERE id = 1`;
    console.log('\n📋 Current settings:');
    console.log('  Enabled:', result[0].enabled);
    console.log('  Delay:', result[0].delay_days, 'days');
    console.log('  Subject:', result[0].subject_template);
    console.log('  From:', result[0].from_name, '<' + result[0].from_email + '>');
    console.log('  Brand colors:', result[0].brand_primary, result[0].brand_dark);
    console.log('\n✅ All done! Visit /admin/reviews/email to customize.\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
