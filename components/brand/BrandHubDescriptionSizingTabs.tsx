import { CollectionDescription } from '@/components/CollectionDescription';
import { BrandSizingPanel } from '@/components/sizing/BrandSizingPanel';
import { DescriptionSizingTabs } from '@/components/sizing/DescriptionSizingTabs';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';
import { resolvedSizingHasContent } from '@/lib/sizing/types';

interface BrandHubDescriptionSizingTabsProps {
  shortDescription: string;
  sizing: ResolvedBrandSizing;
}

/** Short description (+ sizing tabs) for brand hub hero — long about copy renders below the product grid. */
export function BrandHubDescriptionSizingTabs({
  shortDescription,
  sizing,
}: BrandHubDescriptionSizingTabsProps) {
  const description = <CollectionDescription description={shortDescription} />;

  if (!resolvedSizingHasContent(sizing)) {
    return description;
  }

  return (
    <DescriptionSizingTabs
      description={description}
      sizing={<BrandSizingPanel sizing={sizing} />}
    />
  );
}
