import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';
import { sql } from '@vercel/postgres';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import { getProductCanonicalUrl } from '@/lib/shopify/products';
import { applyTemplate, getReviewEmailSettings } from '@/lib/reviews/email-settings';
import {
  cancelScheduledReviewEmailsByOrderId,
  extractResendEmailId,
  getShopifyOrderCancellationState,
  shouldCancelReviewScheduleFromOrderState,
} from '@/lib/reviews/review-email-cancellation';
import { upsertOrderFactFromShopifyPayload, recomputeCustomerAggregates, recomputeCustomerAffinities } from '@/lib/email-platform/orders';
import {
  renderReviewEmailHtml,
  type ReviewEmailRenderData,
  type ReviewEmailProduct,
} from '@/lib/reviews/email-template';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPPORTED_TOPICS = new Set(['orders/create', 'orders/fulfilled', 'orders/cancelled', 'refunds/create']);

/**
 * Shopify Webhook Handler: Review email schedule lifecycle.
 *
 * Supported topics on this endpoint:
 * - orders/create: queue GA4 purchase event for server-side sync
 * - orders/fulfilled: schedule/send review email
 * - orders/cancelled: cancel scheduled review emails for the order
 * - refunds/create: cancel scheduled review emails if refunded before fulfillment
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

    const topic = (request.headers.get('x-shopify-topic') || '').toLowerCase();
    const payload = JSON.parse(body);

    if (!SUPPORTED_TOPICS.has(topic)) {
      console.log('ℹ️ Ignoring unsupported Shopify topic for orders webhook:', topic || '(missing)');
      return NextResponse.json({ received: true, ignored: true });
    }

    if (topic === 'orders/create') {
      await queueGa4PurchaseEvent(payload, topic);
      return NextResponse.json({ received: true, topic });
    }

    if (topic === 'orders/fulfilled') {
      // Backstop queue in case orders/create webhook is missing or delayed.
      await queueGa4PurchaseEvent(payload, topic);
      await handleOrderFulfilled(payload);
      return NextResponse.json({ received: true, topic });
    }

    await handleOrderCancellationTopic({
      topic,
      payload,
    });
    return NextResponse.json({ received: true, topic });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleOrderFulfilled(order: any): Promise<void> {
  const customerEmail = order.customer?.email;
  const customerName = order.customer?.first_name || 'Customer';
  const orderNumber = order.order_number;
  const lineItems = order.line_items || [];

  console.log('📦 Order fulfilled:', {
    orderId: order.id,
    orderNumber: order.order_number,
    customer: order.customer?.email,
    items: order.line_items?.length,
    totalPrice: order.total_price,
  });

  try {
    await upsertOrderFactFromShopifyPayload(order);
    await recomputeCustomerAggregates();
    await recomputeCustomerAffinities();
  } catch (orderFactError) {
    console.error('❌ Failed to sync order fact into email platform:', orderFactError);
  }

  if (!customerEmail || lineItems.length === 0) {
    console.log('⚠️ Skipping review request: No email or no items');
    return;
  }

  const settings = await getReviewEmailSettings();
  if (!settings.enabled) {
    console.log('⚠️ Review request emails disabled in settings');
    return;
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
}

async function queueGa4PurchaseEvent(order: any, sourceTopic: string): Promise<void> {
  const orderId = order?.id?.toString?.();
  const orderNumber = order?.order_number?.toString?.() || order?.name?.toString?.() || orderId;
  const customerEmail = order?.email || order?.customer?.email || '';
  const lineItems = order?.line_items || [];

  if (!orderId || !orderNumber || !customerEmail || lineItems.length === 0) {
    console.log('⚠️ Skipping GA4 queue (missing required order data):', {
      sourceTopic,
      hasOrderId: Boolean(orderId),
      hasOrderNumber: Boolean(orderNumber),
      hasCustomerEmail: Boolean(customerEmail),
      itemCount: lineItems.length,
    });
    return;
  }

  try {
    const totalAmount = parseFloat(order.total_price || '0');
    const currency = order.currency || 'AUD';
    const items = lineItems.map((item: any) => ({
      item_id: item.product_id?.toString(),
      item_name: item.title,
      quantity: item.quantity,
      price: parseFloat(item.price || '0'),
    }));

    const insertResult = await sql`
      INSERT INTO ga4_purchase_events (
        order_id,
        order_number,
        customer_email,
        total_amount,
        currency,
        items,
        created_at
      ) VALUES (
        ${orderId},
        ${orderNumber},
        ${customerEmail},
        ${totalAmount},
        ${currency},
        ${JSON.stringify(items)},
        NOW()
      )
      ON CONFLICT (order_id) DO NOTHING
      RETURNING id
    `;

    if (insertResult.rows.length > 0) {
      console.log('✅ GA4 purchase event queued:', { sourceTopic, orderNumber, orderId });
    } else {
      console.log('ℹ️ GA4 purchase event already queued:', { sourceTopic, orderNumber, orderId });
    }
  } catch (gaError) {
    console.error('❌ Failed to queue GA4 purchase event:', {
      sourceTopic,
      orderId,
      error: gaError,
    });
  }
}

async function handleOrderCancellationTopic({
  topic,
  payload,
}: {
  topic: string;
  payload: any;
}): Promise<void> {
  const orderId =
    topic === 'refunds/create' ? payload?.order_id?.toString?.() : payload?.id?.toString?.();
  if (!orderId) {
    console.warn(`⚠️ Missing order ID for ${topic} webhook`);
    return;
  }

  if (topic === 'refunds/create') {
    const orderState = await getShopifyOrderCancellationState(orderId);
    if (!orderState) {
      console.warn(`⚠️ Could not load Shopify order state for refund webhook. orderId=${orderId}`);
      return;
    }
    const shouldCancel = shouldCancelReviewScheduleFromOrderState(orderState);
    if (!shouldCancel) {
      console.log(`ℹ️ Refund received but order is fulfilled/partially fulfilled. Skipping cancel.`, {
        orderId,
        displayFinancialStatus: orderState.displayFinancialStatus,
        displayFulfillmentStatus: orderState.displayFulfillmentStatus,
      });
      return;
    }
  }

  if (topic !== 'refunds/create' && payload?.id) {
    try {
      await upsertOrderFactFromShopifyPayload(payload);
      await recomputeCustomerAggregates();
      await recomputeCustomerAffinities();
    } catch (orderFactError) {
      console.error('❌ Failed to sync cancelled order fact into email platform:', orderFactError);
    }
  }

  const reason = `Shopify ${topic} webhook`;
  const results = await cancelScheduledReviewEmailsByOrderId(orderId, reason);
  const cancelledCount = results.filter((result) => result.cancelled).length;
  const failedCount = results.length - cancelledCount;

  console.log('✅ Processed review-email cancellation webhook:', {
    topic,
    orderId,
    foundScheduled: results.length,
    cancelledCount,
    failedCount,
  });
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

  // Log email send attempt to database
  let emailSendId: string | null = null;
  try {
    const { sql } = await import('@vercel/postgres');
    const scheduledAtDate = scheduledAt ? scheduledAt : null;
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
        ${orderId},
        ${orderNumber},
        ${customerEmail},
        ${customerName},
        ${productTitle},
        ${products[0]?.handle || null},
        ${scheduledAtDate},
        'scheduled'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;
    emailSendId = result.rows[0]?.id || null;
    if (!emailSendId) {
      console.log('ℹ️ Skipping duplicate review request schedule for order:', {
        orderId,
        orderNumber,
        customerEmail,
      });
      return;
    }
  } catch (dbError) {
    console.error('❌ Failed to log email send to database:', dbError);
    return;
  }

  try {
    const sendResult = await resend.emails.send({
      from: `${settings.fromName} <${settings.fromEmail}>`,
      to: customerEmail,
      subject,
      html,
      ...(scheduledAt ? { scheduledAt } : {}),
    });
    const resendEmailId = extractResendEmailId(sendResult);

    if (emailSendId) {
      try {
        const { sql } = await import('@vercel/postgres');
        if (scheduledAt) {
          await sql`
            UPDATE review_email_sends
            SET resend_email_id = ${resendEmailId}
            WHERE id = ${emailSendId};
          `;
        } else {
          await sql`
            UPDATE review_email_sends
            SET status = 'sent',
                sent_at = ${new Date().toISOString()},
                resend_email_id = ${resendEmailId}
            WHERE id = ${emailSendId};
          `;
        }
      } catch (updateError) {
        console.error('❌ Failed to update email send status:', updateError);
      }
    }

    console.log('✅ Review request email sent:', {
      to: customerEmail,
      product: productTitle,
    });
  } catch (error) {
    // Update email send record to 'failed' status
    if (emailSendId) {
      try {
        const { sql } = await import('@vercel/postgres');
        await sql`
          UPDATE review_email_sends
          SET status = 'failed',
              error_message = ${error instanceof Error ? error.message : String(error)}
          WHERE id = ${emailSendId};
        `;
      } catch (updateError) {
        console.error('❌ Failed to update email send status:', updateError);
      }
    }
    console.error('❌ Failed to send review request email:', error);
  }
}

async function fetchProductDetails(productId: string) {
  try {
    const query = `
      query ProductForReviewEmail($id: ID!) {
        product(id: $id) {
          id
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
        id: string;
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
  id: string;
  handle: string;
  productType: string;
  featuredImage?: { url: string; altText: string | null } | null;
  metafield: { value: string } | null;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';
  const canonicalPath = await getProductCanonicalUrl({
    id: product.id,
    handle: product.handle,
    productType: product.productType,
    metafield: product.metafield,
  });
  return `${siteUrl}${canonicalPath}#reviews`;
}
