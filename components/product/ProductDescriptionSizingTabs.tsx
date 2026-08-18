import { ProductDescription } from '@/components/product/ProductDescription';
import { ProductSpecificationsList } from '@/components/product/ProductSpecificationsList';
import { BrandSizingPanel } from '@/components/sizing/BrandSizingPanel';
import { DescriptionSizingTabs } from '@/components/sizing/DescriptionSizingTabs';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';
import { resolvedSizingHasContent } from '@/lib/sizing/types';

interface ProductDescriptionSizingTabsProps {
  descriptionHtml: string;
  productTitle: string;
  sizing: ResolvedBrandSizing;
  specifications?: string[];
  accentBorder?: boolean;
  fillHeight?: boolean;
  collapsedHeight?: number;
  className?: string;
}

/** Server-friendly wrapper: description + sizing + specifications tabs for PDPs. */
export function ProductDescriptionSizingTabs({
  descriptionHtml,
  productTitle,
  sizing,
  specifications = [],
  accentBorder = false,
  fillHeight = false,
  collapsedHeight = 220,
  className = '',
}: ProductDescriptionSizingTabsProps) {
  const description = (
    <ProductDescription
      html={descriptionHtml}
      productTitle={productTitle}
      bare
      accentBorder={accentBorder}
      fillHeight={fillHeight}
      collapsedHeight={collapsedHeight}
    />
  );

  const specItems = specifications.map((item) => item.trim()).filter(Boolean);
  const specPanel =
    specItems.length > 0 ? <ProductSpecificationsList items={specItems} /> : null;
  const hasSizing = resolvedSizingHasContent(sizing);
  const fillClass = fillHeight ? 'flex h-full min-h-0 flex-col' : '';

  if (!hasSizing && !specPanel) {
    return (
      <div
        className={[
          'bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6 sm:p-8',
          fillClass,
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {description}
      </div>
    );
  }

  return (
    <DescriptionSizingTabs
      className={[fillClass, className].filter(Boolean).join(' ')}
      description={description}
      sizing={hasSizing ? <BrandSizingPanel sizing={sizing} /> : undefined}
      specifications={specPanel ?? undefined}
    />
  );
}
