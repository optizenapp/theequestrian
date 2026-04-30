import { uploadBufferToS3 } from '@/lib/s3/storage';
import type { VoiceGender, VoiceoverAsset, VoiceoverExclusion } from './voiceover-types';

const DEFAULT_FEMALE_VOICES = [
  'M7ya1YbaeFaPXljg9BpK',
  'U9VgC8Xinl7nnNsyDd3J',
];
const DEFAULT_MALE_VOICES = [
  'dh3YdvdCYZdqFjtSFNTx',
  'iIg0uI51lssRFauz7W21',
  'NMbn4FNN0acONjKLsueJ',
  'abRFZIdN4pvo8ZPmGxHP',
];

const VOICE_LABELS: Record<string, string> = {
  M7ya1YbaeFaPXljg9BpK: 'Hannah Jayne (AU female)',
  U9VgC8Xinl7nnNsyDd3J: 'Rachel (AU female)',
  dh3YdvdCYZdqFjtSFNTx: 'William (AU male)',
  iIg0uI51lssRFauz7W21: 'Neil (AU male)',
  NMbn4FNN0acONjKLsueJ: 'Peter (AU male)',
  abRFZIdN4pvo8ZPmGxHP: 'Lee (AU male)',
};

function envVoiceList(name: string, fallback: string[]): string[] {
  const raw = (process.env[name] || '').trim();
  if (!raw) return fallback;
  const parts = raw.split(',').map((v) => v.trim()).filter(Boolean);
  return parts.length > 0 ? parts : fallback;
}

type AttemptResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; retryable: boolean; reason: string };

function buildAttemptOrder(exclusion: VoiceoverExclusion): Array<{ voice: string; gender: VoiceGender }> {
  const excluded = new Set((exclusion.voices ?? []).map((v) => v.toLowerCase()));
  const female = envVoiceList('ELEVENLABS_AU_FEMALE_VOICES', DEFAULT_FEMALE_VOICES)
    .filter((v) => !excluded.has(v.toLowerCase()))
    .map<{ voice: string; gender: VoiceGender }>((voice) => ({ voice, gender: 'female' }));
  const male = envVoiceList('ELEVENLABS_AU_MALE_VOICES', DEFAULT_MALE_VOICES)
    .filter((v) => !excluded.has(v.toLowerCase()))
    .map<{ voice: string; gender: VoiceGender }>((voice) => ({ voice, gender: 'male' }));
  shuffle(female);
  shuffle(male);
  const startWithFemale = Math.random() < 0.5;
  const primary = startWithFemale ? female : male;
  const secondary = startWithFemale ? male : female;
  return [...primary, ...secondary];
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function attemptVoice(apiKey: string, voice: string, script: string, model: string): Promise<AttemptResult> {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text: script,
        model_id: model,
        voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true },
      }),
    });
    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(0, 220);
      const retryable =
        response.status === 400 || response.status === 401 || response.status === 403 || response.status === 404;
      return { ok: false, retryable, reason: `status=${response.status} body=${body}` };
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length === 0) return { ok: false, retryable: true, reason: 'empty audio buffer' };
    return { ok: true, buffer };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    return { ok: false, retryable: true, reason: `exception ${message}` };
  }
}

export async function generateVoiceoverWithElevenLabs(
  script: string,
  exclusion: VoiceoverExclusion = {}
): Promise<VoiceoverAsset | null> {
  const apiKey = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!apiKey) return null;
  const trimmed = script.trim();
  if (!trimmed) return null;

  const model = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const order = buildAttemptOrder(exclusion);
  if (order.length === 0) {
    console.warn('[voiceover-elevenlabs] no voices available after exclusion');
    return null;
  }

  for (const { voice, gender } of order) {
    const label = VOICE_LABELS[voice] || voice;
    console.log(
      `[voiceover-elevenlabs] try voice=${voice} (${label}) gender=${gender} script="${trimmed.slice(0, 80)}"`
    );
    const result = await attemptVoice(apiKey, voice, trimmed, model);
    if (result.ok) {
      const s3Url = await uploadBufferToS3(result.buffer, 'articles/uploads', 'audio/mpeg', { forceUnique: true });
      console.log(`[voiceover-elevenlabs] ready bytes=${result.buffer.length} voice=${voice}`);
      return {
        buffer: result.buffer,
        s3Url,
        contentType: 'audio/mpeg',
        metadata: { provider: 'elevenlabs', voice, gender, model, script: trimmed, accent: 'australian' },
      };
    }
    console.warn(`[voiceover-elevenlabs] voice=${voice} rejected: ${result.reason}`);
    if (!result.retryable) break;
  }

  console.warn('[voiceover-elevenlabs] all voices rejected');
  return null;
}
