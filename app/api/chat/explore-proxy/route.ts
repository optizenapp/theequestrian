/**
 * API Route to explore the Shopify Chat proxy endpoint
 * 
 * This endpoint helps us discover what APIs are available at:
 * https://www.theequestrian.com.au/apps/shopify-chat
 * 
 * Usage: GET /api/chat/explore-proxy
 */

import { NextResponse } from 'next/server';
import { exploreShopifyChatProxy } from '@/lib/chat/shopify-chat-proxy';

export async function GET() {
  try {
    const results = await exploreShopifyChatProxy();

    return NextResponse.json({
      success: true,
      data: results,
      message: 'Proxy exploration completed. Check the response to see available endpoints.',
    });
  } catch (error: any) {
    console.error('Failed to explore Shopify Chat proxy:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to explore proxy endpoint',
      },
      { status: 500 }
    );
  }
}
