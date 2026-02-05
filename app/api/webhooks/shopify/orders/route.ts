import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { sql } from '@vercel/postgres';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getProductCanonicalUrl } from '@/lib/shopify/products';
import { applyTemplate, getReviewEmailSettings } from '@/lib/reviews/email-settings';
import {
  renderReviewEmailHtml,
  type ReviewEmailRenderData,
  type ReviewEmailProduct,
} from '@/lib/reviews/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Shopify Webhook Handler: Order Fulfillment
 *
 * This endpoint receives webhooks from Shopify when an order is fulfilled.
 * It tracks GA4 purchase events and can send review request emails.
 *
 * Setup Instructions:
 * 1. In Shopify Admin, go to Settings > Notifications > Webhooks
 * 2. Create webhook for order fulfillment:
 *    - Event: Order fulfillment (orders/fulfilled)
 *    - Format: JSON
 *    - URL: https://www.theequestrian.com.au/api/webhooks/shopify/orders
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

  const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');

  return hash === hmacHeader;
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256');

    if (!hmacHeader) {
      return NextResponse.json({ error: 'Missing HMAC signature' }, { status: 401 });
    }

    // Verify webhook signature
    if (!verifyShopifyWebhook(body, hmacHeader)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse the webhook payload
    const order = JSON.parse(body);

    // Extract customer and order details
    const customerEmail = order.customer?.email;
    const customerName = order.customer?.first_name || 'Customer';
    const orderNumber = order.order_number;
    const lineItems = order.line_items || [];

    console.log('📦 Order created:', {
      orderId: order.id,
      orderNumber: order.order_number,
      customer: order.customer?.email,
      items: order.line_items?.length,
      totalPrice: order.total_price,
    });

    // Track GA4 purchase event (store in DB for later client-side tracking)
    if (customerEmail && lineItems.length > 0) {
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
    }

    if (!customerEmail || lineItems.length === 0) {
      console.log('⚠️ Skipping review request: No email or no items');
      return NextResponse.json({ received: true });
    }

    const settings = await getReviewEmailSettings();
    if (!settings.enabled) {
      console.log('⚠️ Review request emails disabled in settings');
      return NextResponse.json({ received: true });
    }

    const products: ReviewEmailProduct[] = await Promise.all(
      lineItems.map(async (item: any) => {
        const productGid = item.product_id ? `gid://shopify/Product/${item.product_id}` : null;
        if (!productGid) {
          return {
            title: item.title,
            handle: item.product_id?.toString() || '',
            imageUrl: null,
            url: null,
          };
        }
        const productDetails = await fetchProductDetails(productGid);
        const productTitle = productDetails?.title || item.title;
        const productHandle = productDetails?.handle || item.product_id?.toString() || '';
        const productUrl = productDetails ? await buildProductReviewUrl(productDetails) : null;
        const productImageUrl = productDetails?.featuredImage?.url || null;
        return {
          title: productTitle,
          handle: productHandle,
          imageUrl: productImageUrl,
          url: productUrl,
        };
      })
    );

    const primaryProduct = products[0];
    await sendReviewRequestEmail({
      customerEmail,
      customerName,
      orderNumber: orderNumber.toString(),
      orderId: order.id.toString(),
      products,
      productTitle: primaryProduct?.title || 'Your purchase',
      productImageUrl: primaryProduct?.imageUrl || null,
      productUrl: primaryProduct?.url || null,
      productHandle: primaryProduct?.handle || null,
      settings,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function sendReviewRequestEmail({
  customerEmail,
  customerName,
  orderNumber,
  orderId,
  productTitle,
  productImageUrl,
  productUrl,
  productHandle,
  products,
  settings,
}: {
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  productTitle: string;
  productImageUrl: string | null;
  productUrl: string | null;
  productHandle?: string | null;
  products: ReviewEmailProduct[];
  settings: Awaited<ReturnType<typeof getReviewEmailSettings>>;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const reviewUrl =
    productUrl || `${siteUrl}/review?product=${productHandle || ''}&order=${orderId}`;
  const cleanImageUrl = productImageUrl
    ? productImageUrl.split('?')[0].replace(/^\/\//, 'https://')
    : '';

  const data: ReviewEmailRenderData = {
    customerName,
    orderNumber,
    siteUrl,
    productTitle,
    productUrl: reviewUrl,
    productImageUrl: cleanImageUrl,
    products,
  };

  const html = await renderReviewEmailHtml({ settings, data, mode: 'send' });

  const subject = applyTemplate(settings.subjectTemplate, {
    customerName,
    productTitle,
    productImageUrl: cleanImageUrl,
    productUrl: reviewUrl,
    orderNumber,
    siteUrl,
    brandPrimary: settings.brandPrimary,
    brandDark: settings.brandDark,
  });

  const scheduledAt =
    settings.delayDays > 0
      ? new Date(Date.now() + settings.delayDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

  try {
    await resend.emails.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: customerEmail,
      subject,
      html,
      ...(scheduledAt ? { scheduledAt } : {}),
    });

    console.log('✅ Review request email sent:', {
      to: customerEmail,
      product: productTitle,
    });
  } catch (error) {
    console.error('❌ Failed to send review request email:', error);
  }
}

async function fetchProductDetails(productId: string) {
  try {
    const query = `
      query ProductForReviewEmail($id: ID!) {
        product(id: $id) {
          title
          handle
          productType
          featuredImage {
            url
            altText
          }
          metafield(namespace: "custom", key: "primary_collection") {
            value
          }
        }
      }
    `;
    const data = await shopifyAdminFetch<{
      product: {
        title: string;
        handle: string;
        productType: string;
        featuredImage: { url: string; altText: string | null } | null;
        metafield: { value: string } | null;
      } | null;
    }>({ query, variables: { id: productId } });
    return data.product;
  } catch (error) {
    console.error('❌ Failed to fetch product details:', error);
    return null;
  }
}

async function buildProductReviewUrl(product: {
  handle: string;
  productType: string;
  featuredImage?: { url: string; altText: string | null } | null;
  metafield: { value: string } | null;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const canonicalPath = await getProductCanonicalUrl({
    handle: product.handle,
    productType: product.productType,
    metafield: product.metafield,
  });
  return `${siteUrl}${canonicalPath}#reviews`;
}
