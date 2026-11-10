import { shopifyFetch } from '@/lib/shopify/client';

type BuyerIdentityResponse = {
  cartBuyerIdentityUpdate: {
    cart: { id: string } | null;
    userErrors: Array<{ field: string[] | null; message: string }>;
  };
};

const ATTACH_CUSTOMER_TO_CART = `
  mutation AttachCustomerToCart($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart { id }
      userErrors { field message }
    }
  }
`;

/** Signs the rider into Shopify checkout for this cart; the cart itself is unchanged. */
export async function attachCustomerToCart(cartId: string, customerAccessToken: string): Promise<boolean> {
  try {
    const data = await shopifyFetch<BuyerIdentityResponse>({
      query: ATTACH_CUSTOMER_TO_CART,
      variables: { cartId, buyerIdentity: { customerAccessToken } },
      cache: 'no-store',
    });
    const { userErrors } = data.cartBuyerIdentityUpdate;
    if (userErrors.length > 0) {
      console.error('[customer-account] Cart buyer identity errors:', userErrors.map((e) => e.message));
      return false;
    }
    return true;
  } catch (error) {
    console.error('[customer-account] Failed to attach customer to cart:', error);
    return false;
  }
}
