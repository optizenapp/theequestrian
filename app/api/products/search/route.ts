/**
 * Product Search API
 * Fast product search using Vercel Postgres
 * 
 * This endpoint replaces direct Shopify queries for category pages
 * Returns products from database (fast) without prices (fetched real-time by client)
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchProducts, calculateFacets, type ProductFilters } from '@/lib/db/queries';
import { checkRateLimit, rejectBotRequest } from '@/lib/api/endpoint-guards';

// Use Node.js runtime instead of edge for database compatibility
export const dynamic = 'force-dynamic'; // Always fresh data

export async function GET(request: NextRequest) {
  try {
    const botBlocked = rejectBotRequest(request, 'products/search');
    if (botBlocked) return botBlocked;

    const rl = checkRateLimit(
      request,
      'api:products:search',
      Number(process.env.API_SEARCH_RATE_LIMIT_PER_MIN || 90),
      60_000
    );
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': String(rl.retryAfterSec) },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse product types (required)
    const productTypes = searchParams.getAll('type');
    if (productTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one product type is required' },
        { status: 400 }
      );
    }
    
    // Parse filters
    const filters: ProductFilters = {};
    
    const brands = searchParams.getAll('brand');
    if (brands.length > 0) {
      filters.brands = brands;
    }
    
    const sizes = searchParams.getAll('size');
    if (sizes.length > 0) {
      filters.sizes = sizes;
    }
    
    const colors = searchParams.getAll('color');
    if (colors.length > 0) {
      filters.colors = colors;
    }
    
    const minPrice = searchParams.get('minPrice');
    if (minPrice) {
      filters.minPrice = parseFloat(minPrice);
    }
    
    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) {
      filters.maxPrice = parseFloat(maxPrice);
    }
    
    const inStockOnly = searchParams.get('inStockOnly') === 'true';
    if (inStockOnly) {
      filters.inStockOnly = true;
    }
    
    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }
    
    // Parse pagination
    const rawLimit = parseInt(searchParams.get('limit') || '36', 10);
    const rawOffset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 72) : 36;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
    
    console.log('[API /products/search]', {
      productTypes: productTypes.slice(0, 3),
      filters,
      limit,
      offset,
    });
    
    // Query products from database
    const startTime = Date.now();
    const { products, totalCount, hasNextPage } = await searchProducts(
      productTypes,
      filters,
      limit,
      offset
    );
    const queryTime = Date.now() - startTime;
    
    console.log(`[API /products/search] ✅ Found ${products.length} products in ${queryTime}ms`);
    
    // Calculate facets (for filter UI)
    const facetsStartTime = Date.now();
    const facets = await calculateFacets(productTypes, filters);
    const facetsTime = Date.now() - facetsStartTime;
    
    console.log(`[API /products/search] ✅ Calculated facets in ${facetsTime}ms`);
    
    // Transform products to match existing format
    // Note: Prices are NOT included - client will fetch real-time
    const transformedProducts = products.map(p => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      description: p.description,
      vendor: p.vendor,
      productType: p.product_type,
      tags: p.tags,
      images: {
        edges: p.image_url ? [{
          node: {
            url: p.image_url,
            altText: p.image_alt || p.title,
          }
        }] : []
      },
      availableForSale: p.available_for_sale,
      createdAt: p.shopify_created_at,
      // Prices will be hydrated client-side
      priceRange: {
        minVariantPrice: { amount: '0', currencyCode: 'AUD' },
        maxVariantPrice: { amount: '0', currencyCode: 'AUD' }
      },
      variants: { edges: [] }, // Will be populated by client hydration
    }));
    
    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        limit,
        offset,
        totalCount,
        hasNextPage,
        nextOffset: hasNextPage ? offset + limit : null,
      },
      facets: {
        brands: facets.brands,
        sizes: facets.sizes,
        colors: facets.colors,
      },
      meta: {
        queryTime: `${queryTime}ms`,
        facetsTime: `${facetsTime}ms`,
        totalTime: `${queryTime + facetsTime}ms`,
      },
    });
  } catch (error) {
    console.error('[API /products/search] Error:', error);
    return NextResponse.json(
      { 
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
