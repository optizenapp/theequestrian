'use client';

/**
 * BNPL on-site messaging under PDP price.
 *
 * Env (Vercel / .env.local):
 *   NEXT_PUBLIC_AFTERPAY_MP_ID          — Afterpay On-Site Messaging portal → Settings
 *   NEXT_PUBLIC_AFTERPAY_PLACEMENT_ID   — Product page placement ID from portal
 *   NEXT_PUBLIC_ZIP_MERCHANT_KEY        — Zip merchant public key (AU dashboard)
 *
 * Checkout BNPL availability remains handled by Shopify checkout.
 */
import Script from 'next/script';

const AFTERPAY_SCRIPT = 'https://js.afterpay.com/afterpay-1.x.js';
const ZIP_SCRIPT = 'https://static.zip.co/lib/js/zm-widget-js/dist/zip-widget.min.js';

const afterpayMpId = process.env.NEXT_PUBLIC_AFTERPAY_MP_ID?.trim();
const afterpayPlacementId = process.env.NEXT_PUBLIC_AFTERPAY_PLACEMENT_ID?.trim();
const zipMerchantKey = process.env.NEXT_PUBLIC_ZIP_MERCHANT_KEY?.trim();

interface ProductBuyBoxBnplMessagingProps {
  priceNum: number;
  currencyCode: string;
  sku?: string | null;
}

export function ProductBuyBoxBnplMessaging({
  priceNum,
  currencyCode,
  sku,
}: ProductBuyBoxBnplMessagingProps) {
  const showAfterpay = Boolean(afterpayMpId && afterpayPlacementId);
  const showZip = Boolean(zipMerchantKey);

  if (!showAfterpay && !showZip) return null;

  const amount = priceNum.toFixed(2);

  return (
    <div className="mt-3 space-y-2 text-sm text-gray-600">
      {showAfterpay ? (
        <>
          <Script src={AFTERPAY_SCRIPT} strategy="lazyOnload" />
          <square-placement
            key={`afterpay-${amount}`}
            data-mpid={afterpayMpId}
            data-placement-id={afterpayPlacementId}
            data-page-type="product"
            data-amount={amount}
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
            key={`zip-${amount}`}
            id="zip-product-widget"
            data-zm-widget="popup"
            data-zm-region="au"
            data-env="production"
            data-zm-merchant={zipMerchantKey}
            data-zm-price={amount}
            data-zm-asset="productwidget"
            data-zm-popup-asset="termsdialog"
          />
        </>
      ) : null}
    </div>
  );
}
