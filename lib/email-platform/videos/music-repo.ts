import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export type MusicCategory = 'feel-good' | 'upbeat' | 'cinematic' | 'chill';

export const MUSIC_CATEGORIES: MusicCategory[] = ['feel-good', 'upbeat', 'cinematic', 'chill'];

const FALLBACK_ORDER: Record<MusicCategory, MusicCategory[]> = {
  'feel-good': ['feel-good', 'upbeat', 'chill', 'cinematic'],
  upbeat: ['upbeat', 'feel-good', 'cinematic', 'chill'],
  cinematic: ['cinematic', 'upbeat', 'feel-good', 'chill'],
  chill: ['chill', 'feel-good', 'upbeat', 'cinematic'],
};

export type RepoTrack = {
  buffer: Buffer;
  filename: string;
  category: MusicCategory;
  durationHintSeconds: number | null;
};

export type RepoExclusion = {
  filenames?: string[];
};

export function selectMusicCategoryForCampaign(input: {
  createdBy: string | null;
  metadata?: Record<string, unknown> | null;
}): MusicCategory {
  const meta = input.metadata || {};
  if (typeof meta.musicCategory === 'string') {
    const normalized = meta.musicCategory.trim().toLowerCase() as MusicCategory;
    if ((MUSIC_CATEGORIES as string[]).includes(normalized)) return normalized;
  }
  const autoType =
    typeof meta.autoType === 'string' ? meta.autoType.trim().toLowerCase() : '';
  if (autoType === 'on_sale') return 'upbeat';
  if (autoType === 'category') {
    return MUSIC_CATEGORIES[Math.floor(Math.random() * MUSIC_CATEGORIES.length)];
  }
  switch (input.createdBy) {
    case 'auto-weekly':
      return 'upbeat';
    case 'auto-campaign':
      return 'feel-good';
    default:
      return 'feel-good';
  }
}

export async function pickRepoTrack(
  category: MusicCategory,
  exclusion: RepoExclusion = {}
): Promise<RepoTrack | null> {
  const excluded = new Set((exclusion.filenames ?? []).map((f) => f.toLowerCase()));
  const order = FALLBACK_ORDER[category] || MUSIC_CATEGORIES;
  for (const cat of order) {
    const tracks = await listCategoryTracks(cat);
    if (tracks.length === 0) continue;
    const available = tracks.filter((t) => !excluded.has(t.toLowerCase()));
    const pool = available.length > 0 ? available : tracks;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const fullPath = path.join(audioRootDir(), cat, pick);
    try {
      const buffer = await readFile(fullPath);
      if (buffer.length === 0) continue;
      console.log(`[music-repo] picked category=${cat} (requested=${category}) file=${pick} bytes=${buffer.length}`);
      return { buffer, filename: pick, category: cat, durationHintSeconds: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      console.warn(`[music-repo] read failed file=${fullPath}: ${message}`);
    }
  }
  console.warn(`[music-repo] no tracks available across categories starting from=${category}`);
  return null;
}

async function listCategoryTracks(category: MusicCategory): Promise<string[]> {
  const dir = path.join(audioRootDir(), category);
  try {
    await stat(dir);
  } catch {
    return [];
  }
  try {
    const entries = await readdir(dir);
    return entries.filter((f) => /\.(mp3|wav|m4a|ogg)$/i.test(f));
  } catch {
    return [];
  }
}

function audioRootDir(): string {
  return path.join(process.cwd(), 'public', 'audio');
}

export function detectContentTypeForFile(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.ogg')) return 'audio/ogg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  return 'audio/mpeg';
}
