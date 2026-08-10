'use client';

import Link from 'next/link';
import {
  SHIPPING_ESTIMATE_CHECKOUT_NOTE,
  WHY_MULTIPLE_RATES_BODY,
  whyMultipleRatesTitle,
} from '@/lib/shipping/messaging';
import { formatShippingMoney } from '@/components/cart/format-shipping-money';
import type { ParcelEstimateRow } from '@/components/cart/useCartParcelEstimate';

type Props = {
  parcels: ParcelEstimateRow[];
  parcelCount: number;
  totalShippingEstimate: number | null;
};

export function CartShippingSummary({ parcels, parcelCount, totalShippingEstimate }: Props) {
  const multi = parcelCount > 1;

  return (
    <div className="space-y-3 text-sm text-gray-600">
      <div>
        <p className="mb-2 font-medium text-gray-900">Shipping</p>
        {parcels.length === 0 ? (
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="font-medium text-gray-700">Calculated at checkout</span>
          </div>
        ) : (
          <div className="space-y-1">
            {parcels.map((p) => (
              <div key={p.index} className="flex justify-between gap-2">
                <span>
                  Parcel {p.index} — {p.locationLabel}
                </span>
                <span className="font-medium text-gray-900">
                  {formatShippingMoney(p.shippingEstimate)}
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t border-gray-100 pt-2 font-semibold text-gray-900">
              <span>Total shipping</span>
              <span>{formatShippingMoney(totalShippingEstimate)}</span>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">{SHIPPING_ESTIMATE_CHECKOUT_NOTE}</p>
      {multi && (
        <details className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          <summary className="cursor-pointer font-semibold text-gray-900">
            {whyMultipleRatesTitle(parcelCount)}
          </summary>
          <div className="mt-2 space-y-2 leading-relaxed">
            {WHY_MULTIPLE_RATES_BODY.map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
            <p>
              <Link href="/shipping-delivery" className="font-medium text-action hover:underline">
                Read our full shipping policy →
              </Link>
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
