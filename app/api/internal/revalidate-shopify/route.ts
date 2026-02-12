import { NextRequest, NextResponse } from 'next/server';
import { revalidateShopifyProductCaches } from '@/lib/cache/shopify-revalidate';

interface RevalidatePayload {
  productHandle?: string;
  paths?: string[];
  tags?: string[];
}

function isAuthorized(request: NextRequest): boolean {
  const configuredSecret = process.env.INTERNAL_REVALIDATE_SECRET || process.env.REVALIDATE_SECRET;
  if (!configuredSecret) {
    return false;
  }

  const headerSecret = request.headers.get('x-revalidate-secret');
  return headerSecret === configuredSecret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as RevalidatePayload;
    const productHandle =
      typeof body?.productHandle === 'string' && body.productHandle.trim().length > 0
        ? body.productHandle.trim()
        : undefined;
    const paths = Array.isArray(body?.paths) ? body.paths : [];
    const tags = Array.isArray(body?.tags) ? body.tags : [];

    revalidateShopifyProductCaches(productHandle, {
      extraPaths: paths,
      extraTags: tags,
    });

    return NextResponse.json({
      ok: true,
      invalidated: {
        productHandle: productHandle || null,
        paths,
        tags,
      },
    });
  } catch (error) {
    console.error('[internal-revalidate-shopify] Failed to revalidate cache:', error);
    return NextResponse.json({ error: 'Failed to revalidate cache' }, { status: 500 });
  }
}
