import { Metadata } from 'next';
import { CartPageContent } from '@/components/cart/CartPageContent';

export const metadata: Metadata = {
  title: 'Shopping Cart | The Equestrian',
  description: 'Review your shopping cart',
};

export default function CartPage() {
  return <CartPageContent />;
}

