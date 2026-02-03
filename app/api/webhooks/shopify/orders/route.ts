import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { sql } from '@vercel/postgres';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Shopify Webhook Handler: Order Fulfillment
 * 
 * This endpoint receives webhooks from Shopify when an order is fulfilled.
 * It sends a review request email to the customer after a delay (e.g., 7 days).
 * 
 * Setup Instructions:
 * 1. In Shopify Admin, go to Settings > Notifications > Webhooks
 * 2. Create a new webhook:
 *    - Event: Order fulfillment
 *    - Format: JSON
 *    - URL: https://yourdomain.com/api/webhooks/shopify/orders
 *    - Webhook API version: 2024-01 (or latest)
 * 3. Add SHOPIFY_WEBHOOK_SECRET to your environment variables
 */

// Verify Shopify webhook signature
function verifyShopifyWebhook(body: string, hmacHeader: string): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('SHOPIFY_WEBHOOK_SECRET is not set');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');

    if (!hmacHeader) {
      return NextResponse.json(
        { error: 'Missing HMAC signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    if (!verifyShopifyWebhook(body, hmacHeader)) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook payload
    const order = JSON.parse(body);

    console.log('📦 Order fulfilled:', {
      orderId: order.id,
      orderNumber: order.order_number,
      customer: order.customer?.email,
      items: order.line_items?.length,
    });

    // Track GA4 purchase event (store in DB for later client-side tracking)
    try {
      const totalAmount = parseFloat(order.total_price || '0');
      const currency = order.currency || 'AUD';
      const items = lineItems.map((item: any) => ({
        item_id: item.product_id?.toString(),
        item_name: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price || '0'),
      }));

      await sql`
        INSERT INTO ga4_purchase_events (
          order_id,
          order_number,
          customer_email,
          total_amount,
          currency,
          items,
          created_at
        ) VALUES (
          ${order.id.toString()},
          ${orderNumber.toString()},
          ${customerEmail},
          ${totalAmount},
          ${currency},
          ${JSON.stringify(items)},
          NOW()
        )
        ON CONFLICT (order_id) DO NOTHING
      `;
      
      console.log('✅ GA4 purchase event queued for order:', orderNumber);
    } catch (gaError) {
      console.error('❌ Failed to queue GA4 purchase event:', gaError);
      // Don't fail the webhook if GA4 tracking fails
    }

    // Extract customer and order details
    const customerEmail = order.customer?.email;
    const customerName = order.customer?.first_name || 'Customer';
    const orderNumber = order.order_number;
    const lineItems = order.line_items || [];

    if (!customerEmail || lineItems.length === 0) {
      console.log('⚠️ Skipping review request: No email or no items');
      return NextResponse.json({ received: true });
    }

    // Schedule review request emails for each product
    // In production, you'd want to use a job queue (e.g., Vercel Cron, Inngest, or similar)
    // For now, we'll send immediately (you can add delay logic later)
    
    for (const item of lineItems) {
      const productHandle = item.product_id; // You may need to fetch the handle from Shopify
      const productTitle = item.title;
      const productId = `gid://shopify/Product/${item.product_id}`;

      // TODO: In production, schedule this for 7 days after fulfillment
      // For now, we'll send immediately for testing
      await sendReviewRequestEmail({
        customerEmail,
        customerName,
        orderNumber,
        orderId: order.id.toString(),
        productId,
        productHandle: item.product_id.toString(), // You may need to map this
        productTitle,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function sendReviewRequestEmail({
  customerEmail,
  customerName,
  orderNumber,
  orderId,
  productId,
  productHandle,
  productTitle,
}: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  productId: string;
  productHandle: string;
  productTitle: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const reviewUrl = `${siteUrl}/review?product=${productHandle}&order=${orderId}`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'reviews@theequestrian.com.au',
      to: customerEmail,
      subject: `How was your ${productTitle}?`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Review Request</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">The Equestrian</h1>
            </div>
            
            <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
              <h2 style="color: #1a1a1a; margin-top: 0; font-size: 24px;">Hi ${customerName},</h2>
              
              <p style="font-size: 16px; color: #555;">
                Thank you for your recent purchase from The Equestrian! We hope you're enjoying your new <strong>${productTitle}</strong>.
              </p>
              
              <p style="font-size: 16px; color: #555;">
                We'd love to hear about your experience. Your feedback helps other equestrians make informed decisions and helps us continue to provide the best products and service.
              </p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${reviewUrl}" style="display: inline-block; background: #e91e63; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(233, 30, 99, 0.3);">
                  Write a Review
                </a>
              </div>
              
              <p style="font-size: 14px; color: #777; text-align: center;">
                Order #${orderNumber}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">
              
              <p style="font-size: 13px; color: #999; text-align: center; margin-bottom: 0;">
                The Equestrian<br>
                Quality equestrian supplies and equipment<br>
                <a href="${siteUrl}" style="color: #e91e63; text-decoration: none;">theequestrian.com.au</a>
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Review request email sent:', {
      to: customerEmail,
      product: productTitle,
    });
  } catch (error) {
    console.error('❌ Failed to send review request email:', error);
  }
}



