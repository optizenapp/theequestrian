import { NextRequest, NextResponse } from 'next/server';
import {
  decodeOAuthState,
  exchangeAuthorizationCodeForToken,
  isValidShopHostname,
  verifyShopifyOAuthQueryHmac,
} from '@/lib/shopify/vendor-oauth';
import { upsertVendorOAuthConnection } from '@/lib/inventory/vendor-sync/repository';

export const runtime = 'nodejs';

function htmlPage(title: string, body: string, ok: boolean): NextResponse {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;padding:2rem;max-width:40rem"><h1>${title}</h1><p>${body}</p>${ok ? '<p>You can close this tab.</p>' : ''}</body></html>`;
  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * OAuth redirect target. Must be listed under Allowed redirection URL(s) in Dev Dashboard.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.VENDOR_SYNC_APP_CLIENT_ID;
  const clientSecret = process.env.VENDOR_SYNC_APP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return htmlPage(
      'Configuration error',
      'Server missing VENDOR_SYNC_APP_CLIENT_ID or VENDOR_SYNC_APP_CLIENT_SECRET.',
      false
    );
  }

  const searchParams = request.nextUrl.searchParams;

  if (!verifyShopifyOAuthQueryHmac(searchParams, clientSecret)) {
    return htmlPage('Invalid request', 'HMAC verification failed.', false);
  }

  const code = searchParams.get('code');
  const shop = searchParams.get('shop')?.trim() || '';
  const stateRaw = searchParams.get('state') || '';

  if (!code || !shop || !stateRaw) {
    return htmlPage('Invalid request', 'Missing code, shop, or state.', false);
  }

  if (!isValidShopHostname(shop)) {
    return htmlPage('Invalid shop', 'Shop hostname is not allowed.', false);
  }

  const statePayload = decodeOAuthState(stateRaw, clientSecret);
  if (!statePayload) {
    return htmlPage('Invalid state', 'State expired or tampered.', false);
  }

  try {
    const { access_token } = await exchangeAuthorizationCodeForToken({
      shop,
      clientId,
      clientSecret,
      code,
    });

    await upsertVendorOAuthConnection(shop, statePayload.m, access_token);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[vendor-oauth] callback error', e);
    return htmlPage('Connection failed', msg, false);
  }

  return htmlPage(
    'Store connected',
    `Saved access token for <strong>${shop}</strong> as marketplace vendor <strong>${statePayload.m}</strong>. Register webhooks next.`,
    true
  );
}
