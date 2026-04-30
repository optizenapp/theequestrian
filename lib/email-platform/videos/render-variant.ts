import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { writeHyperframesProject } from './hyperframes-writer';
import { runCommand, uploadToS3WithRetry } from './render-utils';
import { generateAndUploadThumbnails } from './thumbnail';
import type { CampaignVideoVariant, RenderInput } from './video-render-types';

type VariantSpec = Omit<CampaignVideoVariant, 'videoUrl' | 'thumbnailUrl' | 'customThumbnailUrl'>;

export async function renderVariant(
  input: RenderInput,
  runId: string,
  variantSpec: VariantSpec
): Promise<CampaignVideoVariant> {
  const stagePrefix = `${input.campaignId}:${variantSpec.key}`;
  console.log(
    `[video-render] start variant=${variantSpec.key} size=${variantSpec.width}x${variantSpec.height}`
  );
  const projectDir = path.join(
    process.cwd(),
    'tmp',
    'campaign-videos',
    input.campaignId,
    runId,
    variantSpec.key
  );
  await writeHyperframesProject(input, projectDir, variantSpec);
  await runCommand(
    'npx',
    ['--yes', 'hyperframes@latest', 'render', '--output', `out/campaign-video-${variantSpec.key}.mp4`],
    projectDir,
    `${stagePrefix}:hyperframes`
  );
  const videoPath = path.join(projectDir, 'out', `campaign-video-${variantSpec.key}.mp4`);
  console.log(`[video-render] reading ${variantSpec.key}`);
  const videoBuffer = await readFile(videoPath);
  const videoUrl = await uploadToS3WithRetry(
    videoBuffer,
    'articles/uploads',
    'video/mp4',
    `${stagePrefix}:video`
  );
  console.log(`[video-render] uploaded video ${variantSpec.key}`);
  const { thumbnailUrl, customThumbnailUrl } = await generateAndUploadThumbnails({
    input,
    variantKey: variantSpec.key,
    videoPath,
    projectDir,
    stagePrefix,
  });
  console.log(
    `[video-render] thumbnails ${variantSpec.key} frame=${thumbnailUrl ? 'ok' : 'miss'} custom=${customThumbnailUrl ? 'ok' : 'miss'}`
  );
  return { ...variantSpec, videoUrl, thumbnailUrl, customThumbnailUrl };
}
