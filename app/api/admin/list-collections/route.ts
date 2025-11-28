import { NextRequest, NextResponse } from 'next/server';
import { getAllCollections } from '@/lib/shopify/collections';

/**
 * API endpoint to list all collections for testing
 * GET /api/admin/list-collections
 */
export async function GET(request: NextRequest) {
  try {
    const collections = await getAllCollections();

    // Group by parent
    const parentCollections = collections.filter((c) => !c.parentCollection);
    const childCollections = collections.filter((c) => c.parentCollection);

    return NextResponse.json({
      total: collections.length,
      parentCollections: parentCollections.map((c) => ({
        handle: c.handle,
        title: c.title,
        productCount: c.products.edges.length,
        url: `/${c.handle}`,
      })),
      childCollections: childCollections.map((c) => ({
        handle: c.handle,
        title: c.title,
        parent: c.parentCollection,
        productCount: c.products.edges.length,
        url: `/${c.parentCollection}/${c.handle}`,
      })),
      allCollections: collections.map((c) => ({
        handle: c.handle,
        title: c.title,
        parent: c.parentCollection || null,
        productCount: c.products.edges.length,
        url: c.parentCollection ? `/${c.parentCollection}/${c.handle}` : `/${c.handle}`,
      })),
    });
  } catch (error) {
    console.error('Error listing collections:', error);
    return NextResponse.json(
      { error: 'Failed to list collections', details: String(error) },
      { status: 500 }
    );
  }
}
