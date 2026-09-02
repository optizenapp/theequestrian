import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db/vercel-postgres';
import { sendSesEmail } from '@/lib/email-platform/ses-mailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation
    if (!body.productId || !body.rating || !body.content || !body.authorName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
    // Insert review into database
    const { rows } = await sql`
      INSERT INTO reviews (
        product_id,
        product_handle,
        product_title,
        rating,
        title,
        content,
        author_name,
        author_email,
        verified_purchase,
        order_id,
        status,
        source
      ) VALUES (
        ${body.productId},
        ${body.productHandle || ''},
        ${body.productTitle || ''},
        ${body.rating},
        ${body.title || ''},
        ${body.content},
        ${body.authorName},
        ${body.authorEmail || null},
        ${body.verifiedPurchase || false},
        ${body.orderId || null},
        'pending',
        'custom'
      )
      RETURNING *
    `;
    
    console.log('✅ Review submitted successfully:', rows[0]);
    
    // Send notification email to admin
    await sendAdminNotification(rows[0] as ReviewRecord);
    
    return NextResponse.json({ 
      review: rows[0],
      message: 'Review submitted successfully. It will be published after moderation.'
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

type ReviewRecord = {
  id: string;
  product_title: string;
  rating: number;
  author_name: string;
  verified_purchase: boolean;
  author_email: string | null;
  order_id: string | null;
  title: string | null;
  content: string;
};

async function sendAdminNotification(review: ReviewRecord) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theequestrian.com.au';
  const adminEmail = process.env.CONTACT_EMAIL || 'support@theequestrian.com.au';
  
  // Generate star rating display
  const stars = '⭐'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  
  try {
    await sendSesEmail({
      from: process.env.SES_AWS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'reviews@theequestrian.com.au',
      to: [adminEmail],
      subject: `🔔 New Review: ${review.product_title} (${review.rating}★)`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Review Submitted</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
            <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%); padding: 30px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔔 New Review Submitted</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 30px 20px;">
                <!-- Product Info -->
                <div style="background: #f8f9fa; border-left: 4px solid #e91e63; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                  <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #1a1a1a;">
                    ${review.product_title}
                  </h2>
                  <div style="font-size: 24px; margin: 5px 0;">
                    ${stars}
                  </div>
                  <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                    Rating: ${review.rating}/5
                  </p>
                </div>

                <!-- Review Details -->
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">
                    <strong>Customer:</strong> ${review.author_name}
                    ${review.verified_purchase ? '<span style="color: #4caf50; font-weight: 600;">✓ Verified Purchase</span>' : ''}
                  </p>
                  ${review.author_email ? `<p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Email:</strong> ${review.author_email}</p>` : ''}
                  ${review.order_id ? `<p style="margin: 0 0 5px 0; color: #666; font-size: 14px;"><strong>Order:</strong> #${review.order_id}</p>` : ''}
                </div>

                ${review.title ? `
                <div style="margin-bottom: 15px;">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1a1a1a;">
                    "${review.title}"
                  </h3>
                </div>
                ` : ''}

                <!-- Review Content -->
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                  <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6;">
                    ${review.content}
                  </p>
                </div>

                <!-- Action Button -->
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${siteUrl}/admin/reviews" style="display: inline-block; background: #e91e63; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(233, 30, 99, 0.3);">
                    View in Admin Dashboard
                  </a>
                </div>

                <!-- Info -->
                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center;">
                  <p style="margin: 0; color: #999; font-size: 13px;">
                    This review is currently <strong style="color: #ff9800;">pending approval</strong>.<br>
                    It will not be visible to customers until you approve it.
                  </p>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e5e5e5;">
                <p style="margin: 0; color: #999; font-size: 12px;">
                  The Equestrian Admin Notifications<br>
                  <a href="${siteUrl}" style="color: #e91e63; text-decoration: none;">theequestrian.com.au</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Admin notification email sent for review:', review.id);
  } catch (error) {
    console.error('❌ Failed to send admin notification email:', error);
    // Don't throw - we don't want to fail the review submission if email fails
  }
}

