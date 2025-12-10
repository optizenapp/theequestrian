'use server';

import { shopifyFetch } from '@/lib/shopify/client';
import { CREATE_CART, ADD_TO_CART, UPDATE_CART, REMOVE_FROM_CART, GET_CART } from '@/lib/shopify/queries';
import { ShopifyCart } from '@/types/shopify';

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

export async function createCart(lineItems?: Array<{ merchandiseId: string; quantity: number }>) {
  try {
    const response = await shopifyFetch<CartCreateResponse>({
      query: CREATE_CART,
      variables: {
        lineItems: lineItems || [],
      },
    });

    return response.cartCreate.cart;
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
    });

    return response.cartLinesAdd.cart;
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
    });

    return response.cartLinesRemove.cart;
  } catch (error) {
    console.error('Error removing from cart:', error);
    throw new Error('Failed to remove item from cart');
  }
}

export async function getCart(cartId: string) {
  try {
    const response = await shopifyFetch<GetCartResponse>({
      query: GET_CART,
      variables: {
        cartId,
      },
    });

    return response.cart;
  } catch (error) {
    console.error('Error fetching cart:', error);
    return null;
  }
}




