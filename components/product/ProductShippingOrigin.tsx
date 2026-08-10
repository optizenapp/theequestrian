'use client';

import Link from 'next/link';
import type { ProductShippingDisplay } from '@/lib/shipping/product-shipping-display';
import {
  HOW_SHIPPING_WORKS_BODY,
  HOW_SHIPPING_WORKS_SUMMARY,
  shipsFromWarehouseCompact,
  shopWarehouseLabel,
} from '@/lib/shipping/messaging';
import { warehouseHref } from '@/lib/warehouses/registry';

type Props = {
  shippingDisplay: ProductShippingDisplay;
  compact?: boolean;
};

export function ProductShippingOrigin({ shippingDisplay, compact }: Props) {
  const compactLine = shipsFromWarehouseCompact(
    shippingDisplay.shipsFromLabel,
    shippingDisplay.locationMapped
  );
  const shopHref = shippingDisplay.warehouseSlug
    ? warehouseHref(shippingDisplay.warehouseSlug)
    : null;

  if (compact) {
    return (
      <p className="text-sm text-gray-600">
        {compactLine}
        {shopHref && (
          <>
            {' · '}
            <Link href={shopHref} className="font-medium text-action hover:underline">
              Shop this warehouse
            </Link>
          </>
        )}
        {' · '}
        <Link href="/shipping-delivery" className="font-medium text-action hover:underline">
          See how multi-parcel shipping works
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3 text-sm text-gray-700">
        <span className="shrink-0" aria-hidden>
          🚚
        </span>
        <div>
          <p className="font-semibold text-gray-900">{shippingDisplay.originHeadline}</p>
          <p className="text-gray-600">{shippingDisplay.dispatchLine}</p>
          {shopHref && (
            <p className="mt-1">
              <Link href={shopHref} className="font-medium text-action hover:underline">
                {shopWarehouseLabel(shippingDisplay.shipsFromLabel)}
              </Link>
            </p>
          )}
        </div>
      </div>
      <details className="group text-sm">
        <summary className="cursor-pointer list-none font-medium text-action hover:underline [&::-webkit-details-marker]:hidden">
          {HOW_SHIPPING_WORKS_SUMMARY}
        </summary>
        <div className="mt-2 space-y-2 text-gray-600 leading-relaxed">
          {HOW_SHIPPING_WORKS_BODY.map((para) => (
            <p key={para.slice(0, 24)}>{para}</p>
          ))}
          <p>
            <Link href="/shipping-delivery" className="font-medium text-action hover:underline">
              Full shipping details →
            </Link>
          </p>
        </div>
      </details>
    </div>
  );
}
