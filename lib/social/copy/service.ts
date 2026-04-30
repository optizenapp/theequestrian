import { buildYoutubeFallbackCopy } from './fallbacks';
import { generateYoutubeCopyWithLlm } from './llm-youtube';
import type { YoutubeCopyBuildResult, YoutubeCopyContext } from './types';
import { validateYoutubeCopy } from './validation';

export async function buildYoutubeCopy(context: YoutubeCopyContext): Promise<YoutubeCopyBuildResult> {
  const fallback = buildYoutubeFallbackCopy(context);
  const llmRaw = await generateYoutubeCopyWithLlm(context, fallback);
  if (llmRaw === null) {
    return { copy: fallback, source: 'fallback', rejectionReason: 'llm_unavailable' };
  }
  const validated = validateYoutubeCopy(llmRaw, context.variant, { mode: context.mode });
  if (!validated.ok) {
    return { copy: fallback, source: 'fallback', rejectionReason: validated.reason };
  }
  return { copy: validated.copy, source: 'llm' };
}
