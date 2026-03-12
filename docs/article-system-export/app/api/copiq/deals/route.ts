import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCopiqApiKey } from '@/lib/copiq-auth';

export const dynamic = 'force-dynamic';

import { CATEGORY_SLUGS } from '@/lib/deal-categories';

const VALID_CATEGORIES = CATEGORY_SLUGS;

type SortOption = 'discount_desc' | 'expiry_asc';

interface DealObject {
  id: string;
  name: string;
  provider: string;
  currency: string;
  voucher_code: string | null;
  discount_percent: number | null;
  description: string | null;
  terms: string | null;
  affiliate_url: string;
  valid_until: string | null;
  category: string | null;
  rating: null;
  best_for: null;
}

/**
 * GET /api/copiq/deals
 *
 * Search and retrieve active deals from the Yorkshire.com promotions database
 * (same data that powers yorkshire.com/deals) for use in Copiq's listicle
 * and comparison article generation.
 *
 * Authentication: Authorization: Bearer {api_key}
 *
 * Query Parameters:
 *   q           – keyword search (title, description, advertiser_name)
 *   category    – filter by category slug (see VALID_CATEGORIES above)
 *   min_discount – minimum discount % extracted from title (integer)
 *   status      – 'active' (default) | 'all'
 *   sort        – 'discount_desc' | 'expiry_asc' (default: 'expiry_asc')
 *   limit       – max results, 1–50 (default: 10)
 *
 * Response 200:
 *   {
 *     success: true,
 *     data: DealObject[],
 *     total: number,
 *     deals_table: string  // markdown table for AI prompt injection
 *   }
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;

  if (!verifyCopiqApiKey(apiKey)) {
    return NextResponse.json(
      { success: false, code: 'UNAUTHORIZED', message: 'Invalid or missing API key' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const q          = searchParams.get('q')?.trim() || undefined;
    const category   = searchParams.get('category') || undefined;
    const minDiscount = searchParams.get('min_discount') ? parseInt(searchParams.get('min_discount')!) : undefined;
    const status     = searchParams.get('status') === 'all' ? undefined : 'active';
    const sort       = (searchParams.get('sort') || 'expiry_asc') as SortOption;
    const limit      = Math.min(Math.max(parseInt(searchParams.get('limit') || '10'), 1), 50);

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_ERROR',
          message: `Invalid category '${category}'. Valid values: ${VALID_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Build where clause — always scoped to active UK deals (same as /deals page)
    const where: Record<string, unknown> = {
      is_uk: true,
    };

    if (status) {
      where.status = status;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { advertiser_name: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category_tags = { has: category };
    }

    // Sort order
    const orderBy =
      sort === 'discount_desc'
        ? [{ voucher_exclusive: 'desc' as const }, { type: 'asc' as const }, { end_date: 'asc' as const }]
        : [{ end_date: 'asc' as const }, { voucher_exclusive: 'desc' as const }];

    const [promotions, totalCount] = await Promise.all([
      prisma.promotion.findMany({
        where,
        select: {
          promotion_id: true,
          type: true,
          title: true,
          description: true,
          voucher_code: true,
          url_tracking: true,
          url: true,
          end_date: true,
          advertiser_name: true,
          category_tags: true,
          terms: true,
          brand: {
            select: { name: true },
          },
        },
        orderBy,
        // Fetch extra so we can post-filter by min_discount without under-delivering
        take: minDiscount ? limit * 5 : limit,
      }),
      prisma.promotion.count({ where }),
    ]);

    // Transform to deal objects
    const deals: DealObject[] = promotions.map(promo => {
      const discountMatch = promo.title.match(/(\d+)%\s*off/i);
      const discountPercent = discountMatch ? parseInt(discountMatch[1]) : null;

      const provider = promo.brand?.name || promo.advertiser_name || 'Unknown Provider';
      const affiliateUrl = promo.url_tracking || promo.url || '';

      return {
        id: promo.promotion_id,
        name: promo.title,
        provider,
        currency: 'GBP',
        voucher_code: promo.voucher_code || null,
        discount_percent: discountPercent,
        description: promo.description || null,
        terms: promo.terms || null,
        affiliate_url: affiliateUrl,
        valid_until: promo.end_date?.toISOString() || null,
        category: promo.category_tags?.[0] || null,
        rating: null,
        best_for: null,
      };
    });

    // Post-filter by min_discount if specified
    const filtered = minDiscount
      ? deals.filter(d => d.discount_percent !== null && d.discount_percent >= minDiscount).slice(0, limit)
      : deals;

    return NextResponse.json({
      success: true,
      data: filtered,
      total: totalCount,
      deals_table: generateDealsTable(filtered),
    });

  } catch (error) {
    console.error('[Copiq Deals API] Error:', error);
    return NextResponse.json(
      { success: false, code: 'INTERNAL_ERROR', message: 'Failed to retrieve deals' },
      { status: 500 }
    );
  }
}

/**
 * Generate a markdown table from deal objects for AI prompt injection.
 */
function generateDealsTable(deals: DealObject[]): string {
  if (deals.length === 0) {
    return '| Rank | Deal | Provider | Voucher Code | Saving | Valid Until |\n|---|---|---|---|---|---|\n| - | No deals found | - | - | - | - |';
  }

  const header = '| Rank | Deal | Provider | Voucher Code | Saving | Valid Until |\n|---|---|---|---|---|---|';

  const rows = deals.map((deal, index) => {
    const rank        = index + 1;
    const name        = escapeMarkdown(deal.name);
    const provider    = escapeMarkdown(deal.provider);
    const voucher     = deal.voucher_code ? `\`${deal.voucher_code}\`` : '-';
    const saving      = deal.discount_percent ? `${deal.discount_percent}% off` : (deal.voucher_code ? 'Voucher' : '-');
    const validUntil  = deal.valid_until
      ? new Date(deal.valid_until).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Ongoing';

    return `| ${rank} | ${name} | ${provider} | ${voucher} | ${saving} | ${validUntil} |`;
  });

  return [header, ...rows].join('\n');
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
