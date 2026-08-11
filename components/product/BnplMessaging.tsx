'use client';

/**
 * Afterpay + Zip on-site messaging (product + cart).
 * Scripts load only when the widget is near the viewport (or on first interaction).
 *
 * Env:
 *   NEXT_PUBLIC_AFTERPAY_MP_ID
 *   NEXT_PUBLIC_AFTERPAY_PLACEMENT_ID        — product PDP
 *   NEXT_PUBLIC_AFTERPAY_CART_PLACEMENT_ID   — cart drawer / cart page
 *   NEXT_PUBLIC_ZIP_MERCHANT_KEY
 */
import Script from 'next/script';
import { useDeferredBnplLoad, useZipAltFix } from '@/components/product/bnpl-defer';

const AFTERPAY_SCRIPT = 'https://js.squarecdn.com/square-marketplace.js';
const ZIP_SCRIPT = 'https://static.zip.co/lib/js/zm-widget-js/dist/zip-widget.min.js';

const afterpayMpId = process.env.NEXT_PUBLIC_AFTERPAY_MP_ID?.trim();
const afterpayProductPlacementId = process.env.NEXT_PUBLIC_AFTERPAY_PLACEMENT_ID?.trim();
const afterpayCartPlacementId = process.env.NEXT_PUBLIC_AFTERPAY_CART_PLACEMENT_ID?.trim();
const zipMerchantKey = process.env.NEXT_PUBLIC_ZIP_MERCHANT_KEY?.trim();

export type BnplPageType = 'product' | 'cart';

interface BnplMessagingProps {
  pageType: BnplPageType;
  amount: number;
  currencyCode?: string;
  sku?: string | null;
  className?: string;
}

function afterpayPlacementId(pageType: BnplPageType): string | undefined {
  return pageType === 'cart' ? afterpayCartPlacementId : afterpayProductPlacementId;
}

export function BnplMessaging({
  pageType,
  amount,
  currencyCode = 'AUD',
  sku,
  className = '',
}: BnplMessagingProps) {
  const placementId = afterpayPlacementId(pageType);
  const showAfterpay = Boolean(afterpayMpId && placementId);
  const showZip = Boolean(zipMerchantKey);
  const enabled = showAfterpay || showZip;
  const { hostRef, shouldLoad } = useDeferredBnplLoad(enabled);

  const amountStr = amount.toFixed(2);
  const zipId = pageType === 'cart' ? 'zip-cart-widget' : 'zip-product-widget';
  useZipAltFix(shouldLoad && showZip, zipId);

  if (!enabled) return null;

  return (
    <div
      ref={hostRef}
      className={`space-y-2 text-sm text-gray-600 ${className}`.trim()}
      aria-label="Buy now pay later options"
    >
      {shouldLoad && showAfterpay ? (
        <>
          <Script src={AFTERPAY_SCRIPT} strategy="afterInteractive" />
          <square-placement
            key={`afterpay-${pageType}-${amountStr}`}
            data-mpid={afterpayMpId}
            data-placement-id={placementId}
            data-page-type={pageType}
            data-amount={amountStr}
            data-currency={currencyCode}
            data-consumer-locale="en_AU"
            data-item-skus={sku?.trim() || ''}
            data-is-eligible="true"
          />
        </>
      ) : null}
      {shouldLoad && showZip ? (
        <>
          <Script src={ZIP_SCRIPT} strategy="afterInteractive" />
          <div
            key={`zip-${pageType}-${amountStr}`}
            id={zipId}
            data-zm-widget="popup"
            data-zm-region="au"
            data-env="production"
            data-zm-merchant={zipMerchantKey}
            data-zm-price={amountStr}
            data-zm-asset="productwidget"
            data-zm-popup-asset="termsdialog"
          />
        </>
      ) : null}
      {!shouldLoad ? (
        <div className="h-6 w-40 animate-pulse rounded bg-gray-100" aria-hidden="true" />
      ) : null}
    </div>
  );
}
