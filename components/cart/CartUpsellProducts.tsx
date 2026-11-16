'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { CartUpsellQuickView } from '@/components/cart/CartUpsellQuickView';
import type { CartUpsellProduct } from '@/lib/cart-upsells/types';

type Props = {
  products: CartUpsellProduct[];
  headline?: string;
  productHrefByHandle?: Record<string, string>;
  /** Compact layout for the drawer */
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function CartUpsellProducts({
  products,
  headline = 'Complete your order',
  compact = false,
  className = '',
}: Props) {
  const { cart, addCartItem } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [quickViewHandle, setQuickViewHandle] = useState<string | null>(null);

  const inCart = new Set(
    cart?.lines.edges
      .map(({ node }) => node.merchandise.product?.handle?.toLowerCase())
      .filter((h): h is string => Boolean(h)) ?? []
  );

  const visible = products.filter((p) => !inCart.has(p.handle.toLowerCase()) && p.firstVariantId);
  if (visible.length === 0 && !quickViewHandle) return null;

  const handleAdd = async (product: CartUpsellProduct) => {
    if (!product.firstVariantId) return;
    setAddingId(product.id);
    try {
      await addCartItem(product.firstVariantId, 1);
    } catch (err) {
      console.error('[CartUpsellProducts] add failed', err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className={className}>
      {visible.length > 0 ? (
        <>
          <h2
            className={
              compact
                ? 'mb-3 text-sm font-semibold text-gray-900'
                : 'mb-6 text-xl font-bold text-gray-900'
            }
          >
            {headline}
          </h2>
          <div className={compact ? 'space-y-3' : 'grid grid-cols-1 gap-4 sm:grid-cols-3'}>
            {visible.map((product) => {
              const price = parseFloat(product.priceAmount);
              return (
                <div
                  key={product.id}
                  className={
                    compact
                      ? 'flex gap-3 rounded-xl border border-gray-100 bg-white p-2'
                      : 'flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-4 hover:shadow-md'
                  }
                >
                  <button
                    type="button"
                    onClick={() => setQuickViewHandle(product.handle)}
                    className={
                      compact
                        ? 'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-50'
                        : 'relative mb-4 aspect-square w-full overflow-hidden rounded-xl bg-gray-50 text-left'
                    }
                    aria-label={`Preview ${product.title}`}
                  >
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.imageAlt || product.title}
                        fill
                        className="object-cover"
                        sizes={compact ? '64px' : '(max-width: 640px) 100vw, 33vw'}
                      />
                    ) : null}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <button
                      type="button"
                      onClick={() => setQuickViewHandle(product.handle)}
                      className={`line-clamp-2 text-left font-semibold text-gray-900 hover:underline ${
                        compact ? 'text-xs' : 'mb-1 text-sm'
                      }`}
                    >
                      {product.title}
                    </button>
                    {compact ? (
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold">
                          ${Number.isFinite(price) ? price.toFixed(2) : product.priceAmount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickViewHandle(product.handle)}
                          className="rounded-full bg-action px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-action-hover"
                        >
                          View
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="mt-2 text-sm font-bold">
                          ${Number.isFinite(price) ? price.toFixed(2) : product.priceAmount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuickViewHandle(product.handle)}
                          className="mt-3 w-full rounded-full border border-gray-300 bg-white py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleAdd(product)}
                          disabled={addingId === product.id}
                          className="mt-2 w-full rounded-full bg-action py-2 text-sm font-semibold text-white hover:bg-action-hover disabled:opacity-50"
                        >
                          {addingId === product.id ? 'Adding…' : 'Quick add'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      <CartUpsellQuickView
        handle={quickViewHandle}
        onClose={() => setQuickViewHandle(null)}
      />
    </div>
  );
}