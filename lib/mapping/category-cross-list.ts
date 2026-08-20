/**
 * Dual-list products onto a sibling PLP without a second allocation row.
 * Kindly Tail supplements are dog + cat; primary allocation stays on one leaf.
 */

export type CategoryCrossListRule = {
  /** PLP path being queried */
  path: string;
  /** Also include products allocated to this path */
  alsoIncludeFrom: string;
  /** Optional brand filter (case-insensitive) */
  brandEquals?: string;
};

const RULES: CategoryCrossListRule[] = [
  {
    path: '/pet/dog/supplements',
    alsoIncludeFrom: '/pet/cat/supplements',
    brandEquals: 'Kindly Tail',
  },
  {
    path: '/pet/cat/supplements',
    alsoIncludeFrom: '/pet/dog/supplements',
    brandEquals: 'Kindly Tail',
  },
];

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/') ? withSlash.slice(0, -1) : withSlash;
}

export function getCategoryCrossListRules(categoryPath: string): CategoryCrossListRule[] {
  const normalized = normalizePath(categoryPath);
  return RULES.filter((rule) => rule.path === normalized);
}
