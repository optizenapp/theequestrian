import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthorizeRedirectUrl,
  encodeOAuthState,
  isValidShopHostname,
} from '@/lib/shopify/vendor-oauth';

export const runtime = 'nodejs';

function getPublicBaseUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return null;
}

/**
 * Start OAuth for a vendor store (Dev Dashboard app, 2026+).
 * GET /api/shopify/vendor-oauth/install?shop=trailrace.myshopify.com&marketplace_vendor_name=Trailrace
 * Optional: &secret=... if VENDOR_OAUTH_START_SECRET is set.
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.VENDOR_SYNC_APP_CLIENT_ID;
  const clientSecret = process.env.VENDOR_SYNC_APP_CLIENT_SECRET;
  const startSecret = process.env.VENDOR_OAUTH_START_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          'Missing VENDOR_SYNC_APP_CLIENT_ID or VENDOR_SYNC_APP_CLIENT_SECRET (Dev Dashboard app credentials)',
      },
      { status: 503 }
    );
  }

  if (startSecret) {
    const q = request.nextUrl.searchParams.get('secret');
    if (q !== startSecret) {
      return NextResponse.json({ error: 'Invalid or missing secret query param' }, { status: 401 });
    }
  }

  const shop = request.nextUrl.searchParams.get('shop')?.trim() || '';
  const marketplaceVendorName =
    request.nextUrl.searchParams.get('marketplace_vendor_name')?.trim() || '';

  if (!isValidShopHostname(shop)) {
    return NextResponse.json(
      { error: 'Invalid shop (expected *.myshopify.com)' },
      { status: 400 }
    );
  }
  if (!marketplaceVendorName) {
    return NextResponse.json(
      { error: 'Missing marketplace_vendor_name (exact Product.vendor on marketplace)' },
      { status: 400 }
    );
  }

  const base = getPublicBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: 'Set NEXT_PUBLIC_SITE_URL (or deploy on Vercel for VERCEL_URL)' },
      { status: 503 }
    );
  }

  const redirectUri = `${base}/api/shopify/vendor-oauth/callback`;
  const state = encodeOAuthState(marketplaceVendorName, clientSecret, 10 * 60 * 1000);
  const url = buildAuthorizeRedirectUrl({
    shop,
    clientId,
    redirectUri,
    state,
  });

  return NextResponse.redirect(url);
}
