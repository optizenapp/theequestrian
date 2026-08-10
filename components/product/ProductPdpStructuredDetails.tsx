import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSizingUrl } from '@/lib/sizing/sizing-config';

interface ProductPdpStructuredDetailsProps {
  vendor: string | null | undefined;
  productType: string | null | undefined;
  productTitle: string;
  productHandle: string;
  carePlainText: string | null;
}

function DetailBlock({
  id,
  title,
  children,
  defaultOpen,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="group rounded-xl border border-gray-200 bg-white open:shadow-sm [&_summary::-webkit-details-marker]:hidden"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-gray-900 flex items-center justify-between gap-2 marker:content-none">
        <span>{title}</span>
        <span className="text-gray-400 text-sm group-open:rotate-180 transition-transform" aria-hidden>
          ▼
        </span>
      </summary>
      <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-700" id={id}>
        {children}
      </div>
    </details>
  );
}

export default function ProductPdpStructuredDetails({
  vendor,
  productType,
  productTitle,
  productHandle,
  carePlainText,
}: ProductPdpStructuredDetailsProps) {
  const sizingUrl = getSizingUrl({
    vendor,
    productType,
    title: productTitle,
    handle: productHandle,
  });
  const finalSizingUrl = sizingUrl || '/sizing';
  const sizingLabel = sizingUrl ? 'View sizing guide' : 'View size charts';

  const blocks: ReactNode[] = [];

  const hasKeyFeatures =
    (productType && productType.trim().length > 0) || (vendor && vendor.trim().length > 0);

  if (hasKeyFeatures) {
    blocks.push(
      <DetailBlock key="features" id="pdp-features" title="Key features">
        <ul className="list-none space-y-2 p-0 m-0">
          {productType?.trim() ? (
            <li className="flex gap-2">
              <span className="font-semibold text-gray-900 shrink-0">Type</span>
              <span>{productType}</span>
            </li>
          ) : null}
          {vendor?.trim() ? (
            <li className="flex gap-2">
              <span className="font-semibold text-gray-900 shrink-0">Brand</span>
              <span>{vendor}</span>
            </li>
          ) : null}
        </ul>
      </DetailBlock>
    );
  }

  blocks.push(
    <DetailBlock key="sizing" id="pdp-sizing" title="Sizing & fit" defaultOpen>
      <p className="mb-3">
        Not sure which size to pick? Use our charts to compare foot length and width to the brand&apos;s
        scale.
      </p>
      <Link
        href={finalSizingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex font-semibold text-action hover:text-action-hover"
      >
        {sizingLabel} (opens in new tab)
      </Link>
    </DetailBlock>
  );

  if (carePlainText) {
    blocks.push(
      <DetailBlock key="care" id="pdp-care" title="Care instructions">
        <p className="whitespace-pre-wrap">{carePlainText}</p>
      </DetailBlock>
    );
  }

  blocks.push(
    <DetailBlock key="shipping" id="pdp-shipping" title="Shipping & returns">
      <ul className="list-disc pl-5 space-y-2 m-0">
        <li>
          Each item ships direct from the warehouse that stocks it. Items from different
          warehouses arrive as separate parcels, each with its own shipping rate — itemised
          in your cart before you pay.
        </li>
        <li>
          <Link href="/shipping-delivery" className="text-action font-medium hover:text-action-hover">
            Shipping & delivery
          </Link>{' '}
          — why multi-parcel shipping works this way, delivery times, and tracking.
        </li>
        <li>
          <Link href="/returns-refunds" className="text-action font-medium hover:text-action-hover">
            Returns & refunds
          </Link>{' '}
          — how to start a return if something isn&apos;t right.
        </li>
      </ul>
    </DetailBlock>
  );

  return (
    <section className="space-y-3" aria-label="Product details">
      <h2 className="text-lg font-bold text-gray-900">Product details</h2>
      <div className="space-y-2">{blocks}</div>
    </section>
  );
}
