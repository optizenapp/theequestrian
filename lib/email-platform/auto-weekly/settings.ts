import { sql } from '@/lib/db/vercel-postgres';

const KEY_ENABLED = 'auto_weekly_enabled';
const KEY_INTRO_PROMPT = 'auto_weekly_intro_prompt';
const KEY_SUBJECT_PROMPT = 'auto_weekly_subject_prompt';
const KEY_TEMPLATE_VERSION_ID = 'auto_weekly_template_version_id';
const KEY_AUDIENCE = 'auto_weekly_audience';

export type AutoWeeklyAudience = {
  listIds: string[];
  segmentIds: string[];
};

export type AutoWeeklySettings = {
  enabled: boolean;
  introPrompt: string | null;
  subjectPrompt: string | null;
  templateVersionId: string | null;
  audience: AutoWeeklyAudience;
};

async function getConfigValue(key: string): Promise<Record<string, unknown> | null> {
  const result = await sql`
    SELECT value FROM email_platform_config WHERE key = ${key} LIMIT 1
  `;
  const row = result.rows[0];
  return (row?.value as Record<string, unknown>) ?? null;
}

async function setConfigValue(key: string, value: Record<string, unknown>): Promise<void> {
  const valueStr = JSON.stringify(value);
  await sql`
    INSERT INTO email_platform_config (key, value, updated_at)
    VALUES (${key}, ${valueStr}::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = ${valueStr}::jsonb, updated_at = NOW()
  `;
}

function parseStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string');
}

export async function getAutoWeeklySettings(): Promise<AutoWeeklySettings> {
  const [enabledRow, introRow, subjectRow, templateRow, audienceRow] = await Promise.all([
    getConfigValue(KEY_ENABLED),
    getConfigValue(KEY_INTRO_PROMPT),
    getConfigValue(KEY_SUBJECT_PROMPT),
    getConfigValue(KEY_TEMPLATE_VERSION_ID),
    getConfigValue(KEY_AUDIENCE),
  ]);
  return {
    enabled: enabledRow?.enabled === true || enabledRow?.enabled === 'true',
    introPrompt:
      typeof introRow?.prompt === 'string' && introRow.prompt.trim().length > 0
        ? String(introRow.prompt).trim()
        : null,
    subjectPrompt:
      typeof subjectRow?.prompt === 'string' && subjectRow.prompt.trim().length > 0
        ? String(subjectRow.prompt).trim()
        : null,
    templateVersionId:
      typeof templateRow?.templateVersionId === 'string' && templateRow.templateVersionId.trim().length > 0
        ? String(templateRow.templateVersionId).trim()
        : null,
    audience: {
      listIds: parseStringArray(audienceRow?.listIds),
      segmentIds: parseStringArray(audienceRow?.segmentIds),
    },
  };
}

export async function isAutoWeeklyFlowEnabled(): Promise<boolean> {
  const s = await getAutoWeeklySettings();
  return s.enabled;
}

export async function setAutoWeeklyFlowEnabled(enabled: boolean): Promise<void> {
  await setConfigValue(KEY_ENABLED, { enabled });
}

export async function setAutoWeeklyIntroPrompt(prompt: string | null): Promise<void> {
  await setConfigValue(KEY_INTRO_PROMPT, { prompt: prompt ?? '' });
}

export async function setAutoWeeklySubjectPrompt(prompt: string | null): Promise<void> {
  await setConfigValue(KEY_SUBJECT_PROMPT, { prompt: prompt ?? '' });
}

export async function setAutoWeeklyTemplateVersionId(templateVersionId: string | null): Promise<void> {
  await setConfigValue(KEY_TEMPLATE_VERSION_ID, { templateVersionId: templateVersionId ?? '' });
}

export async function setAutoWeeklyAudience(audience: AutoWeeklyAudience): Promise<void> {
  await setConfigValue(KEY_AUDIENCE, {
    listIds: audience.listIds ?? [],
    segmentIds: audience.segmentIds ?? [],
  });
}
