import { NextRequest, NextResponse } from 'next/server';
import { getCollectionByHandle } from '@/lib/shopify/collections';

/**
 * API endpoint to get a single collection by handle
 * Used by client components that need collection data
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle');

  if (!handle) {
    return NextResponse.json(
      { error: 'Missing handle parameter' },
      { status: 400 }
    );
  }

  try {
    const collection = await getCollectionByHandle(handle, 250);
    
    if (!collection) {
      return NextResponse.json(
        { error: `Collection "${handle}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection', details: String(error) },
      { status: 500 }
    );
  }
}
