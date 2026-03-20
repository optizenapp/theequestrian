import { NextRequest, NextResponse } from 'next/server';
import { generateExampleEmail } from '@/lib/email-platform/auto-weekly/generate-example';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const blocks = Array.isArray(body?.blocks) ? body.blocks : [];
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : {};
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theequestrian.com.au';

    const result = await generateExampleEmail({
      blocks,
      metadata: metadata as Record<string, unknown>,
      siteUrl,
    });

    return NextResponse.json({
      html: result.html,
      subjectLine: result.subjectLine,
      introText: result.introText,
      generatedHeading: result.generatedHeading,
      productHandles: result.productHandles,
      sendDateLabel: result.sendDateLabel,
    });
  } catch (error) {
    console.error('[generate-example]', error);
    const message = error instanceof Error ? error.message : 'Failed to generate example';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
