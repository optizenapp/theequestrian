import { NextRequest, NextResponse } from 'next/server';
import { shopifyAdminFetch } from '@/lib/shopify/admin-client';
import {
  fetchAndCacheCollectiveRate,
  sleep,
} from '@/lib/shipping/collective-rates';
import { sql } from '@/lib/db/client';
import { ensureCollectiveShippingRatesTable } from '@/lib/db/collective-shipping-rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorizeCron(request: NextRequest): boolean {
  const envSecret = process.env.CRON_SECRET;
  if (!envSecret) return true;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '').trim();
  const headerSecret = request.headers.get('x-cron-secret')?.trim();
  return token === envSecret || headerSecret === envSecret;
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit') || '200') || 200, 400);
  const delayMs = Math.max(Number(url.searchParams.get('delayMs') || '350') || 350, 200);
  const staleHours = Math.max(Number(url.searchParams.get('staleHours') || '24') || 24, 1);

  try {
    await ensureCollectiveShippingRatesTable();
    const freshRows = (await sql`
      SELECT variant_id
      FROM collective_shipping_rates
      WHERE fetched_at > NOW() - (${staleHours} || ' hours')::interval
    `) as Array<{ variant_id: string }>;
    const fresh = new Set(freshRows.map((row) => row.variant_id));

    let cursor: string | null = null;
    let hasNext = true;
    let scanned = 0;
    let synced = 0;
    let skippedFresh = 0;
    let errors = 0;

    type ProductsPage = {
      products: {
        edges: Array<{
          node: {
            id: string;
            handle: string;
            vendor: string;
            variants: { edges: Array<{ node: { id: string; price: string } }> };
          };
        }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    };

    while (hasNext && synced < limit) {
      const page: ProductsPage = await shopifyAdminFetch<ProductsPage>({
        query: `#graphql
          query($first: Int!, $after: String) {
            products(first: $first, after: $after, query: "status:active") {
              edges {
                node {
                  id handle vendor
                  variants(first: 1) { edges { node { id price } } }
                }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        `,
        variables: { first: 50, after: cursor },
      });

      for (const { node } of page.products.edges) {
        if (synced >= limit) break;
        const variant = node.variants.edges[0]?.node;
        if (!variant) continue;
        scanned += 1;
        const variantNumeric = variant.id.split('/').pop() || variant.id;
        if (fresh.has(variantNumeric)) {
          skippedFresh += 1;
          continue;
        }

        try {
          await fetchAndCacheCollectiveRate({
            productId: node.id,
            variantId: variant.id,
            vendor: node.vendor,
            handle: node.handle,
            samplePriceAud: Number(variant.price),
          });
          synced += 1;
          await sleep(delayMs);
        } catch (error) {
          errors += 1;
          console.error('[cron:collective-shipping]', node.handle, error);
          await sleep(delayMs * 2);
        }
      }

      hasNext = page.products.pageInfo.hasNextPage && synced < limit;
      cursor = page.products.pageInfo.endCursor;
    }

    return NextResponse.json({
      ok: true,
      scanned,
      synced,
      skippedFresh,
      errors,
      limit,
      staleHours,
    });
  } catch (error) {
    console.error('[cron:collective-shipping] failed', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
