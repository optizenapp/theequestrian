import { Metadata } from 'next';
import { CartPageContent } from '@/components/cart/CartPageContent';
import { getSmartCartRecommendations } from '@/lib/shopify/products';
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
  
  if (cartId) {
    try {
      // Fetch cart data from Shopify
      const cart = await getCart(cartId);
      
      if (cart && cart.lines.edges.length > 0) {
        // Extract product information from cart items
        const cartItems = cart.lines.edges.map(({ node: line }) => {
          const product = line.merchandise.product;
          return {
            handle: product?.handle || '',
            productType: product?.productType || '',
            vendor: product?.vendor || '',
            price: parseFloat(line.merchandise.price.amount),
          };
        }).filter(item => item.handle); // Filter out any invalid items
        
        console.log(`[CartPage] Fetching smart recommendations for ${cartItems.length} cart items`);
        
        // Get smart recommendations based on cart contents
        recommendedProducts = await getSmartCartRecommendations(cartItems, 4);
      }
    } catch (error) {
      console.error('[CartPage] Error fetching cart or recommendations:', error);
    }
  }
  
  // If no cart or error, getSmartCartRecommendations will return generic recommendations
  // when called with empty array
  if (recommendedProducts.length === 0) {
    console.log('[CartPage] No cart found, using generic recommendations');
    recommendedProducts = await getSmartCartRecommendations([], 4);
  }

  return <CartPageContent recommendedProducts={recommendedProducts} />;
}



