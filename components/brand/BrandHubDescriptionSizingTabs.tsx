import { CollectionDescription } from '@/components/CollectionDescription';
import { BrandSizingPanel } from '@/components/sizing/BrandSizingPanel';
import { DescriptionSizingTabs } from '@/components/sizing/DescriptionSizingTabs';
import type { ResolvedBrandSizing } from '@/lib/sizing/types';

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
  return (
    <DescriptionSizingTabs
      description={
        <div className="space-y-6">
          <CollectionDescription description={shortDescription} />
          {longDescription ? (
            <div
              className="rich-content"
              dangerouslySetInnerHTML={{ __html: longDescription }}
            />
          ) : null}
        </div>
      }
      sizing={<BrandSizingPanel sizing={sizing} />}
    />
  );
}
