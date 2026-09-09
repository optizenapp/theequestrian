import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/email-platform/unsubscribe';

function wantsHtml(request: NextRequest): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function htmlPage(title: string, body: string, status: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en-AU">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; background: #f7f4ef; margin: 0; padding: 2rem; }
    main { max-width: 32rem; margin: 3rem auto; background: #fff; padding: 2rem; border: 1px solid #e6e0d6; }
    h1 { font-size: 1.5rem; margin: 0 0 0.75rem; }
    p { line-height: 1.5; margin: 0 0 0.75rem; }
    a { color: #8b3a3a; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    ${body}
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

async function handleUnsubscribe(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token) {
    if (wantsHtml(request)) {
      return htmlPage(
        'Unsubscribe',
        '<p>This unsubscribe link is missing a token. Please use the link from your email.</p>',
        400
      );
    }
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const result = await unsubscribeByToken(token);
  if (!result) {
    if (wantsHtml(request)) {
      return htmlPage(
        'Unsubscribe',
        '<p>This unsubscribe link is invalid or has already been used.</p>',
        404
      );
    }
    return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 404 });
  }

  if (wantsHtml(request) || request.method === 'GET') {
    return htmlPage(
      'Unsubscribed',
      '<p>You have been removed from The Equestrian email marketing.</p><p>You will no longer receive marketing campaigns, list emails, or automated sequences.</p>',
      200
    );
  }

  return NextResponse.json({
    ok: true,
    message: 'You have been unsubscribed from all email marketing.',
    contactId: result.contactId,
  });
}

export async function GET(request: NextRequest) {
  try {
    return await handleUnsubscribe(request);
  } catch (error) {
    console.error('Failed to unsubscribe contact:', error);
    if (wantsHtml(request)) {
      return htmlPage('Unsubscribe', '<p>Something went wrong. Please try again later.</p>', 500);
    }
    return NextResponse.json({ error: 'Failed to unsubscribe contact' }, { status: 500 });
  }
}

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). */
export async function POST(request: NextRequest) {
  try {
    return await handleUnsubscribe(request);
  } catch (error) {
    console.error('Failed to unsubscribe contact (POST):', error);
    return NextResponse.json({ error: 'Failed to unsubscribe contact' }, { status: 500 });
  }
}
