import type { SlideVariant } from './video-render-types';

export type SlideCopy = {
  s1: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  s2: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta: string;
    linkText: string;
  };
  s3: {
    eyebrow: string;
    title: string;
  };
  s4: {
    eyebrow: string;
    title: string;
    cta: string;
  };
};

export type SlideCopyContext = {
  variant: SlideVariant;
  subjectLine: string;
  displayName: string;
  aboutText: string;
  categoryHandle: string | null;
  ctaUrl: string;
  productTitles?: string[];
};

export type CopyBuildResult = {
  copy: SlideCopy;
  source: 'llm' | 'fallback' | 'override';
  rejectionReason?: string;
};

