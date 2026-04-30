import { mixVoiceUnderMusic } from './audio-mix';
import { probeAudioDurationSeconds } from './audio-probe';
import { generateVoiceoverAsset, type VoiceoverAsset, type VoiceoverExclusion } from './voiceover';
import { buildVoiceoverScript, type VoiceoverScriptKind } from './voiceover-script';
import { generateVoiceoverScriptWithLlm, isVoiceoverScriptUsable } from './voiceover-script-llm';
import { TIMING } from './brand-slides/slides';
import type { SlideCopy } from './copy-types';
import type { generateMusicAsset } from './music';

const VOICE_START_SECONDS = 0.8;
const VOICE_TAIL_BUFFER_SECONDS = 0.6;
const MAX_TOTAL_SECONDS = 22;

type MusicAsset = NonNullable<Awaited<ReturnType<typeof generateMusicAsset>>>;

export type AudioPipelineResult = {
  audioBuffer: Buffer | null;
  audioContentType: string | null;
  voiceover: VoiceoverAsset | null;
  script: string | null;
  scriptSource: 'llm' | 'fallback' | null;
  totalDurationSeconds: number;
};

export async function buildAudioWithVoiceover(input: {
  musicAsset: MusicAsset | null;
  subjectLine: string;
  brandName?: string | null;
  scriptKind?: VoiceoverScriptKind;
  voiceoverExclusion?: VoiceoverExclusion;
  voiceoverEnabled?: boolean;
  slideCopy?: SlideCopy | null;
  productTitles?: string[];
}): Promise<AudioPipelineResult> {
  const {
    musicAsset,
    subjectLine,
    brandName,
    scriptKind,
    voiceoverExclusion,
    voiceoverEnabled = true,
    slideCopy,
    productTitles,
  } = input;

  if (!voiceoverEnabled || !musicAsset) {
    return {
      audioBuffer: musicAsset?.buffer ?? null,
      audioContentType: musicAsset?.contentType ?? null,
      voiceover: null,
      script: null,
      scriptSource: null,
      totalDurationSeconds: TIMING.total,
    };
  }

  const fallbackScript = buildVoiceoverScript({ subjectLine, brandName, kind: scriptKind });
  let script = fallbackScript;
  let scriptSource: 'llm' | 'fallback' = 'fallback';
  if (slideCopy && scriptKind && scriptKind !== 'site') {
    const llmScript = await generateVoiceoverScriptWithLlm({
      kind: scriptKind,
      subjectLine,
      displayName: brandName || '',
      slideCopy,
      productTitles,
    });
    if (isVoiceoverScriptUsable(llmScript)) {
      script = llmScript;
      scriptSource = 'llm';
    } else if (llmScript) {
      console.warn(`[voiceover-pipeline] LLM script rejected, using deterministic fallback`);
    }
  }
  console.log(`[voiceover-pipeline] script source=${scriptSource} chars=${script.length}`);
  const voiceover = await generateVoiceoverAsset(script, voiceoverExclusion ?? {});
  if (!voiceover) {
    console.warn('[voiceover-pipeline] voice generation unavailable; using music only');
    return {
      audioBuffer: musicAsset.buffer,
      audioContentType: musicAsset.contentType,
      voiceover: null,
      script,
      scriptSource,
      totalDurationSeconds: TIMING.total,
    };
  }

  const voiceDuration = await probeAudioDurationSeconds(voiceover.buffer, voiceover.contentType);
  const requiredTotal = voiceDuration
    ? VOICE_START_SECONDS + voiceDuration + VOICE_TAIL_BUFFER_SECONDS
    : TIMING.total;
  const totalDurationSeconds = Math.min(MAX_TOTAL_SECONDS, Math.max(TIMING.total, Number(requiredTotal.toFixed(2))));
  if (voiceDuration) {
    console.log(
      `[voiceover-pipeline] voice=${voiceDuration.toFixed(2)}s required=${requiredTotal.toFixed(2)}s total=${totalDurationSeconds}s`
    );
  }

  try {
    const mixed = await mixVoiceUnderMusic({
      musicBuffer: musicAsset.buffer,
      musicContentType: musicAsset.contentType,
      voiceBuffer: voiceover.buffer,
      voiceContentType: voiceover.contentType,
      voiceStartSeconds: VOICE_START_SECONDS,
      totalDurationSeconds,
    });
    console.log(`[voiceover-pipeline] mixed bytes=${mixed.buffer.length} voice=${voiceover.metadata.voice}`);
    return {
      audioBuffer: mixed.buffer,
      audioContentType: mixed.contentType,
      voiceover,
      script,
      scriptSource,
      totalDurationSeconds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    console.warn(`[voiceover-pipeline] mix failed (${message}); falling back to music only`);
    return {
      audioBuffer: musicAsset.buffer,
      audioContentType: musicAsset.contentType,
      voiceover,
      script,
      scriptSource,
      totalDurationSeconds,
    };
  }
}
