import { NextRequest, NextResponse } from 'next/server';
import { shopifyFetch } from '@/lib/shopify/client';
import { UPDATE_CART_ATTRIBUTES } from '@/lib/shopify/queries';

type AttributeInput = { key: string; value: string };

type CartAttributesUpdateResponse = {
  cartAttributesUpdate: {
    cart: {
      id: string;
      checkoutUrl: string;
      attributes: AttributeInput[];
    } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

function parseAttributes(raw: unknown): AttributeInput[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const attributes: AttributeInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const key = (item as { key?: unknown }).key;
    const value = (item as { value?: unknown }).value;
    if (typeof key !== 'string' || !key || typeof value !== 'string' || !value) {
      return null;
    }
    attributes.push({ key, value });
  }
  return attributes;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      cartId?: unknown;
      attributes?: unknown;
    };

    const cartId = typeof body.cartId === 'string' ? body.cartId : '';
    const attributes = parseAttributes(body.attributes);

    if (!cartId.startsWith('gid://shopify/Cart/')) {
      return NextResponse.json({ message: 'Invalid cartId' }, { status: 400 });
    }
    if (!attributes) {
      return NextResponse.json({ message: 'Invalid attributes' }, { status: 400 });
    }

    const response = await shopifyFetch<CartAttributesUpdateResponse>({
      query: UPDATE_CART_ATTRIBUTES,
      variables: { cartId, attributes },
      cache: 'no-store',
    });

    const { cart, userErrors } = response.cartAttributesUpdate;
    if (userErrors.length > 0) {
      return NextResponse.json(
        { message: userErrors.map((e) => e.message).join(', '), userErrors },
        { status: 422 }
      );
    }

    return NextResponse.json({ cart, userErrors: [] });
  } catch (error) {
    console.error('[api/cart/attributes]', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update cart attributes' },
      { status: 500 }
    );
  }
}
