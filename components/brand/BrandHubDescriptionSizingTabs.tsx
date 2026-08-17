import { CollectionDescription } from '@/components/CollectionDescription';
import { BrandSizingPanel } from '@/components/sizing/BrandSizingPanel';
import { DescriptionSizingTabs } from '@/components/sizing/DescriptionSizingTabs';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';
import { resolvedSizingHasContent } from '@/lib/sizing/types';

interface BrandHubDescriptionSizingTabsProps {
  shortDescription: string;
  longDescription: string;
  sizing: ResolvedBrandSizing;
}

/** Description + sizing tabs for brand hub hero / editorial content. */
export function BrandHubDescriptionSizingTabs({
  shortDescription,
  longDescription,
  sizing,
}: BrandHubDescriptionSizingTabsProps) {
  const description = (
    <div className="space-y-6">
      <CollectionDescription description={shortDescription} />
      {longDescription ? (
        <div
          className="rich-content"
          dangerouslySetInnerHTML={{ __html: longDescription }}
        />
      ) : null}
    </div>
  );

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
