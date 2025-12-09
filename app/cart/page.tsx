import { Metadata } from 'next';
import { CartPageContent } from '@/components/cart/CartPageContent';
import { getRecommendedProducts } from '@/lib/shopify/products';

export const metadata: Metadata = {
  title: 'Shopping Cart | The Equestrian',
  description: 'Review your shopping cart',
};

export default async function CartPage() {
  const recommendedProducts = await getRecommendedProducts(4);

  return <CartPageContent recommendedProducts={recommendedProducts} />;
}



