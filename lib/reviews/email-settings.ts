export interface ReviewEmailSettings {
  enabled: boolean;
  delayDays: number;
  subjectTemplate: string;
  htmlTemplate: string;
  fromName: string;
  fromEmail: string;
  brandPrimary: string;
  brandDark: string;
  logoUrl: string | null;
}

export const defaultReviewEmailSettings: ReviewEmailSettings = {
  enabled: true,
  delayDays: 20,
  subjectTemplate: 'How was your {{productTitle}}?',
  htmlTemplate: `<!DOCTYPE html>
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
</html>`,
  fromName: 'The Equestrian',
  fromEmail: 'reviews@theequestrian.com.au',
  brandPrimary: '#e91e63',
  brandDark: '#1a1a1a',
  logoUrl: null,
};

export function applyTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let output = template;
  Object.entries(variables).forEach(([key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    output = output.replace(token, value);
  });
  return output;
}

export async function getReviewEmailSettings(): Promise<ReviewEmailSettings> {
  try {
    const { sql } = await import('@vercel/postgres');
    const { rows } = await sql`SELECT * FROM review_email_settings WHERE id = 1 LIMIT 1`;
    if (!rows[0]) {
      return {
        ...defaultReviewEmailSettings,
        fromEmail: process.env.RESEND_FROM_EMAIL || defaultReviewEmailSettings.fromEmail,
      };
    }
    const row = rows[0];
    return {
      enabled: row.enabled ?? true,
      delayDays: row.delay_days ?? defaultReviewEmailSettings.delayDays,
      subjectTemplate: row.subject_template || defaultReviewEmailSettings.subjectTemplate,
      htmlTemplate: row.html_template || defaultReviewEmailSettings.htmlTemplate,
      fromName: row.from_name || defaultReviewEmailSettings.fromName,
      fromEmail: row.from_email || defaultReviewEmailSettings.fromEmail,
      brandPrimary: row.brand_primary || defaultReviewEmailSettings.brandPrimary,
      brandDark: row.brand_dark || defaultReviewEmailSettings.brandDark,
      logoUrl: row.logo_url || null,
    };
  } catch (error: any) {
    if (error?.code !== '42P01') {
      console.error('Failed to load review email settings:', error);
    }
    return {
      ...defaultReviewEmailSettings,
      fromEmail: process.env.RESEND_FROM_EMAIL || defaultReviewEmailSettings.fromEmail,
    };
  }
}

export async function upsertReviewEmailSettings(
  nextSettings: ReviewEmailSettings
): Promise<ReviewEmailSettings> {
  const { sql } = await import('@vercel/postgres');
  const { rows } = await sql`
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
      ${nextSettings.enabled},
      ${nextSettings.delayDays},
      ${nextSettings.subjectTemplate},
      ${nextSettings.htmlTemplate},
      ${nextSettings.fromName},
      ${nextSettings.fromEmail},
      ${nextSettings.brandPrimary},
      ${nextSettings.brandDark},
      ${nextSettings.logoUrl},
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      enabled = EXCLUDED.enabled,
      delay_days = EXCLUDED.delay_days,
      subject_template = EXCLUDED.subject_template,
      html_template = EXCLUDED.html_template,
      from_name = EXCLUDED.from_name,
      from_email = EXCLUDED.from_email,
      brand_primary = EXCLUDED.brand_primary,
      brand_dark = EXCLUDED.brand_dark,
      logo_url = EXCLUDED.logo_url,
      updated_at = NOW()
    RETURNING *;
  `;
  const row = rows[0];
  return {
    enabled: row.enabled ?? true,
    delayDays: row.delay_days ?? defaultReviewEmailSettings.delayDays,
    subjectTemplate: row.subject_template || defaultReviewEmailSettings.subjectTemplate,
    htmlTemplate: row.html_template || defaultReviewEmailSettings.htmlTemplate,
    fromName: row.from_name || defaultReviewEmailSettings.fromName,
    fromEmail: row.from_email || defaultReviewEmailSettings.fromEmail,
    brandPrimary: row.brand_primary || defaultReviewEmailSettings.brandPrimary,
    brandDark: row.brand_dark || defaultReviewEmailSettings.brandDark,
    logoUrl: row.logo_url || null,
  };
}
