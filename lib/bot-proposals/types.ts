export type FaqItem = { question: string; answer: string };

export type FieldValue = string | string[] | FaqItem[] | null;

export type ContentFields = Record<string, FieldValue>;

export type TargetType = 'category' | 'brand' | 'product' | 'none';

export type ProposalTarget = { type: TargetType; key: string | null };

export type ProposalStatus =
  | 'pending'
  | 'applying'
  | 'applied'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'reverted'
  | 'superseded';

export type ProposalSummary = {
  id: number;
  reportDate: string;
  bot: string;
  kind: string;
  pagePath: string;
  targetQuery: string;
  changeType: string;
  title: string;
  priorityScore: number | null;
  status: ProposalStatus;
  createdAt: string;
};

export type ProposalDetail = ProposalSummary & {
  recommendation: string;
  rationale: string;
  korayRules: string[];
  evidence: Record<string, unknown>;
  proposedContent: ContentFields | null;
  appliedResult: AppliedResult | null;
  approvedAt: string | null;
  appliedAt: string | null;
};

export type AppliedResult = {
  target: ProposalTarget;
  applied: ContentFields;
  previous: ContentFields;
  previousFlags?: Record<string, boolean>;
  rowExisted?: boolean;
  revertedAt?: string;
  note?: string;
  error?: string;
};

export const COPY_FIELDS = [
  'h1_title',
  'meta_title',
  'meta_description',
  'short_description',
  'long_description',
  'faq_items',
] as const;

/** Product copy field → the override flag that makes it render on the PDP. */
export const PRODUCT_FIELD_FLAGS = {
  title_override: 'use_headless_title',
  meta_title: 'use_headless_meta_title',
  meta_description: 'use_headless_meta_description',
  description_html: 'use_headless_description',
  bullet_points: 'use_headless_bullets',
  top_description_html: 'use_headless_top_description',
  bottom_description_html: 'use_headless_bottom_description',
} as const;

export function editableFields(type: TargetType): readonly string[] {
  if (type === 'product') return Object.keys(PRODUCT_FIELD_FLAGS);
  if (type === 'category' || type === 'brand') return COPY_FIELDS;
  return [];
}
