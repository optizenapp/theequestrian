import { NextRequest, NextResponse } from 'next/server';
import { applyTemplate, getReviewEmailSettings } from '@/lib/reviews/email-settings';
import { getProductByHandle, getProductCanonicalUrl } from '@/lib/shopify/products';
import { renderReviewEmailHtml, type ReviewEmailRenderData } from '@/lib/reviews/email-template';
import { sql } from '@vercel/postgres';
import { sendSesEmail } from '@/lib/email-platform/ses-mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = typeof body?.to === 'string' ? body.to : '';
    if (!to) {
      return NextResponse.json({ error: 'Missing test email address' }, { status: 400 });
    }

    const settings = await getReviewEmailSettings();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';

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
        productImageUrl = rawImageUrl.split('?')[0];
        productTitle = product.title;
      }
    }

    const data: ReviewEmailRenderData = {
      customerName: 'Jono',
      orderNumber: '3599',
      siteUrl,
      productTitle,
      productUrl,
      productImageUrl,
      products: [
        {
          title: productTitle,
          imageUrl: productImageUrl,
          url: productUrl,
          handle: handle || 'sample-product',
        },
      ],
    };

    const html = await renderReviewEmailHtml({ settings, data, mode: 'send' });
    const subject = applyTemplate(settings.subjectTemplate, {
      customerName: data.customerName,
      productTitle: data.productTitle,
      productImageUrl: data.productImageUrl,
      productUrl: data.productUrl,
      orderNumber: data.orderNumber,
      siteUrl: data.siteUrl,
      brandPrimary: settings.brandPrimary,
      brandDark: settings.brandDark,
    });

    // Log test email send attempt to database
    const testOrderId = `TEST-${Date.now()}`;
    const testOrderNumber = 'TEST';
    let emailSendId: string | null = null;
    
    try {
      const result = await sql`
        INSERT INTO review_email_sends (
          order_id,
          order_number,
          customer_email,
          customer_name,
          product_title,
          product_handle,
          scheduled_at,
          status
        ) VALUES (
          ${testOrderId},
          ${testOrderNumber},
          ${to},
          ${data.customerName},
          ${data.productTitle},
          ${handle || 'sample-product'},
          NULL,
          'sent'
        )
        RETURNING id;
      `;
      emailSendId = result.rows[0]?.id || null;
    } catch (dbError) {
      console.error('❌ Failed to log test email send to database:', dbError);
    }

    try {
      await sendSesEmail({
        from: `${settings.fromName} <${settings.fromEmail}>`,
        to: [to],
        subject: `[TEST] ${subject}`,
        html,
      });

      // Update test email send record to 'sent' status
      if (emailSendId) {
        try {
          await sql`
            UPDATE review_email_sends
            SET status = 'sent',
                sent_at = ${new Date().toISOString()}
            WHERE id = ${emailSendId};
          `;
        } catch (updateError) {
          console.error('❌ Failed to update test email send status:', updateError);
        }
      }

      console.log('✅ Test review email sent:', {
        to,
        product: data.productTitle,
        orderId: testOrderId,
      });

      return NextResponse.json({ ok: true });
    } catch (error) {
      // Update test email send record to 'failed' status
      if (emailSendId) {
        try {
          await sql`
            UPDATE review_email_sends
            SET status = 'failed',
                error_message = ${error instanceof Error ? error.message : String(error)}
            WHERE id = ${emailSendId};
          `;
        } catch (updateError) {
          console.error('❌ Failed to update test email send status:', updateError);
        }
      }
      console.error('❌ Failed to send test email:', error);
      return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
  }
}
