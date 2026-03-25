import { Metadata } from 'next';
import { CartPageContent } from '@/components/cart/CartPageContent';
import { getSmartCartRecommendations } from '@/lib/shopify/products';
import { getCanonicalHrefByHandles } from '@/lib/shopify/product-href';
import { getCartCookie, getCart } from '@/app/actions/cart';
import { ShopifyProduct } from '@/types/shopify';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Shopping Cart | The Equestrian',
  description: 'Review your shopping cart',
};

// Make this page dynamic so it always fetches fresh cart data
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  // Try to get cart ID from cookies (server-side access)
  let cartId = await getCartCookie();
  
  // Fallback: If no cookie, check if there's a cart ID in the request
  // (This helps during development/initial setup)
  if (!cartId) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[CartPage] Available cookies:', allCookies.map(c => c.name));
  }
  
  let recommendedProducts: ShopifyProduct[] = [];
  let cartForHrefs: Awaited<ReturnType<typeof getCart>> = null;

  if (cartId) {
    try {
      const cart = await getCart(cartId);
      cartForHrefs = cart;

      if (cart && cart.lines.edges.length > 0) {
        const cartItems = cart.lines.edges.map(({ node: line }) => {
          const product = line.merchandise.product;
          return {
            handle: product?.handle || '',
            productType: product?.productType || '',
            vendor: product?.vendor || '',
            price: parseFloat(line.merchandise.price.amount),
          };
        }).filter((item) => item.handle);

        console.log(`[CartPage] Fetching smart recommendations for ${cartItems.length} cart items`);
        recommendedProducts = await getSmartCartRecommendations(cartItems, 4);
      }
    } catch (error) {
      console.error('[CartPage] Error fetching cart or recommendations:', error);
    }
  }

  if (recommendedProducts.length === 0) {
    console.log('[CartPage] No cart found, using generic recommendations');
    recommendedProducts = await getSmartCartRecommendations([], 4);
  }

  const hrefHandles = new Set<string>();
  for (const p of recommendedProducts) {
    hrefHandles.add(p.handle);
  }
  for (const { node: line } of cartForHrefs?.lines.edges ?? []) {
    const h = line.merchandise.product?.handle;
    if (h) hrefHandles.add(h);
  }
  const productHrefByHandle = await getCanonicalHrefByHandles([...hrefHandles]);

  return (
    <CartPageContent
      recommendedProducts={recommendedProducts}
      productHrefByHandle={productHrefByHandle}
    />
  );
}



