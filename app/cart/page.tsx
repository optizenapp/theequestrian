import { Metadata } from 'next';
import { CartPageContent } from '@/components/cart/CartPageContent';
import { getSmartCartRecommendations } from '@/lib/shopify/products';
import { getCanonicalHrefByHandles } from '@/lib/shopify/product-href';
import { getCartCookie, getCart } from '@/app/actions/cart';
import { resolveCartUpsells } from '@/lib/cart-upsells/resolve';
import { cartUpsellFromShopifyProduct } from '@/lib/cart-upsells/from-shopify-product';
import type { CartUpsellProduct } from '@/lib/cart-upsells/types';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: { absolute: 'Shopping Cart | The Equestrian' },
  description: 'Review your shopping cart',
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';
export const preferredRegion = 'syd1';

export default async function CartPage() {
  let cartId = await getCartCookie();

  if (!cartId) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[CartPage] Available cookies:', allCookies.map((c) => c.name));
  }

  let upsellProducts: CartUpsellProduct[] = [];
  let upsellHeadline = 'Want These In Your Cart Too?';
  let cartForHrefs: Awaited<ReturnType<typeof getCart>> = null;

  if (cartId) {
    try {
      const cart = await getCart(cartId);
      cartForHrefs = cart;

      if (cart && cart.lines.edges.length > 0) {
        const cartItems = cart.lines.edges
          .map(({ node: line }) => {
            const product = line.merchandise.product;
            return {
              handle: product?.handle || '',
              productType: product?.productType || '',
              vendor: product?.vendor || '',
              price: parseFloat(line.merchandise.price.amount),
            };
          })
          .filter((item) => item.handle);

        const curated = await resolveCartUpsells(cartItems, 3);
        if (curated.source === 'curated' && curated.products.length > 0) {
          upsellProducts = curated.products;
          upsellHeadline = curated.headline || upsellHeadline;
        } else {
          const recommended = await getSmartCartRecommendations(cartItems, 4);
          upsellProducts = recommended.map(cartUpsellFromShopifyProduct);
        }
      }
    } catch (error) {
      console.error('[CartPage] Error fetching cart or upsells:', error);
    }
  }

  if (upsellProducts.length === 0) {
    const recommended = await getSmartCartRecommendations([], 4);
    upsellProducts = recommended.map(cartUpsellFromShopifyProduct);
  }

  const hrefHandles = new Set<string>();
  for (const p of upsellProducts) hrefHandles.add(p.handle);
  for (const { node: line } of cartForHrefs?.lines.edges ?? []) {
    const h = line.merchandise.product?.handle;
    if (h) hrefHandles.add(h);
  }
  const productHrefByHandle = await getCanonicalHrefByHandles([...hrefHandles]);

  return (
    <CartPageContent
      upsellProducts={upsellProducts}
      upsellHeadline={upsellHeadline}
      productHrefByHandle={productHrefByHandle}
    />
  );
}