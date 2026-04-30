export function getSlideCopyOverride(metadata: Record<string, unknown> | null | undefined): unknown | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const raw = (metadata as Record<string, unknown>).slideCopyOverride;
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}
