import type { PageSEOContent } from '../run-page-seo-update';

export interface FrameworkAnchor {
  text: string;
  href: string;
}

export interface SubcollectionFrameworkNotes {
  centralEntity: string;
  primaryAngle: string;
  informationGain: string[];
  closestSibling: string;
  overlapSplit: string;
  verifyBeforePublishing: string[];
  anchors: FrameworkAnchor[];
  inboundTally: Record<string, number>;
}

export interface SubcollectionPageModule {
  default: PageSEOContent;
  frameworkNotes: SubcollectionFrameworkNotes;
}
