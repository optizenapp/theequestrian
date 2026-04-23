import { sql } from '@vercel/postgres';
import { applyTemplate } from '@/lib/reviews/email-settings';
import type {
  CuratedProductCard,
  EmailBlock,
  EmailTemplateMetadata,
  EmailTemplateVisualSettings,
  TemplateCategory,
  TemplateDeliveryMode,
} from '@/lib/email-platform/types';

const defaultVisualSettings: EmailTemplateVisualSettings = {
  enabled: true,
  delayDays: 10,
  baseFontSize: 16,
  brandPrimary: '#000000',
  brandDark: '#000000',
  headerBackground: '#ffffff',
  linkColor: '#de8e94',
  logoUrl: 'https://www.theequestrian.com.au/email-logo.png',
};

const defaultCategory: TemplateCategory = 'order_review';

const defaultDeliveryMode: TemplateDeliveryMode = 'post_fulfillment';

const MAX_CURATED_PRODUCTS_PER_BLOCK = 24;
const SITE_FONT_STACK = "Manrope, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Rewrites Shopify CDN image src attributes to route through the site's
 * own /api/image-proxy endpoint, so all images in the email are served
 * from theequestrian.com.au rather than cdn.shopify.com.
 * This satisfies mailbox-provider guidance to host images on the sending domain.
 */
export function proxyEmailImages(html: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return html.replace(/src="(https?:\/\/cdn\.shopify\.com\/[^"]+)"/g, (_match, imgUrl: string) => {
    const proxied = `${base}/api/image-proxy?url=${encodeURIComponent(imgUrl)}`;
    return `src="${proxied}"`;
  });
}

/**
 * Appends UTM parameters to all HTTP(S) links in rendered email HTML.
 * Skips {{tokens}}, unsubscribe links, mailto:, and anchor links.
 * Must be called AFTER renderTemplateContent so tokens are already resolved.
 */
export function addUtmParamsToEmailHtml(
  html: string,
  utm: { source: string; medium: string; campaign: string; content?: string },
  baseUrl?: string
): string {
  const normalizedBase = baseUrl ? baseUrl.replace(/\/$/, '') : '';
  return html.replace(/href="([^"]+)"/g, (match, rawHref: string) => {
    if (
      rawHref.startsWith('{{') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('#') ||
      rawHref.includes('unsubscribe')
    ) {
      return match;
    }
    // href values in HTML have & encoded as &amp; — decode before parsing
    let decodedHref = rawHref.replace(/&amp;/g, '&');
    if (decodedHref.startsWith('//')) {
      decodedHref = `https:${decodedHref}`;
    }
    if (normalizedBase && decodedHref.startsWith('/')) {
      decodedHref = `${normalizedBase}${decodedHref}`;
    }
    if (!decodedHref.startsWith('http://') && !decodedHref.startsWith('https://')) {
      // Try to coerce bare domains like "www.example.com/path"
      if (normalizedBase && /^[\w.-]+\.[a-z]{2,}/i.test(decodedHref)) {
        decodedHref = `https://${decodedHref}`;
      } else {
        return match;
      }
    }
    try {
      const url = new URL(decodedHref);
      if (!url.searchParams.has('utm_source')) url.searchParams.set('utm_source', utm.source);
      if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', utm.medium);
      if (!url.searchParams.has('utm_campaign')) url.searchParams.set('utm_campaign', slugify(utm.campaign));
      if (utm.content && !url.searchParams.has('utm_content')) url.searchParams.set('utm_content', utm.content);
      // Re-encode & as &amp; for valid HTML attribute
      return `href="${url.toString().replace(/&/g, '&amp;')}"`;
    } catch {
      return match;
    }
  });
}

function renderTextWithStyledLinks(value: string, linkColor: string): string {
  const preserveWhitespace = (text: string): string =>
    escapeHtml(text)
      .replace(/ {2,}/g, (spaces) => ` ${'&nbsp;'.repeat(spaces.length - 1)}`)
      .replace(/\n/g, '<br />');

  const linkStyle = `color:${linkColor};text-decoration:underline;`;

  // Combined pattern: markdown links [text](url) first, then bare URLs/tokens
  const combinedPattern =
    /(\[([^\]]+)\]\(([^)]+)\)|https?:\/\/[^\s)]+|\{\{(?:siteUrl|unsubscribeUrl|productUrl)\}\})/g;

  const result: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedPattern.exec(value)) !== null) {
    if (match.index > lastIndex) {
      result.push(preserveWhitespace(value.slice(lastIndex, match.index)));
    }
    const mdAnchor = match[2]; // [anchor](url) — anchor text
    const mdHref = match[3];   // [anchor](url) — href
    if (mdAnchor && mdHref) {
      // Markdown link [anchor text](url)
      result.push(`<a href="${escapeHtml(mdHref)}" style="${linkStyle}">${escapeHtml(mdAnchor)}</a>`);
    } else {
      // Bare URL or token
      const href = escapeHtml(match[1]);
      result.push(`<a href="${href}" style="${linkStyle}">${href}</a>`);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    result.push(preserveWhitespace(value.slice(lastIndex)));
  }

  return result.join('');
}

function normalizeTemplateCategory(source: Record<string, unknown>): TemplateCategory {
  return source.category === 'subscriber_standard' ? 'subscriber_standard' : defaultCategory;
}

function normalizeDeliveryMode(source: Record<string, unknown>): TemplateDeliveryMode {
  if (source.deliveryMode === 'manual_or_campaign') {
    return 'manual_or_campaign';
  }
  return normalizeTemplateCategory(source) === 'subscriber_standard'
    ? 'manual_or_campaign'
    : defaultDeliveryMode;
}

export function normalizeTemplateMetadata(metadata?: Record<string, unknown>): EmailTemplateMetadata {
  const source = metadata || {};
  return {
    enabled: source.enabled !== false,
    delayDays: typeof source.delayDays === 'number' ? Math.max(0, Math.floor(source.delayDays)) : defaultVisualSettings.delayDays,
    baseFontSize:
      typeof source.baseFontSize === 'number'
        ? Math.max(12, Math.min(24, Math.floor(source.baseFontSize)))
        : defaultVisualSettings.baseFontSize,
    brandPrimary: typeof source.brandPrimary === 'string' && source.brandPrimary.trim() ? source.brandPrimary : defaultVisualSettings.brandPrimary,
    brandDark: typeof source.brandDark === 'string' && source.brandDark.trim() ? source.brandDark : defaultVisualSettings.brandDark,
    headerBackground:
      typeof source.headerBackground === 'string' && source.headerBackground.trim()
        ? source.headerBackground
        : defaultVisualSettings.headerBackground,
    linkColor: typeof source.linkColor === 'string' && source.linkColor.trim() ? source.linkColor : defaultVisualSettings.linkColor,
    logoUrl: typeof source.logoUrl === 'string' && source.logoUrl.trim() ? source.logoUrl : null,
    category: normalizeTemplateCategory(source),
    deliveryMode: normalizeDeliveryMode(source),
  };
}

function normalizeCuratedCard(card: unknown, index: number): CuratedProductCard | null {
  if (!card || typeof card !== 'object') return null;
  const input = card as Record<string, unknown>;
  const handle = typeof input.handle === 'string' ? input.handle.trim() : '';
  const url = typeof input.url === 'string' ? input.url.trim() : '';
  if (!handle && !url) {
    return null;
  }
  return {
    id:
      typeof input.id === 'string' && input.id.trim()
        ? input.id.trim()
        : `curated-product-${Date.now()}-${index}`,
    handle,
    title: typeof input.title === 'string' && input.title.trim() ? input.title.trim() : undefined,
    imageUrl: typeof input.imageUrl === 'string' && input.imageUrl.trim() ? input.imageUrl.trim() : null,
    url: url || undefined,
    price: typeof input.price === 'string' && input.price.trim() ? input.price.trim() : undefined,
    compareAtPrice:
      typeof input.compareAtPrice === 'string' && input.compareAtPrice.trim() ? input.compareAtPrice.trim() : undefined,
    savePercent: typeof input.savePercent === 'string' && input.savePercent.trim() ? input.savePercent.trim() : undefined,
    freeShippingBadge: input.freeShippingBadge !== false,
  };
}

function normalizeFontSize(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(10, Math.min(48, Math.floor(value)));
}

export function normalizeEmailBlocks(blocks: unknown): EmailBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .map((raw, idx): EmailBlock | null => {
      if (!raw || typeof raw !== 'object') return null;
      const block = raw as Record<string, unknown>;
      const id =
        typeof block.id === 'string' && block.id.trim()
          ? block.id.trim()
          : `block-${Date.now()}-${idx}`;
      const type = typeof block.type === 'string' ? block.type : '';
      if (type === 'heading') {
        return {
          id,
          type: 'heading',
          text: typeof block.text === 'string' ? block.text : '',
          level: block.level === 1 || block.level === 2 || block.level === 3 ? block.level : 2,
          align: block.align === 'center' || block.align === 'right' ? block.align : 'left',
          fontSize: normalizeFontSize(block.fontSize, 28),
        };
      }
      if (type === 'text') {
        return {
          id,
          type: 'text',
          text: typeof block.text === 'string' ? block.text : '',
          align: block.align === 'center' || block.align === 'right' ? block.align : 'left',
          fontSize: normalizeFontSize(block.fontSize, 16),
        };
      }
      if (type === 'llmIntro') {
        return {
          id,
          type: 'llmIntro',
          text: typeof block.text === 'string' ? block.text : '',
          align: block.align === 'center' || block.align === 'right' ? block.align : 'left',
          fontSize: normalizeFontSize(block.fontSize, 16),
          ...(typeof block.prompt === 'string' && block.prompt.trim() ? { prompt: block.prompt.trim() } : {}),
        };
      }
      if (type === 'llmHeading') {
        return {
          id,
          type: 'llmHeading',
          text: typeof block.text === 'string' ? block.text : '',
          level: block.level === 1 || block.level === 2 || block.level === 3 ? block.level : 2,
          align: block.align === 'center' || block.align === 'right' ? block.align : 'left',
          fontSize: normalizeFontSize(block.fontSize, 28),
          ...(typeof block.prompt === 'string' && block.prompt.trim() ? { prompt: block.prompt.trim() } : {}),
        };
      }
      if (type === 'cta') {
        return {
          id,
          type: 'cta',
          label: typeof block.label === 'string' ? block.label : '',
          url: typeof block.url === 'string' ? block.url : '',
          align: block.align === 'center' || block.align === 'right' ? block.align : 'left',
          fontSize: normalizeFontSize(block.fontSize, 15),
        };
      }
      if (type === 'productCards') {
        return {
          id,
          type: 'productCards',
          mode: block.mode === 'all' ? 'all' : 'single',
          align: block.align === 'left' || block.align === 'right' ? block.align : 'center',
          fontSize: normalizeFontSize(block.fontSize, 16),
        };
      }
      if (type === 'curatedProducts') {
        const products = Array.isArray(block.products)
          ? block.products
              .slice(0, MAX_CURATED_PRODUCTS_PER_BLOCK)
              .map((card, cardIdx) => normalizeCuratedCard(card, cardIdx))
              .filter((card): card is CuratedProductCard => Boolean(card))
          : [];
        return {
          id,
          type: 'curatedProducts',
          products,
          showDividers: block.showDividers === true,
          align: block.align === 'left' || block.align === 'right' ? block.align : 'center',
          fontSize: normalizeFontSize(block.fontSize, 16),
          ...(typeof block.prompt === 'string' && block.prompt.trim() ? { prompt: block.prompt.trim() } : {}),
        };
      }
      if (type === 'divider') {
        return {
          id,
          type: 'divider',
          align: block.align === 'left' || block.align === 'right' ? block.align : 'center',
        };
      }
      if (type === 'image') {
        const url = typeof block.url === 'string' ? block.url.trim() : '';
        return {
          id,
          type: 'image',
          url,
          alt: typeof block.alt === 'string' ? block.alt.trim() : '',
          linkUrl:
            typeof block.linkUrl === 'string' && block.linkUrl.trim()
              ? block.linkUrl.trim()
              : undefined,
          align: block.align === 'left' || block.align === 'right' ? block.align : 'center',
          maxWidth:
            typeof block.maxWidth === 'number' && !Number.isNaN(block.maxWidth)
              ? Math.max(100, Math.min(600, Math.floor(block.maxWidth)))
              : undefined,
        };
      }
      if (type === 'footer') {
        return {
          id,
          type: 'footer',
          text: typeof block.text === 'string' ? block.text : '',
          align: block.align === 'center' || block.align === 'right' ? block.align : 'left',
          fontSize: normalizeFontSize(block.fontSize, 12),
        };
      }
      return null;
    })
    .filter((block): block is EmailBlock => Boolean(block));
}

export function renderTemplateBlocksHtml(input: {
  blocks: EmailBlock[];
  metadata?: Record<string, unknown>;
}): string {
  const visual = normalizeTemplateMetadata(input.metadata);
  const chunks = input.blocks.map((block) => {
    if (block.type === 'heading') {
      const level = Math.min(Math.max(block.level || 2, 1), 3);
      return `<h${level} style="margin:0 0 12px 0;text-align:${block.align || 'left'};color:${visual.brandDark};font-size:${block.fontSize || 28}px;">${escapeHtml(
        block.text
      )}</h${level}>`;
    }
    if (block.type === 'text') {
      return `<p style="margin:0 0 12px 0;text-align:${block.align || 'left'};color:${visual.brandDark};font-size:${block.fontSize || 16}px;">${renderTextWithStyledLinks(
        block.text,
        visual.linkColor
      )}</p>`;
    }
    if (block.type === 'llmIntro') {
      return `<p style="margin:0 0 12px 0;text-align:${block.align || 'left'};color:${visual.brandDark};font-size:${block.fontSize || 16}px;">${renderTextWithStyledLinks(
        block.text,
        visual.linkColor
      )}</p>`;
    }
    if (block.type === 'llmHeading') {
      const level = Math.min(Math.max(block.level || 2, 1), 3);
      return `<h${level} style="margin:0 0 12px 0;text-align:${block.align || 'left'};color:${visual.brandDark};font-size:${block.fontSize || 28}px;">${escapeHtml(
        block.text
      )}</h${level}>`;
    }
    if (block.type === 'cta') {
      return `<p style="margin:16px 0;text-align:${block.align || 'left'};"><a href="${escapeHtml(
        block.url
      )}" style="display:inline-block;padding:10px 16px;background:${visual.brandPrimary};color:#fff;text-decoration:none;border-radius:999px;font-size:${block.fontSize || 15}px;">${escapeHtml(
        block.label
      )}</a></p>`;
    }
    if (block.type === 'productCards') {
      return `<div style="margin:20px 0;padding:16px;border:1px solid #e5e7eb;border-radius:10px;text-align:${block.align || 'center'};">
        <img src="{{productImageUrl}}" alt="{{productTitle}}" style="max-width:220px;width:100%;height:auto;border-radius:8px;margin:0 auto 12px;display:block;" />
        <p style="margin:0 0 12px 0;color:${visual.brandDark};font-weight:600;font-size:${block.fontSize || 16}px;">{{productTitle}}</p>
        <p style="margin:0 0 4px 0;color:#6b7280;text-decoration:line-through;{{productCompareAtPriceStyle}}">{{productCompareAtPrice}}</p>
        <p style="margin:0 0 8px 0;color:${visual.brandDark};font-size:18px;font-weight:700;">{{productPrice}}</p>
        <div style="margin:0 0 12px 0;text-align:center;">
          <span style="display:inline-block;padding:3px 8px;border-radius:6px;background:#94F5BD;color:#111827;font-size:12px;font-weight:600;{{productSavePercentStyle}}">
            Save {{productSavePercent}}
          </span>
          <span style="display:inline-block;margin-left:8px;padding:3px 8px;border-radius:6px;background:#155dfb;color:#ffffff;font-size:12px;font-weight:700;{{productFreeShippingStyle}}">
            FREE SHIPPING
          </span>
        </div>
        <a href="{{productUrl}}" style="display:inline-block;padding:10px 16px;background:${visual.brandPrimary};color:#fff;text-decoration:none;border-radius:999px;">View product</a>
      </div>`;
    }
    if (block.type === 'curatedProducts') {
      if (!block.products.length) return '';
      const cards = block.products
        .map((product, index) => {
          const cardTitle = product.title || product.handle || 'Product';
          const cardUrl = product.url || '{{siteUrl}}';
          const cardPrice = product.price || '';
          const cardCompareAtPrice = product.compareAtPrice || '';
          const showCompare = cardCompareAtPrice.length > 0;
          const savePercent = product.savePercent || '';
          const showSavePercent = savePercent.length > 0;
          const showFreeShipping = product.freeShippingBadge !== false;
          const image = product.imageUrl
            ? `<img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(cardTitle)}" style="max-width:220px;width:100%;height:auto;border-radius:8px;margin:0 auto 12px;display:block;" />`
            : '';
          return `<div style="margin:0 0 14px 0;padding:12px;border:1px solid #e5e7eb;border-radius:10px;text-align:${block.align || 'center'};">
            ${image}
            <p style="margin:0 0 10px 0;color:${visual.brandDark};font-weight:600;font-size:${block.fontSize || 16}px;">${escapeHtml(cardTitle)}</p>
            <p style="margin:0 0 4px 0;color:#6b7280;text-decoration:line-through;${showCompare ? '' : 'display:none;'}">${escapeHtml(
            cardCompareAtPrice
          )}</p>
            <p style="margin:0 0 8px 0;color:${visual.brandDark};font-size:18px;font-weight:700;">${escapeHtml(cardPrice)}</p>
            <div style="margin:0 0 12px 0;text-align:center;">
              <span style="display:inline-block;padding:3px 8px;border-radius:6px;background:#94F5BD;color:#111827;font-size:12px;font-weight:600;${showSavePercent ? '' : 'display:none;'}">Save ${escapeHtml(
            savePercent
          )}</span>
              <span style="display:inline-block;margin-left:8px;padding:3px 8px;border-radius:6px;background:#155dfb;color:#ffffff;font-size:12px;font-weight:700;${showFreeShipping ? '' : 'display:none;'}">FREE SHIPPING</span>
            </div>
            <a href="${escapeHtml(cardUrl)}" style="display:inline-block;padding:8px 14px;background:${visual.brandPrimary};color:#fff;text-decoration:none;border-radius:999px;">View product</a>
          </div>${
            block.showDividers && index < block.products.length - 1
              ? '<hr style="border:0;border-top:1px solid #e5e7eb;margin:14px 0;" />'
              : ''
          }`;
        })
        .join('');
      return `<div style="margin:20px 0;display:block;">${cards}</div>`;
    }
    if (block.type === 'image') {
      const imgMaxWidth = block.maxWidth ?? 220;
      const imgStyle = `max-width:${imgMaxWidth}px;width:100%;height:auto;border-radius:8px;margin:0 auto 12px;display:block;`;
      const imgTag = block.url
        ? `<img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt || '')}" style="${imgStyle}" />`
        : '';
      const wrapped = imgTag
        ? block.linkUrl
          ? `<a href="${escapeHtml(block.linkUrl)}" style="display:block;text-align:${block.align || 'center'};">${imgTag}</a>`
          : `<div style="text-align:${block.align || 'center'};">${imgTag}</div>`
        : '';
      return wrapped ? `<div style="margin:20px 0;">${wrapped}</div>` : '';
    }
    if (block.type === 'divider') {
      const dividerMargin =
        block.align === 'left'
          ? '16px auto 16px 0'
          : block.align === 'right'
            ? '16px 0 16px auto'
            : '16px auto';
      return `<hr style="border:0;border-top:1px solid #e5e7eb;margin:${dividerMargin};width:65%;" />`;
    }
    if (block.type === 'footer') {
      return `<p style="margin:16px 0 0 0;font-size:${block.fontSize || 12}px;color:${visual.linkColor};text-align:${block.align || 'left'};">${renderTextWithStyledLinks(
        block.text,
        visual.linkColor
      )}</p>`;
    }
    return '';
  });

  const logoSection = visual.logoUrl
    ? `<img src="${escapeHtml(visual.logoUrl)}" alt="Logo" style="max-width:180px;height:auto;margin:0 auto;display:block;" />`
    : '<h1 style="color:#111827;margin:0;font-size:26px;">The Equestrian</h1>';

  const unsubscribeSection = `<div style="padding:0 28px 24px 28px;text-align:center;">
    <a href="{{unsubscribeUrl}}" style="color:${visual.linkColor};text-decoration:underline;font-size:12px;">
      Unsubscribe
    </a>
  </div>`;

  return `<div style="font-family:${SITE_FONT_STACK};font-size:${visual.baseFontSize || 16}px;line-height:1.5;color:#111827;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
    <div style="background:${visual.headerBackground};padding:24px 20px;text-align:center;">${logoSection}</div>
    <div style="padding:28px;">${chunks.join('')}</div>
    ${unsubscribeSection}
  </div>`;
}

export async function listTemplates(limit = 100): Promise<
  Array<{
    id: string;
    name: string;
    templateType: string;
    activeVersionId: string | null;
    category: TemplateCategory;
    updatedAt: string;
  }>
> {
  const result = await sql`
    SELECT
      t.id,
      t.name,
      t.template_type,
      t.active_version_id,
      t.updated_at,
      v.metadata
    FROM email_templates t
    LEFT JOIN email_template_versions v ON v.id = t.active_version_id
    ORDER BY updated_at DESC
    LIMIT ${limit}
  `;

  return result.rows.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    templateType: row.template_type as string,
    activeVersionId: (row.active_version_id as string | null) ?? null,
    category: normalizeTemplateCategory((row.metadata as Record<string, unknown>) || {}),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  }));
}

export async function createTemplate(input: {
  name: string;
  templateType: 'campaign' | 'sequence_step' | 'review';
  subjectTemplate: string;
  htmlTemplate?: string;
  blocks?: EmailBlock[];
  fromName?: string;
  fromEmail?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ templateId: string; versionId: string }> {
  const normalizedBlocks = normalizeEmailBlocks(input.blocks || []);
  const normalizedMetadata = normalizeTemplateMetadata(input.metadata);
  const templateResult = await sql`
    INSERT INTO email_templates (name, template_type, updated_at)
    VALUES (${input.name}, ${input.templateType}, NOW())
    RETURNING id
  `;
  const templateId = templateResult.rows[0]?.id as string;

  const htmlTemplate = input.htmlTemplate || renderTemplateBlocksHtml({ blocks: normalizedBlocks, metadata: normalizedMetadata });
  const versionResult = await sql`
    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject_template,
      html_template,
      blocks,
      from_name,
      from_email,
      metadata
    )
    VALUES (
      ${templateId},
      1,
      ${input.subjectTemplate},
      ${htmlTemplate},
      ${JSON.stringify(normalizedBlocks)},
      ${input.fromName ?? 'The Equestrian'},
      ${input.fromEmail ?? 'support@theequestrian.com.au'},
      ${JSON.stringify(normalizedMetadata)}
    )
    RETURNING id
  `;
  const versionId = versionResult.rows[0]?.id as string;

  await sql`
    UPDATE email_templates
    SET active_version_id = ${versionId},
        updated_at = NOW()
    WHERE id = ${templateId}
  `;

  return { templateId, versionId };
}

export async function createTemplateVersion(input: {
  templateId: string;
  subjectTemplate: string;
  htmlTemplate?: string;
  blocks?: EmailBlock[];
  fromName?: string;
  fromEmail?: string;
  setActive?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<{ versionId: string; versionNumber: number }> {
  const normalizedBlocks = normalizeEmailBlocks(input.blocks || []);
  const normalizedMetadata = normalizeTemplateMetadata(input.metadata);
  const current = await sql`
    SELECT COALESCE(MAX(version_number), 0) AS max_version
    FROM email_template_versions
    WHERE template_id = ${input.templateId}
  `;
  const versionNumber = Number(current.rows[0]?.max_version || 0) + 1;
  const htmlTemplate = input.htmlTemplate || renderTemplateBlocksHtml({ blocks: normalizedBlocks, metadata: normalizedMetadata });

  const inserted = await sql`
    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject_template,
      html_template,
      blocks,
      from_name,
      from_email,
      metadata
    )
    VALUES (
      ${input.templateId},
      ${versionNumber},
      ${input.subjectTemplate},
      ${htmlTemplate},
      ${JSON.stringify(normalizedBlocks)},
      ${input.fromName ?? 'The Equestrian'},
      ${input.fromEmail ?? 'support@theequestrian.com.au'},
      ${JSON.stringify(normalizedMetadata)}
    )
    RETURNING id
  `;
  const versionId = inserted.rows[0]?.id as string;

  if (input.setActive !== false) {
    await sql`
      UPDATE email_templates
      SET active_version_id = ${versionId},
          updated_at = NOW()
      WHERE id = ${input.templateId}
    `;
  }

  return { versionId, versionNumber };
}

export async function getTemplateVersion(versionId: string): Promise<{
  id: string;
  templateId: string;
  subjectTemplate: string;
  htmlTemplate: string;
  blocks: EmailBlock[];
  fromName: string | null;
  fromEmail: string | null;
  metadata: Record<string, unknown>;
} | null> {
  const result = await sql`
    SELECT id, template_id, subject_template, html_template, blocks, from_name, from_email, metadata
    FROM email_template_versions
    WHERE id = ${versionId}
    LIMIT 1
  `;

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id as string,
    templateId: row.template_id as string,
    subjectTemplate: row.subject_template as string,
    htmlTemplate: row.html_template as string,
    blocks: normalizeEmailBlocks((row.blocks as EmailBlock[]) || []),
    fromName: (row.from_name as string | null) ?? null,
    fromEmail: (row.from_email as string | null) ?? null,
    metadata: normalizeTemplateMetadata((row.metadata as Record<string, unknown>) || {}),
  };
}

export async function getTemplateById(templateId: string): Promise<{
  id: string;
  name: string;
  templateType: string;
  activeVersionId: string | null;
  updatedAt: string;
} | null> {
  const result = await sql`
    SELECT id, name, template_type, active_version_id, updated_at
    FROM email_templates
    WHERE id = ${templateId}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    templateType: row.template_type as string,
    activeVersionId: (row.active_version_id as string | null) ?? null,
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export async function updateTemplateName(templateId: string, name: string): Promise<void> {
  await sql`
    UPDATE email_templates
    SET name = ${name},
        updated_at = NOW()
    WHERE id = ${templateId}
  `;
}

export async function getTemplateWithActiveVersion(templateId: string): Promise<{
  id: string;
  name: string;
  templateType: string;
  activeVersionId: string | null;
  version: {
    id: string;
    subjectTemplate: string;
    blocks: EmailBlock[];
    fromName: string | null;
    fromEmail: string | null;
    metadata: EmailTemplateMetadata;
  } | null;
} | null> {
  const template = await getTemplateById(templateId);
  if (!template) return null;
  if (!template.activeVersionId) {
    return { ...template, version: null };
  }
  const version = await getTemplateVersion(template.activeVersionId);
  return {
    ...template,
    version: version
      ? {
          id: version.id,
          subjectTemplate: version.subjectTemplate,
          blocks: version.blocks,
          fromName: version.fromName,
          fromEmail: version.fromEmail,
          metadata: version.metadata as EmailTemplateMetadata,
        }
      : null,
  };
}

export function renderTemplateContent(input: {
  subjectTemplate: string;
  htmlTemplate: string;
  variables: Record<string, string | number | null | undefined>;
}): { subject: string; html: string } {
  const normalizedVariables: Record<string, string> = Object.fromEntries(
    Object.entries(input.variables).map(([key, value]) => [key, value == null ? '' : String(value)])
  );
  const subject = applyTemplate(input.subjectTemplate, normalizedVariables);
  const html = applyTemplate(input.htmlTemplate, normalizedVariables);
  return { subject, html };
}
