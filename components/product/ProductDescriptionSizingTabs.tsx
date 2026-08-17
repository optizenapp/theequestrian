import { ProductDescription } from '@/components/product/ProductDescription';
import { BrandSizingPanel } from '@/components/sizing/BrandSizingPanel';
import { DescriptionSizingTabs } from '@/components/sizing/DescriptionSizingTabs';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';

interface ProductDescriptionSizingTabsProps {
  descriptionHtml: string;
  productTitle: string;
  sizing: ResolvedBrandSizing;
  accentBorder?: boolean;
  fillHeight?: boolean;
  collapsedHeight?: number;
  className?: string;
}

/** Server-friendly wrapper: description + brand sizing tabs for PDPs. */
export function ProductDescriptionSizingTabs({
  descriptionHtml,
  productTitle,
  sizing,
  accentBorder = false,
  fillHeight = false,
  collapsedHeight = 220,
  className = '',
}: ProductDescriptionSizingTabsProps) {
  return (
    <DescriptionSizingTabs
      className={className}
      description={
        <ProductDescription
          html={descriptionHtml}
          productTitle={productTitle}
          bare
          accentBorder={accentBorder}
          fillHeight={fillHeight}
          collapsedHeight={collapsedHeight}
        />
      }
      sizing={<BrandSizingPanel sizing={sizing} />}
    />
  );
}
