export type SupportedChannel = 'youtube' | 'instagram' | 'twitter' | 'facebook';

export function parseSupportedChannel(value: string): SupportedChannel | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'youtube') return 'youtube';
  if (normalized === 'instagram') return 'instagram';
  if (normalized === 'twitter') return 'twitter';
  if (normalized === 'facebook') return 'facebook';
  return null;
}
