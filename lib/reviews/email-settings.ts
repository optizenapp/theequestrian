import { defaultReviewEmailBlocks, type ReviewEmailBlock } from './email-types';

export interface ReviewEmailSettings {
  enabled: boolean;
  delayDays: number;
  subjectTemplate: string;
  blocks: ReviewEmailBlock[];
  fromName: string;
  fromEmail: string;
  brandPrimary: string;
  brandDark: string;
  headerBackground: string;
  linkColor: string;
  logoUrl: string | null;
}

export const defaultReviewEmailSettings: ReviewEmailSettings = {
  enabled: true,
  delayDays: 20,
  subjectTemplate: 'How was your {{productTitle}}?',
  blocks: defaultReviewEmailBlocks,
  fromName: 'The Equestrian',
  fromEmail: 'reviews@theequestrian.com.au',
  brandPrimary: '#e91e63',
  brandDark: '#1a1a1a',
  headerBackground: '#1a1a1a',
  linkColor: '#3b82f6',
  logoUrl: null,
};

export const defaultReviewEmailHtmlTemplate = `<!DOCTYPE html>
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

function normalizeBlocks(blocks: unknown): ReviewEmailBlock[] {
  if (!Array.isArray(blocks)) {
    return defaultReviewEmailBlocks;
  }
  const validTypes = new Set([
    'heading',
    'text',
    'cta',
    'productCards',
    'divider',
    'footer',
  ]);
  const sanitized = blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return null;
      const blockRecord = block as Record<string, unknown>;
      const type = blockRecord.type;
      if (typeof type !== 'string' || !validTypes.has(type)) return null;
      const id = typeof blockRecord.id === 'string' ? blockRecord.id : '';
      if (!id) return null;
      switch (type) {
        case 'heading': {
          const level =
            typeof blockRecord.level === 'number' &&
            [1, 2, 3].includes(blockRecord.level)
              ? (blockRecord.level as 1 | 2 | 3)
              : 2;
          const text =
            typeof blockRecord.text === 'string' ? blockRecord.text : '';
          const align =
            blockRecord.align === 'center' || blockRecord.align === 'right'
              ? blockRecord.align
              : 'left';
          return { id, type, level, text, align } satisfies ReviewEmailBlock;
        }
        case 'text': {
          const text =
            typeof blockRecord.text === 'string' ? blockRecord.text : '';
          const align =
            blockRecord.align === 'center' || blockRecord.align === 'right'
              ? blockRecord.align
              : 'left';
          return { id, type, text, align } satisfies ReviewEmailBlock;
        }
        case 'cta': {
          const label =
            typeof blockRecord.label === 'string' ? blockRecord.label : '';
          const url =
            typeof blockRecord.url === 'string' ? blockRecord.url : '';
          return { id, type, label, url } satisfies ReviewEmailBlock;
        }
        case 'productCards': {
          const mode = blockRecord.mode === 'all' ? 'all' : 'single';
          return { id, type, mode } satisfies ReviewEmailBlock;
        }
        case 'divider': {
          return { id, type } satisfies ReviewEmailBlock;
        }
        case 'footer': {
          const text =
            typeof blockRecord.text === 'string' ? blockRecord.text : '';
          return { id, type, text } satisfies ReviewEmailBlock;
        }
        default:
          return null;
      }
    })
    .filter(Boolean) as ReviewEmailBlock[];
  return sanitized.length > 0 ? sanitized : defaultReviewEmailBlocks;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function extractTagText(html: string, tag: string) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = html.match(regex);
  if (!match) return '';
  return stripHtml(match[1] || '');
}

function extractParagraphs(html: string) {
  const matches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
  return matches.map((match) => stripHtml(match[1] || '')).filter(Boolean);
}

function extractCta(html: string) {
  const match = html.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
  if (!match) return null;
  return {
    url: stripHtml(match[1] || ''),
    label: stripHtml(match[2] || ''),
  };
}

export function migrateHtmlTemplateToBlocks(htmlTemplate: string | null) {
  if (!htmlTemplate) return defaultReviewEmailBlocks;
  const headingText = extractTagText(htmlTemplate, 'h2');
  const paragraphs = extractParagraphs(htmlTemplate);
  const cta = extractCta(htmlTemplate);
  const footerText = extractTagText(htmlTemplate, 'p');
  const blocks: ReviewEmailBlock[] = [];

  if (headingText) {
    blocks.push({
      id: 'migrated-heading',
      type: 'heading',
      level: 2,
      text: headingText,
    });
  }

  paragraphs.slice(0, 2).forEach((text, index) => {
    blocks.push({
      id: `migrated-text-${index + 1}`,
      type: 'text',
      text,
    });
  });

  blocks.push({
    id: 'migrated-product-cards',
    type: 'productCards',
    mode: 'single',
  });

  if (cta?.label) {
    blocks.push({
      id: 'migrated-cta',
      type: 'cta',
      label: cta.label,
      url: cta.url || '{{productUrl}}',
    });
  }

  const orderNumberParagraph = paragraphs.find((text) =>
    text.toLowerCase().includes('order #')
  );
  if (orderNumberParagraph) {
    blocks.push({
      id: 'migrated-order',
      type: 'text',
      text: orderNumberParagraph,
    });
  }

  blocks.push({ id: 'migrated-divider', type: 'divider' });

  blocks.push({
    id: 'migrated-footer',
    type: 'footer',
    text: footerText || 'The Equestrian\n{{siteUrl}}',
  });

  return normalizeBlocks(blocks);
}

export async function getReviewEmailSettings(): Promise<ReviewEmailSettings> {
  try {
    const { sql } = await import('@vercel/postgres');
    const { rows } = await sql`SELECT * FROM review_email_settings WHERE id = 1 LIMIT 1`;
    if (!rows[0]) {
      return {
        ...defaultReviewEmailSettings,
        fromEmail:
          process.env.AWS_SES_FROM_EMAIL ||
          process.env.RESEND_FROM_EMAIL ||
          defaultReviewEmailSettings.fromEmail,
      };
    }
    const row = rows[0];
    const blocks = row.blocks ? normalizeBlocks(row.blocks) : [];
    const migratedBlocks = blocks.length > 0 ? blocks : migrateHtmlTemplateToBlocks(row.html_template);
    if (!row.blocks && migratedBlocks) {
      try {
        await upsertReviewEmailSettings({
          enabled: row.enabled ?? true,
          delayDays: row.delay_days ?? defaultReviewEmailSettings.delayDays,
          subjectTemplate: row.subject_template || defaultReviewEmailSettings.subjectTemplate,
          blocks: migratedBlocks,
          fromName: row.from_name || defaultReviewEmailSettings.fromName,
          fromEmail: row.from_email || defaultReviewEmailSettings.fromEmail,
          brandPrimary: row.brand_primary || defaultReviewEmailSettings.brandPrimary,
          brandDark: row.brand_dark || defaultReviewEmailSettings.brandDark,
          headerBackground: row.header_background || row.brand_dark || defaultReviewEmailSettings.headerBackground,
          linkColor: row.link_color || defaultReviewEmailSettings.linkColor,
          logoUrl: row.logo_url || null,
        });
      } catch (error) {
        console.error('Failed to migrate review email blocks:', error);
      }
    }
    return {
      enabled: row.enabled ?? true,
      delayDays: row.delay_days ?? defaultReviewEmailSettings.delayDays,
      subjectTemplate: row.subject_template || defaultReviewEmailSettings.subjectTemplate,
      blocks: migratedBlocks,
      fromName: row.from_name || defaultReviewEmailSettings.fromName,
      fromEmail: row.from_email || defaultReviewEmailSettings.fromEmail,
      brandPrimary: row.brand_primary || defaultReviewEmailSettings.brandPrimary,
      brandDark: row.brand_dark || defaultReviewEmailSettings.brandDark,
      headerBackground: row.header_background || row.brand_dark || defaultReviewEmailSettings.headerBackground,
      linkColor: row.link_color || defaultReviewEmailSettings.linkColor,
      logoUrl: row.logo_url || null,
    };
  } catch (error: unknown) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined;
    if (code !== '42P01') {
      console.error('Failed to load review email settings:', error);
    }
    return {
      ...defaultReviewEmailSettings,
      fromEmail:
        process.env.AWS_SES_FROM_EMAIL ||
        process.env.RESEND_FROM_EMAIL ||
        defaultReviewEmailSettings.fromEmail,
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
      blocks,
      from_name,
      from_email,
      brand_primary,
      brand_dark,
      header_background,
      link_color,
      logo_url,
      updated_at
    ) VALUES (
      1,
      ${nextSettings.enabled},
      ${nextSettings.delayDays},
      ${nextSettings.subjectTemplate},
      ${defaultReviewEmailHtmlTemplate},
      ${JSON.stringify(nextSettings.blocks)},
      ${nextSettings.fromName},
      ${nextSettings.fromEmail},
      ${nextSettings.brandPrimary},
      ${nextSettings.brandDark},
      ${nextSettings.headerBackground},
      ${nextSettings.linkColor},
      ${nextSettings.logoUrl},
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      enabled = EXCLUDED.enabled,
      delay_days = EXCLUDED.delay_days,
      subject_template = EXCLUDED.subject_template,
      blocks = EXCLUDED.blocks,
      from_name = EXCLUDED.from_name,
      from_email = EXCLUDED.from_email,
      brand_primary = EXCLUDED.brand_primary,
      brand_dark = EXCLUDED.brand_dark,
      header_background = EXCLUDED.header_background,
      link_color = EXCLUDED.link_color,
      logo_url = EXCLUDED.logo_url,
      updated_at = NOW()
    RETURNING *;
  `;
  const row = rows[0];
  return {
    enabled: row.enabled ?? true,
    delayDays: row.delay_days ?? defaultReviewEmailSettings.delayDays,
    subjectTemplate: row.subject_template || defaultReviewEmailSettings.subjectTemplate,
    blocks: normalizeBlocks(row.blocks),
    fromName: row.from_name || defaultReviewEmailSettings.fromName,
    fromEmail: row.from_email || defaultReviewEmailSettings.fromEmail,
    brandPrimary: row.brand_primary || defaultReviewEmailSettings.brandPrimary,
    brandDark: row.brand_dark || defaultReviewEmailSettings.brandDark,
    headerBackground: row.header_background || defaultReviewEmailSettings.headerBackground,
    linkColor: row.link_color || defaultReviewEmailSettings.linkColor,
    logoUrl: row.logo_url || null,
  };
}
