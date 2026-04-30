import { uploadBufferToS3 } from '@/lib/s3/storage';
import { generateMusicWithEvolink } from './evolink';
import { buildFallbackWav } from './music-fallback-wav';
import { TIMING } from './brand-slides/slides';
import {
  detectContentTypeForFile,
  pickRepoTrack,
  type MusicCategory,
} from './music-repo';

export type MusicAsset = {
  s3Url: string;
  buffer: Buffer;
  contentType: string;
  metadata:
    | {
        provider: 'evolink';
        taskId: string;
        model: string;
        durationSeconds: number | null;
        sourceFilename?: null;
        category?: MusicCategory;
      }
    | {
        provider: 'repo';
        taskId: null;
        model: 'bundled-mp3';
        durationSeconds: number;
        sourceFilename: string;
        category: MusicCategory;
      }
    | {
        provider: 'fallback_local';
        taskId: null;
        model: 'local-fallback-wav';
        durationSeconds: number;
        sourceFilename?: null;
        category?: MusicCategory;
      };
};

function normalizeContentType(raw: string | null): string {
  const value = (raw || '').toLowerCase();
  if (value.includes('wav')) return 'audio/wav';
  if (value.includes('ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}

export type MusicExclusion = {
  audioUrls?: string[];
  taskIds?: string[];
  filenames?: string[];
};

export async function generateMusicAsset(
  prompt: string,
  category: MusicCategory,
  exclusion: MusicExclusion = {}
): Promise<MusicAsset | null> {
  const track = await generateMusicWithEvolink(prompt, {
    excludeAudioUrls: exclusion.audioUrls,
    excludeTaskIds: exclusion.taskIds,
  });
  if (track) {
    const evolinkAsset = await tryUploadEvolinkTrack(track);
    if (evolinkAsset) return evolinkAsset;
  }

  const repoAsset = await buildRepoMusicAsset(category, exclusion.filenames || []);
  if (repoAsset) return repoAsset;

  return buildSynthFallbackAsset();
}

async function tryUploadEvolinkTrack(track: {
  audioUrl: string;
  taskId: string;
  model: string;
  durationSeconds: number | null;
}): Promise<MusicAsset | null> {
  try {
    const response = await fetch(track.audioUrl);
    if (!response.ok) return null;
    const bytes = await response.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.length === 0) return null;
    const contentType = normalizeContentType(response.headers.get('content-type'));
    const s3Url = await uploadBufferToS3(buffer, 'articles/uploads', contentType, { forceUnique: true });
    return {
      s3Url,
      buffer,
      contentType,
      metadata: {
        provider: 'evolink',
        taskId: track.taskId,
        model: track.model,
        durationSeconds: track.durationSeconds,
      },
    };
  } catch {
    return null;
  }
}

async function buildRepoMusicAsset(
  category: MusicCategory,
  excludedFilenames: string[]
): Promise<MusicAsset | null> {
  const repo = await pickRepoTrack(category, { filenames: excludedFilenames });
  if (!repo) return null;
  const contentType = detectContentTypeForFile(repo.filename);
  const s3Url = await uploadBufferToS3(repo.buffer, 'articles/uploads', contentType, { forceUnique: true });
  console.log(`[music] using repo track category=${repo.category} file=${repo.filename}`);
  return {
    s3Url,
    buffer: repo.buffer,
    contentType,
    metadata: {
      provider: 'repo',
      taskId: null,
      model: 'bundled-mp3',
      durationSeconds: TIMING.total,
      sourceFilename: repo.filename,
      category: repo.category,
    },
  };
}

async function buildSynthFallbackAsset(): Promise<MusicAsset> {
  const durationSeconds = TIMING.total + 8;
  const wavBuffer = buildFallbackWav(durationSeconds, 44100);
  const s3Url = await uploadBufferToS3(wavBuffer, 'articles/uploads', 'audio/wav', { forceUnique: true });
  console.log('[music] using synth fallback (no repo tracks, evolink unavailable)');
  return {
    s3Url,
    buffer: wavBuffer,
    contentType: 'audio/wav',
    metadata: {
      provider: 'fallback_local',
      taskId: null,
      model: 'local-fallback-wav',
      durationSeconds,
    },
  };
}
