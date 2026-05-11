# Topic Video End-to-End Handoff

This document describes the proven video lifecycle logic in a generic form that another agent can reuse for a **topic video**. It is intentionally not product-specific. Use it as a supplemental handoff when another codebase already has adjacent pieces such as content generation, media rendering, storage, or publishing.

The goal is to preserve the working logic:

1. Build a structured topic video from a source topic.
2. Validate all visible and spoken content before rendering.
3. Render platform-ready variants.
4. Persist all assets and metadata.
5. Require a human approval gate.
6. Build channel-specific social copy.
7. Publish the approved video and save the external URL.

## Scope

This spec covers the lifecycle from **video creation request** to **published social post**.

It assumes the target system has:

- A database or persistent store for video jobs, video records, and social posts.
- Object storage for rendered videos, thumbnails, generated audio, and optional intermediate assets.
- A render runtime with access to a browser renderer, FFmpeg, fonts, and audio tools.
- LLM access for copy generation and validation.
- Optional TTS and music generation providers.
- OAuth/API credentials for each publishing channel.

It does not assume ecommerce products, prices, product URLs, brand pages, or sale language.

## Core Principle

Treat video creation as a staged pipeline with explicit contracts between stages. Do not let one stage infer too much from raw user input. Each stage should output structured data that the next stage validates before use.

```mermaid
flowchart LR
  adminTrigger[AdminTrigger] --> queueOrInline[QueueOrInlineGate]
  queueOrInline --> contextBuild[BuildTopicContext]
  contextBuild --> contentGen[GenerateAndValidateCopy]
  contentGen --> audioStage[VoiceoverAndMusic]
  audioStage --> renderStage[RenderVariants]
  renderStage --> storeStage[PersistAssetsAndMetadata]
  storeStage --> reviewGate[ReviewApprovalGate]
  reviewGate --> socialBuild[BuildSocialCopy]
  socialBuild --> publishStage[ChannelPublisher]
  publishStage --> publishedState[PublishedState]
```

## Canonical State Model

Use explicit states. The UI and worker should read these states rather than infer progress from logs.

### Video States

| State | Meaning | Next states |
| --- | --- | --- |
| `queued` | A video job has been accepted and is waiting for a worker. | `rendering`, `render_failed` |
| `rendering` | A worker or inline process is actively generating assets. | `ready_for_review`, `render_failed` |
| `render_failed` | The render failed. Store a meaningful `error_message`. | `queued` via retry |
| `ready_for_review` | At least one usable video variant was rendered and stored. | `approved`, `rejected`, `queued` via regenerate |
| `approved` | A human approved the video for publishing. | `publishing`, `published`, `publish_failed` |
| `rejected` | A human rejected the video. | `queued` via regenerate |

### Social Post States

| State | Meaning | Next states |
| --- | --- | --- |
| `draft` | Social copy has been generated but not published. | `publishing`, `draft` via edit/regenerate |
| `publishing` | Channel API upload is in progress. | `published`, `publish_failed` |
| `published` | Channel returned an external post/video URL. | terminal |
| `publish_failed` | Channel API failed. Store a meaningful `error_message`. | `publishing` via retry |

## Generic Data Model

Names can vary by system, but keep these logical records.

### `topic_video_jobs`

One row per requested operation.

```ts
type TopicVideoJob = {
  id: string;
  topicVideoId: string;
  jobKind: 'create' | 'regenerate' | 'regenerate_music' | 'regenerate_thumbnail';
  status: 'queued' | 'rendering' | 'render_failed';
  payload: Record<string, unknown>;
  workerId: string | null;
  startedAt: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
};
```

### `topic_videos`

One durable record per video concept.

```ts
type TopicVideoRecord = {
  id: string;
  sourceId: string;
  sourceType: 'topic' | 'article' | 'lesson' | 'guide' | 'campaign' | string;
  status:
    | 'queued'
    | 'rendering'
    | 'render_failed'
    | 'ready_for_review'
    | 'approved'
    | 'rejected';
  topicContextJson: TopicVideoContext;
  promptJson: TopicVideoPromptSnapshot | null;
  renderConfigJson: TopicVideoRenderConfig | null;
  primaryVideoUrl: string | null;
  primaryThumbnailUrl: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### `social_posts`

One row per video, channel, and variant.

```ts
type SocialPostRecord = {
  id: string;
  topicVideoId: string;
  channel: 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'x' | string;
  variant: 'landscape_16_9' | 'vertical_9_16' | string;
  status: 'draft' | 'publishing' | 'published' | 'publish_failed';
  copyJson: SocialCopy;
  externalPostId: string | null;
  externalUrl: string | null;
  publishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};
```

### `social_channel_credentials`

One row per connected channel/account.

```ts
type SocialChannelCredential = {
  channel: string;
  accountId: string;
  accountName: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  expiresAt: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
  updatedAt: string;
};
```

## Topic Input Contract

For topic videos, the source of truth should be topic material, not product data. Keep this contract small and explicit.

```ts
type TopicVideoContext = {
  topicId: string;
  topicTitle: string;
  topicSummary: string;
  audience: string;
  goal: 'educate' | 'explain' | 'inspire' | 'announce' | 'compare' | 'how_to';
  tone: 'clear' | 'warm' | 'expert' | 'practical' | 'premium' | 'friendly';
  sourceMaterials: Array<{
    title: string;
    url?: string;
    excerpt: string;
  }>;
  keyPoints: string[];
  callToAction: {
    label: string;
    url: string;
  };
  brand: {
    name: string;
    siteUrl: string;
    logoUrl?: string;
    colors?: {
      background: string;
      foreground: string;
      accent: string;
    };
    fontFamily?: string;
  };
  constraints?: {
    maxDurationSeconds?: number;
    requiredDisclaimers?: string[];
    bannedClaims?: string[];
    requiredPhrases?: string[];
  };
};
```

The topic context should be assembled before any LLM call. It should be deterministic, inspectable, and saved with the video record.

## Creation Flow

### 1. Accept the create request

The API should accept a topic/video ID and either:

- Run inline in local development, or
- Enqueue a job in production.

Recommended behavior:

```ts
if (isLocalDev && localInlineEnabled) {
  return await createTopicVideo(topicVideoId);
}

await enqueueVideoJob({
  topicVideoId,
  jobKind: 'create',
  payload: {},
});

return { ok: true, status: 'queued' };
```

Keep local inline execution only as a development convenience. Production should use a worker so browser rendering, FFmpeg, TTS, and uploads do not run inside short-lived web requests.

### 2. Claim jobs atomically

Workers should claim jobs with row locking so multiple workers can run safely.

```sql
WITH next AS (
  SELECT id
  FROM topic_video_jobs
  WHERE status = 'queued'
  ORDER BY updated_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE topic_video_jobs AS j
SET status = 'rendering',
    worker_id = $workerId,
    started_at = NOW(),
    updated_at = NOW()
FROM next
WHERE j.id = next.id
RETURNING j.*;
```

If the worker crashes after claiming, a maintenance process should requeue stale jobs where `status = 'rendering'` and `started_at` is older than the maximum expected render time.

### 3. Build topic context

Resolve the complete `TopicVideoContext`.

The context builder should:

- Prefer explicit topic title and summary over names generated for internal scheduling.
- Include only source material that is valid and relevant.
- Convert raw source text into concise key points.
- Resolve brand styling, logo, and CTA.
- Remove unsupported or unverifiable claims.
- Save the context snapshot before rendering.

Do not let the render stage scrape arbitrary page content. The render stage should receive structured, validated context.

### 4. Generate and validate slide/topic copy

Create visible text as structured fields, not a single blob.

Example four-scene topic structure:

```ts
type TopicSlideCopy = {
  s1: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
  };
  s2: {
    title: string;
    body: string;
  };
  s3: {
    title: string;
    points: string[];
  };
  s4: {
    title: string;
    ctaLabel: string;
    ctaUrl: string;
  };
};
```

Recommended copy pipeline:

1. Use manual override if present and valid.
2. Else use LLM to generate copy from `TopicVideoContext`.
3. Validate and sanitize LLM output.
4. If invalid, use deterministic fallback templates.

Validation rules should include:

- Length limits per field.
- No unsupported claims.
- No sensationalist phrasing unless the topic requires it.
- No profanity or banned phrases.
- No markdown links in visible text.
- No raw URLs in slide text unless the design explicitly supports them.
- CTA must match the provided `callToAction`.
- Empty optional fields are allowed where the composition supports omission.

### 5. Generate voiceover script

Voiceover should use validated slide/topic copy as the primary source, then the topic context as secondary support.

Recommended contract:

```ts
type VoiceoverPlan = {
  script: string;
  source: 'llm' | 'fallback' | 'manual';
  voiceId?: string;
  voiceProvider?: string;
  durationSeconds?: number;
};
```

Rules:

- Keep voiceover short enough for the target video length.
- Prefer natural spoken language over reading every slide verbatim.
- Avoid introducing new claims not present in the topic context.
- Measure the generated audio duration with FFprobe or provider metadata.
- Adapt the final scene duration if the voiceover is longer than expected.
- Cap total duration to a known maximum unless the format allows long videos.

If TTS fails, continue with music-only only if the video requirements allow it. Otherwise mark the render as failed with a clear error.

### 6. Generate or select music

Recommended fallback chain:

1. Generated music provider, if credits and API are available.
2. Curated local/repo track selected by topic mood.
3. Deterministic synthetic fallback.

Persist selected music metadata:

```ts
type MusicAsset = {
  provider: 'generated' | 'repo' | 'fallback';
  url?: string;
  sourceFilename?: string;
  prompt?: string;
  durationSeconds?: number;
};
```

For "try new music", blacklist the current provider ID, task ID, URL, or filename so a regenerate operation cannot pick the exact same track again.

### 7. Mix audio

Mix music and voiceover before rendering when possible.

Recommended defaults:

- Duck or lower music under voiceover.
- Start music slightly before or at the same time as visuals.
- Normalize voiceover volume consistently.
- Ensure the mixed audio is trimmed or padded to the final video duration.

If mixing fails, either:

- Fall back to voiceover-only or music-only based on product requirements, or
- Mark the render as failed if audio is mandatory.

### 8. Render variants

Render multiple variants from the same content snapshot.

Recommended baseline variants:

```ts
type RenderVariant = {
  key: 'landscape_16_9' | 'vertical_9_16';
  width: number;
  height: number;
  aspectRatio: '16:9' | '9:16';
  platformTargets: string[];
};
```

Suggested defaults:

| Variant | Size | Targets |
| --- | --- | --- |
| `landscape_16_9` | `1920x1080` | YouTube, Facebook, X |
| `vertical_9_16` | `1080x1920` | YouTube Shorts, Instagram Reels, TikTok, Facebook Reels |

Render rules:

- Use the exact same validated topic copy, voiceover, music, and brand snapshot for every variant.
- Let layout adapt per aspect ratio, but do not regenerate the message independently per variant.
- Render variants independently.
- Use per-variant timeouts.
- If one variant fails but another succeeds, persist successful variants and log failed variants.
- Mark the full render as failed only if no usable variant succeeds.

### 9. Generate thumbnails

Generate both:

- A late-frame thumbnail from the rendered video.
- A custom branded thumbnail from the topic title, brand styling, and primary visual.

Persist both if available:

```ts
type VariantRenderResult = {
  key: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  customThumbnailUrl: string | null;
  width: number;
  height: number;
  durationSeconds: number;
};
```

For YouTube, prefer custom branded thumbnails when available. Fall back to frame thumbnails.

### 10. Persist render result

Persist a complete snapshot of what was rendered.

```ts
type TopicVideoPromptSnapshot = {
  topicContext: TopicVideoContext;
  slideCopy: TopicSlideCopy;
  slideCopySource: 'manual' | 'llm' | 'fallback';
  voiceoverScript: string | null;
  voiceover: VoiceoverPlan | null;
  music: MusicAsset | null;
  runId: string;
};

type TopicVideoRenderConfig = {
  template: 'topic_slides_v1';
  fps: number;
  durationSeconds: number;
  variants: VariantRenderResult[];
};
```

The persisted snapshot is critical. Social copy generation should use this snapshot as its source of truth, not the original raw topic alone.

### 11. Human review gate

Do not publish immediately after render.

Review UI should show:

- Video preview.
- All rendered variants.
- Thumbnail(s).
- Visible slide/topic copy.
- Voiceover script.
- Music metadata where useful.
- Regenerate actions.
- Approve/reject actions.

Only `approved` videos can build or publish social posts.

## Social Copy Flow

### 1. Build social context

Build social copy from the final persisted video snapshot.

Priority order:

1. Validated on-screen topic copy.
2. Voiceover script.
3. Topic context and source materials.
4. Original title/summary as hints.

Do not let the LLM invent details from the title alone.

Recommended social context:

```ts
type TopicSocialContext = {
  topicTitle: string;
  topicSummary: string;
  slideCopy: TopicSlideCopy;
  voiceoverScript?: string;
  cta: {
    label: string;
    url: string;
  };
  sourceLinks: Array<{
    label: string;
    url: string;
  }>;
  brand: {
    name: string;
    siteUrl: string;
    socialLinks: Record<string, string>;
  };
  videoVariants: VariantRenderResult[];
};
```

### 2. Generate channel copy

Use a channel-specific copy builder behind a generic interface.

```ts
type BuildSocialCopyInput = {
  channel: string;
  variant: string;
  context: TopicSocialContext;
};

type SocialCopy = {
  title: string;
  description: string;
  tags?: string[];
  hashtags?: string[];
  privacyStatus?: 'private' | 'unlisted' | 'public';
  categoryId?: string;
};
```

For topic videos, the copy should include:

- A specific opening hook based on the actual topic.
- A concise explanation of what the viewer will learn or understand.
- CTA link.
- Relevant source/resource links where appropriate.
- Store/site/brand link if applicable.
- Cross-channel social links if required by the brand.
- Emojis and paragraph spacing only where they improve readability.

Avoid product sections such as "Featured in this video" unless the topic actually includes products.

### 3. Validate and normalize social copy

All LLM-generated social copy must pass validation before saving.

Validation should:

- Enforce field lengths per channel.
- Remove unsupported claims.
- Remove or rewrite banned phrases.
- Ensure required links are present.
- Ensure only supplied URLs are used.
- Ensure hashtags/tags are relevant.
- Add brand/store/social links if required by the business.
- Preserve readable paragraph spacing.
- Rebuild a safe hook if the original hook is removed by validation.

For topic videos, avoid ecommerce-only validators such as sale-language gates unless the topic type needs them. Replace them with topic-appropriate rules, for example:

- No medical, legal, financial, or safety claims unless present in approved source material.
- No "guaranteed" outcome language.
- No false urgency.
- No fake discounts, promotions, or product availability.

### 4. Save social posts for review

Save one draft row per channel and variant.

Example:

```ts
type SocialPostDraft = {
  topicVideoId: string;
  channel: 'youtube';
  variant: 'landscape_16_9' | 'vertical_9_16';
  copyJson: SocialCopy;
  status: 'draft';
};
```

The user should be able to edit and save the copy before publish.

## Publishing Flow

### Generic Publisher Interface

Each channel should implement the same high-level contract.

```ts
type PublishInput = {
  topicVideoId: string;
  socialPostId: string;
  channel: string;
  variant: string;
};

type PublishResult = {
  externalPostId: string;
  externalUrl: string;
  publishedAt: string;
};

interface ChannelPublisher {
  publish(input: PublishInput): Promise<PublishResult>;
}
```

### Publish Steps

1. Load social post.
2. Assert video status is `approved`.
3. Assert post status is `draft` or `publish_failed`.
4. Set post status to `publishing`.
5. Re-validate `copyJson`.
6. Resolve the correct variant video URL.
7. Resolve the preferred thumbnail URL if supported by the channel.
8. Get or refresh channel access token.
9. Upload video to the channel API.
10. Set thumbnail if the channel supports it.
11. Save `externalPostId`, `externalUrl`, `publishedAt`, and `status = published`.
12. On failure, save `status = publish_failed` and `errorMessage`.

### YouTube Reference Behavior

For YouTube:

- Use resumable upload for video bytes.
- Use landscape variant for normal YouTube videos.
- Use vertical variant for Shorts.
- Include `#Shorts` when publishing the vertical/Shorts variant.
- Upload custom thumbnail when available.
- Fall back to rendered frame thumbnail when custom thumbnail is unavailable.
- Save the YouTube video ID and public URL after successful upload.

## Idempotency and Recovery

The system should be safe to retry.

Recommended rules:

- Enqueue should upsert by video ID and job kind, clearing old errors.
- Claim should be atomic and skip locked rows.
- Rendering should write to a new `runId` path so retries do not overwrite half-written assets.
- Persistence should replace the active render config only after uploads succeed.
- Publish should not upload twice if a post is already `published` with an external URL.
- Failed jobs should store a human-readable root cause.
- Stale `rendering` jobs should be requeued by a maintenance process after a timeout.

## Fallback Strategy

Every expensive or external stage should have a fallback policy.

| Stage | Primary | Fallback | Fail render if all fail? |
| --- | --- | --- | --- |
| Topic copy | LLM | deterministic topic templates | Yes, if no valid visible copy |
| Voiceover script | LLM | deterministic script | No, if voiceover is optional |
| TTS | provider voice | music-only or alternate voice | Depends on requirements |
| Music | generated provider | curated repo track, then synthetic | No, if silent video is acceptable |
| Render variant | browser renderer | none | Only if no variant succeeds |
| Thumbnail | custom HTML | late-frame extraction | No |
| Social copy | LLM | deterministic channel template | Yes, if no valid copy |
| Publish | channel API | retry with same payload | Yes |

## Local vs Production Execution

Use two modes.

### Local inline mode

Local development can run the render inside the API request so the developer does not need a worker process.

```ts
const runInline = process.env.NODE_ENV !== 'production' && process.env.VIDEO_LOCAL_INLINE !== '0';
```

This is useful while developing templates, copy, and render output.

### Production worker mode

Production should enqueue and return immediately.

```ts
await enqueueVideoJob({ topicVideoId, jobKind: 'create' });
return { ok: true, status: 'queued' };
```

A separate worker should:

- Poll for `queued` jobs.
- Claim one job atomically.
- Run the creation pipeline.
- Persist success or failure.
- Shut down gracefully on SIGTERM.

## Topic Video Template Guidance

For a generic topic video, start with a four-scene structure:

| Scene | Purpose | Example content |
| --- | --- | --- |
| 1 | Hook/title | Topic title and why it matters |
| 2 | Explanation | One concise paragraph or visual explanation |
| 3 | Key points | Two or three practical takeaways |
| 4 | CTA | "Read the full guide", "Learn more", or another topic-specific CTA |

The template should support optional fields. If a field is blank, omit the visual element rather than rendering empty placeholders.

## Implementation Checklist For Another Agent

Use this checklist to build the same logic in another system.

1. Define `TopicVideoContext`.
2. Define durable video, job, social post, and credential records.
3. Add create/regenerate/thumbnail routes or commands.
4. Add inline-local mode and queue-production mode.
5. Implement atomic worker claim with `FOR UPDATE SKIP LOCKED` or equivalent.
6. Build topic context resolver.
7. Build slide/topic copy generator with validator and fallback.
8. Build voiceover script generator with validator and fallback.
9. Build TTS/music/mix pipeline.
10. Render `16:9` and `9:16` variants from the same content snapshot.
11. Generate frame and custom thumbnails.
12. Persist `promptJson`, `renderConfigJson`, URLs, and status.
13. Add approval/rejection gate.
14. Build social copy from persisted video snapshot, not raw topic alone.
15. Validate and normalize social copy.
16. Save editable draft social posts.
17. Implement channel publisher(s).
18. Save external post IDs/URLs and final status.
19. Add retries, stale job recovery, and meaningful error messages.

## Repo Mapping Appendix

This repository implements the same pattern for email campaign videos. Use this map to verify the logic, but keep any new topic-video implementation generic.

### Video Trigger and Review

| Generic stage | Current implementation |
| --- | --- |
| Create video route | `app/api/admin/email/campaigns/[id]/video/create/route.ts` |
| Regenerate video route | `app/api/admin/email/campaigns/[id]/video/regenerate/route.ts` |
| Regenerate music route | `app/api/admin/email/campaigns/[id]/video/regenerate-music/route.ts` |
| Regenerate thumbnail route | `app/api/admin/email/campaigns/[id]/video/regenerate-thumbnail/route.ts` |
| Approve/reject routes | `app/api/admin/email/campaigns/[id]/video/approve/route.ts`, `reject/route.ts` |
| Poll status route | `app/api/admin/email/campaigns/[id]/video/status/route.ts` |

### Queue and Worker

| Generic stage | Current implementation |
| --- | --- |
| Enqueue job | `lib/email-platform/videos/job-queue.ts`, `enqueueCampaignVideoJob` |
| Inline-local switch | `lib/email-platform/videos/local-inline.ts`, `shouldRunVideoInlineInLocal` |
| Worker loop | `services/video-worker/index.ts` |
| Atomic claim and dispatch | `services/video-worker/processor.ts`, `claimNextJob`, `processClaimedJob` |

### Video Generation

| Generic stage | Current implementation |
| --- | --- |
| Main service | `lib/email-platform/videos/service.ts`, `createCampaignVideo` |
| Mode dispatch | `lib/email-platform/videos/campaign-video-generation.ts`, `generateAndPersistAutoCampaignVideo` |
| Context loading | `lib/email-platform/videos/campaign-video-context.ts` |
| Slide copy generation | `lib/email-platform/videos/copy-service.ts`, `buildValidatedSlideCopy` |
| Copy validation | `lib/email-platform/videos/copy-validation.ts` |
| Voiceover | `lib/email-platform/videos/voiceover-pipeline.ts`, `buildAudioWithVoiceover` |
| Music | `lib/email-platform/videos/music.ts`, `generateMusicAsset` |
| Music blacklist | `lib/email-platform/videos/music-blacklist.ts` |
| Render orchestration | `lib/email-platform/videos/render.ts`, `renderCampaignVideoToS3` |
| Per-variant render | `lib/email-platform/videos/render-variant.ts`, `renderVariant` |
| Hyperframes project writer | `lib/email-platform/videos/hyperframes-writer.ts` |
| Thumbnail generation | `lib/email-platform/videos/thumbnail.ts`, `generateAndUploadThumbnails` |
| Render persistence | `lib/email-platform/videos/campaign-video-persistence.ts`, `persistCampaignVideoReady` |

### Social Copy and Publish

| Generic stage | Current implementation |
| --- | --- |
| Load video social context | `lib/social/campaign-context.ts`, `loadCampaignSocialContext` |
| Build social copy route | `app/api/admin/email/campaigns/[id]/social/[channel]/build/route.ts` |
| Social copy service | `lib/social/copy/service.ts`, `buildYoutubeCopy` |
| YouTube LLM prompt | `lib/social/copy/llm-youtube.ts` |
| Social copy validation | `lib/social/copy/validation.ts`, `validateYoutubeCopy` |
| Social copy normalization | `lib/social/copy/normalize.ts`, `normalizeYoutubeDescription` |
| Cross-link insertion | `lib/social/cross-links.ts` |
| Publish route | `app/api/admin/email/campaigns/[id]/social/[channel]/publish/route.ts` |
| YouTube publisher | `lib/social/publishers/youtube.ts`, `publishToYoutube` |
| YouTube thumbnail upload | `lib/social/publishers/youtube-thumbnail.ts` |
| Credential storage and refresh | `lib/social/credentials.ts` |
| YouTube OAuth | `lib/social/youtube-oauth.ts` |

### Schema

The current schema bootstrap lives in `lib/email-platform/schema.ts` and includes:

- `email_campaign_videos`: equivalent to `topic_videos`.
- `social_posts`: reusable social post model.
- `social_channel_credentials`: reusable channel credential model.

For a topic-video system, rename the campaign-specific concepts but preserve the lifecycle and state transitions.

## Acceptance Criteria

An implementation using this handoff is complete when:

- A topic can be converted into a validated render snapshot.
- Both `16:9` and `9:16` variants render from the same topic copy, audio, and brand context.
- Render outputs are persisted to object storage.
- The video reaches `ready_for_review` only after at least one variant is usable.
- The video cannot publish until it is `approved`.
- Social copy is generated from the persisted video snapshot.
- Social copy can be edited before publish.
- Publishing stores the external post ID and URL.
- Failed render and publish attempts store clear error messages.
- Retrying a failed job does not corrupt previous successful assets.
