/**
 * Create Draft Order API Route
 * 
 * Creates a Shopify draft order with custom prices (base + shipping)
 * Returns invoice URL for customer to complete payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDraftOrderWithShipping, type DraftOrderLineItem } from '@/lib/shopify/draft-orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateDraftOrderRequest {
  items: Array<{
    variantId: string;
    quantity: number;
    price: string; // Base price from Shopify
    vendor: string;
    tags?: string[];
    title: string;
    weight?: number; // Weight in grams (Shopify format)
  }>;
  customer: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateDraftOrderRequest = await request.json();
    
    // Validate request
    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }
    
    if (!body.customer || !body.customer.email) {
      return NextResponse.json(
        { error: 'Customer email is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customer.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    console.log('[API] Creating draft order...');
    console.log('[API] Customer:', body.customer.email);
    console.log('[API] Items:', body.items.length);
    
    // Convert request items to draft order format
    const lineItems: DraftOrderLineItem[] = body.items.map(item => ({
      variantId: item.variantId,
      quantity: item.quantity,
      basePrice: parseFloat(item.price),
      vendor: item.vendor,
      tags: item.tags || [],
      title: item.title,
      weightInKg: item.weight ? item.weight / 1000 : undefined, // Convert grams to kg
    }));
    
    // Create draft order
    const draftOrder = await createDraftOrderWithShipping(
      lineItems,
      body.customer
    );
    
    console.log('[API] ✅ Draft order created:', draftOrder.id);
    
    // Return invoice URL
    return NextResponse.json({
      success: true,
      draftOrderId: draftOrder.id,
      invoiceUrl: draftOrder.invoiceUrl,
      total: draftOrder.totalPrice,
      message: 'Draft order created successfully',
    });
    
  } catch (error) {
    console.error('[API] Error creating draft order:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return user-friendly error
    return NextResponse.json(
      {
        error: 'Failed to create checkout',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/checkout/create-draft-order',
    method: 'POST',
    description: 'Creates a Shopify draft order with custom prices',
  });
}
