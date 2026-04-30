import { generateVoiceoverWithElevenLabs } from './voiceover-elevenlabs';
import type { VoiceoverAsset, VoiceoverExclusion } from './voiceover-types';

export type { VoiceoverAsset, VoiceoverExclusion, VoiceGender } from './voiceover-types';

export async function generateVoiceoverAsset(
  script: string,
  exclusion: VoiceoverExclusion = {}
): Promise<VoiceoverAsset | null> {
  const trimmed = script.trim();
  if (!trimmed) return null;

  const elevenLabs = await generateVoiceoverWithElevenLabs(trimmed, exclusion);
  if (elevenLabs) return elevenLabs;

  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('[voiceover] ELEVENLABS_API_KEY missing — voiceover disabled (no fallback provider)');
  } else {
    console.warn('[voiceover] ElevenLabs returned no audio — voiceover disabled (no fallback provider)');
  }
  return null;
}
