'use client';

/**
 * Afterpay + Zip on-site messaging (product + cart).
 *
 * Env:
 *   NEXT_PUBLIC_AFTERPAY_MP_ID
 *   NEXT_PUBLIC_AFTERPAY_PLACEMENT_ID        — product PDP
 *   NEXT_PUBLIC_AFTERPAY_CART_PLACEMENT_ID   — cart drawer / cart page
 *   NEXT_PUBLIC_ZIP_MERCHANT_KEY
 */
import Script from 'next/script';

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

  if (!showAfterpay && !showZip) return null;

  const amountStr = amount.toFixed(2);
  const zipId = pageType === 'cart' ? 'zip-cart-widget' : 'zip-product-widget';

  return (
    <div className={`space-y-2 text-sm text-gray-600 ${className}`.trim()}>
      {showAfterpay ? (
        <>
          <Script src={AFTERPAY_SCRIPT} strategy="lazyOnload" />
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
      {showZip ? (
        <>
          <Script src={ZIP_SCRIPT} strategy="lazyOnload" />
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
    </div>
  );
}
