import type { generateMusicAsset } from './music';
import type { VoiceoverAsset } from './voiceover';

type MusicAsset = Awaited<ReturnType<typeof generateMusicAsset>>;

export function buildMusicPromptMeta(musicAsset: MusicAsset): Record<string, unknown> {
  return musicAsset
    ? { ...musicAsset.metadata, s3Url: musicAsset.s3Url }
    : { provider: 'none', warning: 'evolink_unavailable_or_failed' };
}

export function buildVoiceoverPromptMeta(
  voiceover: VoiceoverAsset | null,
  script: string | null,
  scriptSource?: 'llm' | 'fallback' | null
): Record<string, unknown> {
  return voiceover
    ? { ...voiceover.metadata, s3Url: voiceover.s3Url, script, scriptSource: scriptSource ?? null }
    : { provider: 'none', script: script ?? null, scriptSource: scriptSource ?? null };
}

export type CampaignVideoSummary = {
  campaignName: string;
  subjectLine: string;
  status: string;
  videoUrl: string;
  thumbnailUrl: string | null;
};
