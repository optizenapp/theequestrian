import type { ProductIdentifiers } from '@/lib/products/product-identifiers';

interface ProductIdentifierMetaRowProps {
  identifiers: ProductIdentifiers;
}

export default function ProductIdentifierMetaRow({ identifiers }: ProductIdentifierMetaRowProps) {
  const values = [
    { label: 'Model', value: identifiers.model },
    { label: 'UPC', value: identifiers.upc },
    { label: 'SKU', value: identifiers.sku },
  ].filter((item) => item.value);

  if (values.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
      {values.map((item) => (
        <span key={item.label} className="whitespace-nowrap">
          <span className="uppercase">{item.label}:</span> {item.value}
        </span>
      ))}
    </div>
  );
}
