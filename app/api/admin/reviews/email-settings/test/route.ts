import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { applyTemplate, getReviewEmailSettings } from '@/lib/reviews/email-settings';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import juice from 'juice';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = typeof body?.to === 'string' ? body.to : '';
    if (!to) {
      return NextResponse.json({ error: 'Missing test email address' }, { status: 400 });
    }

    const settings = await getReviewEmailSettings();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
    const logoSection =
      settings.logoUrl && !settings.logoUrl.startsWith('data:')
        ? `<div style="margin-bottom: 16px;"><img src="${settings.logoUrl}" alt="The Equestrian" style="max-width: 180px; height: auto;" /></div>`
        : '';

    const inlineQuillStyles = (html: string) => {
      return html.replace(/<([a-z][a-z0-9]*)\s+([^>]*?)class="([^"]*)"([^>]*?)>/gi, (fullMatch, tag, before, classValue, after) => {
        const classes = classValue.split(/\s+/).filter(Boolean);
        const styles: string[] = [];
        
        // Extract alignment
        if (classes.includes('ql-align-center')) styles.push('text-align:center');
        if (classes.includes('ql-align-right')) styles.push('text-align:right');
        if (classes.includes('ql-align-justify')) styles.push('text-align:justify');
        
        // Extract indent
        const indentClass = classes.find((c) => c.startsWith('ql-indent-'));
        if (indentClass) {
          const level = Number(indentClass.replace('ql-indent-', ''));
          if (!Number.isNaN(level) && level > 0) {
            styles.push(`padding-left:${level * 3}em`);
          }
        }
        
        // Keep non-Quill classes
        const nonQuillClasses = classes.filter((c) => !c.startsWith('ql-')).join(' ');
        
        // Extract existing style attribute
        const existingStyleMatch = (before + after).match(/style="([^"]*)"/);
        const existingStyles = existingStyleMatch ? existingStyleMatch[1] : '';
        
        // Merge styles
        const allStyles = existingStyles ? `${existingStyles};${styles.join(';')}` : styles.join(';');
        
        // Rebuild attributes
        let newBefore = before.replace(/style="[^"]*"/, '').trim();
        let newAfter = after.replace(/style="[^"]*"/, '').trim();
        
        const classAttr = nonQuillClasses ? ` class="${nonQuillClasses}"` : '';
        const styleAttr = allStyles ? ` style="${allStyles}"` : '';
        
        return `<${tag}${newBefore ? ' ' + newBefore : ''}${classAttr}${styleAttr}${newAfter ? ' ' + newAfter : ''}>`;
      });
    };

    const preserveWhitespace = (html: string) => {
      // Only convert 2+ consecutive spaces to nbsp, leave single spaces alone
      return html.replace(/>([^<]+)</g, (match, text) => {
        const withSpaces = text.replace(/ {2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
        return `>${withSpaces}<`;
      });
    };

    let productImageUrl = `${siteUrl}/window.svg`;
    let productUrl = `${siteUrl}/products/sample-product#reviews`;
    let productTitle = 'Synthetic Combo Horse Rug - Eureka Mini';
    const handle = typeof body?.handle === 'string' ? body.handle.trim() : '';
    if (handle) {
      const product = await getProductByHandle(handle);
      if (product) {
        const canonical = await getProductCanonicalUrl(product);
        productUrl = `${siteUrl}${canonical}#reviews`;
        const rawImageUrl = product.images?.edges?.[0]?.node?.url || productImageUrl;
        // Clean Shopify CDN URLs - remove query params that might break in email
        productImageUrl = rawImageUrl.split('?')[0];
        productTitle = product.title;
      }
    }
    const buildProductCard = (title: string, imageUrl: string, url: string) => `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px auto; max-width: 600px;">
        <tr>
          <td align="center" style="padding: 12px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="380" style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 12px;">
              <tr>
                <td align="center" style="padding: 24px 24px 20px;">
                  <img src="${imageUrl}" alt="${title}" width="200" height="200" style="width: 200px; height: 200px; object-fit: cover; border-radius: 10px; display: block; margin: 0 auto; border: 0;" />
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 24px 20px; font-size: 18px; font-weight: 600; color: #111827; line-height: 1.4;">
                  ${title}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding: 0 24px 24px;">
                  <a href="${url}" style="display: inline-block; background-color: ${settings.brandPrimary}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-weight: 600; font-size: 15px; white-space: nowrap;">Leave a review</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;
    
    const productCard = buildProductCard(productTitle, productImageUrl, productUrl);
    const productCards = `${productCard}${buildProductCard(productTitle, productImageUrl, productUrl)}`;
    const rawHtml = applyTemplate(settings.htmlTemplate, {
      customerName: 'Jono',
      productTitle,
      productImageUrl,
      productUrl,
      productCard,
      productCards,
      orderNumber: '3599',
      siteUrl,
      logoSection,
      brandPrimary: settings.brandPrimary,
      brandDark: settings.brandDark,
    });
    const html = juice(preserveWhitespace(inlineQuillStyles(rawHtml)));
    const subject = applyTemplate(settings.subjectTemplate, {
      customerName: 'Jono',
      productTitle,
      productImageUrl,
      productUrl,
      productCard,
      productCards,
      orderNumber: '3599',
      siteUrl,
      logoSection,
      brandPrimary: settings.brandPrimary,
      brandDark: settings.brandDark,
    });

    await resend.emails.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to,
      subject: `[TEST] ${subject}`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
