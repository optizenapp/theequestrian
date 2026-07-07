'use client';

import { BnplMessaging } from '@/components/product/BnplMessaging';

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
  return (
    <BnplMessaging
      pageType="product"
      amount={priceNum}
      currencyCode={currencyCode}
      sku={sku}
      className="mt-3"
    />
  );
}
