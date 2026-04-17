import type { ReactNode } from 'react';
import Link from 'next/link';
import type { ProductIdentifiers } from '@/lib/products/product-identifiers';

interface ProductIdentifierMetaRowProps {
  identifiers: ProductIdentifiers;
}

export default function ProductIdentifierMetaRow({ identifiers }: ProductIdentifierMetaRowProps) {
  const { brand, brandHref, model, upc, sku } = identifiers;
  const nodes: ReactNode[] = [];

  if (brand) {
    nodes.push(
      <span key="Brand" className="whitespace-nowrap">
        <span className="uppercase">Brand:</span>{' '}
        {brandHref ? (
          <Link href={brandHref} className="text-primary underline-offset-2 hover:underline">
            {brand}
          </Link>
        ) : (
          brand
        )}
      </span>
    );
  }
  if (model) {
    nodes.push(
      <span key="Model" className="whitespace-nowrap">
        <span className="uppercase">Model:</span> {model}
      </span>
    );
  }
  if (upc) {
    nodes.push(
      <span key="UPC" className="whitespace-nowrap">
        <span className="uppercase">UPC:</span> {upc}
      </span>
    );
  }
  if (sku) {
    nodes.push(
      <span key="SKU" className="whitespace-nowrap">
        <span className="uppercase">SKU:</span> {sku}
      </span>
    );
  }

  if (nodes.length === 0) return null;

  return <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">{nodes}</div>;
}
