import { buildFallbackSlideCopy } from './copy-fallbacks';
import { generateSlideCopyWithLlm } from './copy-llm';
import type { CopyBuildResult, SlideCopyContext } from './copy-types';
import { validateAndSanitizeSlideCopy } from './copy-validation';

export async function buildValidatedSlideCopy(
  context: SlideCopyContext,
  options?: { override?: unknown }
): Promise<CopyBuildResult> {
  if (options?.override !== undefined && options.override !== null) {
    const overrideValidated = validateAndSanitizeSlideCopy(options.override, context);
    if (overrideValidated.ok) {
      return { copy: overrideValidated.copy, source: 'override' };
    }
    console.warn(`[video-copy] override rejected reason=${overrideValidated.reason}, falling back to LLM`);
  }
  const fallback = buildFallbackSlideCopy(context);
  const llmRaw = await generateSlideCopyWithLlm(context, fallback);
  if (llmRaw === null) {
    return { copy: fallback, source: 'fallback', rejectionReason: 'llm_unavailable' };
  }
  const validated = validateAndSanitizeSlideCopy(llmRaw, context);
  if (!validated.ok) {
    return { copy: fallback, source: 'fallback', rejectionReason: validated.reason };
  }
  return { copy: validated.copy, source: 'llm' };
}

