import { sql } from '@vercel/postgres';

export type MusicBlacklist = { audioUrls: string[]; taskIds: string[]; filenames: string[] };

export function readMusicBlacklist(metadata: Record<string, unknown> | null): MusicBlacklist {
  const raw = metadata?.musicBlacklist;
  if (!raw || typeof raw !== 'object') return { audioUrls: [], taskIds: [], filenames: [] };
  const blacklist = raw as { audioUrls?: unknown; taskIds?: unknown; filenames?: unknown };
  const audioUrls = Array.isArray(blacklist.audioUrls)
    ? blacklist.audioUrls.filter((v): v is string => typeof v === 'string')
    : [];
  const taskIds = Array.isArray(blacklist.taskIds)
    ? blacklist.taskIds.filter((v): v is string => typeof v === 'string')
    : [];
  const filenames = Array.isArray(blacklist.filenames)
    ? blacklist.filenames.filter((v): v is string => typeof v === 'string')
    : [];
  return { audioUrls, taskIds, filenames };
}

export async function blacklistCurrentMusicForCampaign(campaignId: string): Promise<void> {
  const result = await sql`
    SELECT v.prompt_json AS prompt_json,
           v.render_config_json AS render_config_json,
           c.metadata AS metadata
    FROM email_campaign_videos v
    JOIN email_campaigns c ON c.id = v.campaign_id
    WHERE v.campaign_id = ${campaignId}
    LIMIT 1
  `;
  const row = result.rows[0];
  if (!row) return;
  const prompt = (row.prompt_json as Record<string, unknown> | null) ?? {};
  const render = (row.render_config_json as Record<string, unknown> | null) ?? {};
  const metadata = (row.metadata as Record<string, unknown> | null) ?? {};
  const music = (prompt.music as Record<string, unknown> | undefined) || {};
  const audioUrl = typeof music.s3Url === 'string' ? music.s3Url : '';
  const taskId = typeof music.taskId === 'string' ? music.taskId : '';
  const sourceFilename = typeof music.sourceFilename === 'string' ? music.sourceFilename : '';
  const musicS3 = typeof render.musicS3Url === 'string' ? render.musicS3Url : '';
  const existing = readMusicBlacklist(metadata);
  const audioUrls = Array.from(
    new Set([...existing.audioUrls, audioUrl, musicS3].filter(Boolean))
  );
  const taskIds = Array.from(new Set([...existing.taskIds, taskId].filter(Boolean)));
  const filenames = Array.from(new Set([...existing.filenames, sourceFilename].filter(Boolean)));
  if (
    audioUrls.length === existing.audioUrls.length &&
    taskIds.length === existing.taskIds.length &&
    filenames.length === existing.filenames.length
  ) {
    return;
  }
  const nextMetadata = { ...metadata, musicBlacklist: { audioUrls, taskIds, filenames } };
  await sql`
    UPDATE email_campaigns
    SET metadata = ${JSON.stringify(nextMetadata)}::jsonb,
        updated_at = NOW()
    WHERE id = ${campaignId}
  `;
  console.log(
    `[video-service] music blacklist updated campaign=${campaignId} urls=${audioUrls.length} ids=${taskIds.length} files=${filenames.length}`
  );
}
