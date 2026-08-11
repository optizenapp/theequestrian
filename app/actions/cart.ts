'use server';

import { cookies } from 'next/headers';
import { shopifyFetch } from '@/lib/shopify/client';
import {
  CREATE_CART,
  ADD_TO_CART,
  UPDATE_CART,
  REMOVE_FROM_CART,
  GET_CART,
  UPDATE_CART_ATTRIBUTES,
} from '@/lib/shopify/queries';
import { ShopifyCart } from '@/types/shopify';

const CART_COOKIE_NAME = 'shopify_cart_id';
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

/** Cart is per-session and must never be served from the GraphQL data cache. */
const CART_FETCH_OPTIONS = { cache: 'no-store' as const };

interface CartResponse {
  cart: ShopifyCart;
}

interface CartCreateResponse {
  cartCreate: CartResponse;
}

interface CartLinesAddResponse {
  cartLinesAdd: CartResponse;
}

interface CartLinesUpdateResponse {
  cartLinesUpdate: CartResponse;
}

interface CartLinesRemoveResponse {
  cartLinesRemove: CartResponse;
}

interface GetCartResponse {
  cart: ShopifyCart | null;
}

interface CartAttributesUpdateResponse {
  cartAttributesUpdate: {
    cart: Pick<ShopifyCart, 'id' | 'checkoutUrl' | 'attributes'>;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
}

/**
 * Set cart ID in cookies for server-side access
 * This allows server components to access the cart ID
 */
export async function setCartCookie(cartId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CART_COOKIE_NAME, cartId, {
    maxAge: CART_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

/**
 * Get cart ID from cookies
 * Used by server components to retrieve cart data
 */
export async function getCartCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE_NAME)?.value;
}

/**
 * Remove cart ID from cookies
 */
export async function removeCartCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(CART_COOKIE_NAME);
}

export async function createCart(
  lineItems?: Array<{ merchandiseId: string; quantity: number }>,
  attributes?: Array<{ key: string; value: string }>
) {
  try {
    const response = await shopifyFetch<CartCreateResponse>({
      query: CREATE_CART,
      variables: {
        lineItems: lineItems || [],
        attributes: attributes || [],
      },
      ...CART_FETCH_OPTIONS,
    });

    const cart = response.cartCreate.cart;
    
    // Set cart ID in cookie for server-side access
    await setCartCookie(cart.id);
    
    return cart;
  } catch (error) {
    console.error('Error creating cart:', error);
    throw new Error('Failed to create cart');
  }
}

export async function addToCart(cartId: string, lines: Array<{ merchandiseId: string; quantity: number }>) {
  try {
    const response = await shopifyFetch<CartLinesAddResponse>({
      query: ADD_TO_CART,
      variables: {
        cartId,
        lines,
      },
      ...CART_FETCH_OPTIONS,
    });

    const cart = response.cartLinesAdd.cart;
    
    // Update cart ID in cookie
    await setCartCookie(cart.id);
    
    return cart;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw new Error('Failed to add item to cart');
  }
}

export async function updateCart(cartId: string, lines: Array<{ id: string; quantity: number }>) {
  try {
    const response = await shopifyFetch<CartLinesUpdateResponse>({
      query: UPDATE_CART,
      variables: {
        cartId,
        lines,
      },
      ...CART_FETCH_OPTIONS,
    });

    return response.cartLinesUpdate.cart;
  } catch (error) {
    console.error('Error updating cart:', error);
    throw new Error('Failed to update cart');
  }
}

export async function removeFromCart(cartId: string, lineIds: string[]) {
  try {
    const response = await shopifyFetch<CartLinesRemoveResponse>({
      query: REMOVE_FROM_CART,
      variables: {
        cartId,
        lineIds,
      },
      ...CART_FETCH_OPTIONS,
    });

    return response.cartLinesRemove.cart;
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw new Error('Failed to remove item from cart');
  }
}

export async function updateCartAttributes(cartId: string, sdAttr: string) {
  try {
    const response = await shopifyFetch<CartAttributesUpdateResponse>({
      query: UPDATE_CART_ATTRIBUTES,
      variables: {
        cartId,
        attributes: [{ key: '_sd_attr', value: sdAttr }],
      },
      ...CART_FETCH_OPTIONS,
    });

    const { cart, userErrors } = response.cartAttributesUpdate;
    if (userErrors.length > 0) {
      console.error('Cart attribute update errors:', userErrors);
      throw new Error(userErrors.map((e) => e.message).join(', '));
    }

    return cart;
  } catch (error) {
    console.error('Error updating cart attributes:', error);
    throw new Error('Failed to update cart attributes');
  }
}

export async function getCart(cartId: string) {
  try {
    const response = await shopifyFetch<GetCartResponse>({
      query: GET_CART,
      variables: {
        cartId,
      },
      ...CART_FETCH_OPTIONS,
    });

    return response.cart;
  } catch (error) {
    console.error('Error fetching cart:', error);
    return null;
  }
}











