'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { CartUpsellProducts } from '@/components/cart/CartUpsellProducts';
import type { CartUpsellProduct, CartUpsellResolveResult } from '@/lib/cart-upsells/types';

type ApiResponse = CartUpsellResolveResult & {
  productHrefByHandle?: Record<string, string>;
};

export function CartDrawerUpsells() {
  const { cart, isOpen, closeCart } = useCart();
  const [products, setProducts] = useState<CartUpsellProduct[]>([]);
  const [headline, setHeadline] = useState('Complete your order');
  const [hrefs, setHrefs] = useState<Record<string, string>>({});

  const itemsKey = useMemo(() => {
    if (!cart?.lines.edges.length) return '';
    return cart.lines.edges
      .map(({ node }) => {
        const p = node.merchandise.product;
        return [
          p?.handle ?? '',
          p?.productType ?? '',
          p?.vendor ?? '',
          node.merchandise.price.amount,
        ].join(':');
      })
      .sort()
      .join('|');
  }, [cart?.lines.edges]);

  useEffect(() => {
    if (!isOpen || !itemsKey) {
      setProducts([]);
      return;
    }
    const items = cart!.lines.edges
      .map(({ node }) => {
        const p = node.merchandise.product;
        return {
          handle: p?.handle || '',
          productType: p?.productType || '',
          vendor: p?.vendor || '',
          price: parseFloat(node.merchandise.price.amount),
        };
      })
      .filter((i) => i.handle);

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/cart/upsells', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, limit: 3 }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as ApiResponse;
        if (data.source !== 'curated' || !data.products?.length) {
          setProducts([]);
          return;
        }
        setProducts(data.products);
        setHeadline(data.headline || 'Complete your order');
        setHrefs(data.productHrefByHandle ?? {});
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('[CartDrawerUpsells]', e);
        }
      }
    })();
    return () => controller.abort();
  }, [isOpen, itemsKey, cart]);

  if (!products.length) return null;

  return (
    <CartUpsellProducts
      products={products}
      headline={headline}
      productHrefByHandle={hrefs}
      compact
      onNavigate={closeCart}
      className="mt-4 border-t border-gray-100 pt-4"
    />
  );
}