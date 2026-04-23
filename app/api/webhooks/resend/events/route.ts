import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Resend webhooks are no longer used. Configure Amazon SES → SNS → HTTPS to
 * `/api/webhooks/aws/ses-sns` instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Deprecated',
      message: 'Resend webhooks are disabled. Use /api/webhooks/aws/ses-sns for SES event delivery via SNS.',
    },
    { status: 410 }
  );
}
