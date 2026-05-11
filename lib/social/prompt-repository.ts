import { sql } from '@vercel/postgres';
import { ensureEmailPlatformSchema } from '@/lib/email-platform/schema';

export type SocialPromptTemplate = {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  userPrompt: string;
  isActive: boolean;
  updatedAt: string;
};

export type SocialPromptInput = {
  name: string;
  description?: string | null;
  systemPrompt: string;
  userPrompt: string;
  isActive?: boolean;
};

function mapRow(row: Record<string, unknown>): SocialPromptTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    systemPrompt: String(row.system_prompt || ''),
    userPrompt: String(row.user_prompt || ''),
    isActive: Boolean(row.is_active),
    updatedAt: String(row.updated_at),
  };
}

export async function listSocialPromptTemplates(): Promise<SocialPromptTemplate[]> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    SELECT id, name, description, system_prompt, user_prompt, is_active, updated_at
    FROM admin_social_prompt_templates
    ORDER BY is_active DESC, name ASC
  `;
  return result.rows.map((row) => mapRow(row));
}

export async function getSocialPromptTemplate(id: string): Promise<SocialPromptTemplate | null> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    SELECT id, name, description, system_prompt, user_prompt, is_active, updated_at
    FROM admin_social_prompt_templates
    WHERE id = ${id}
    LIMIT 1
  `;
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function createSocialPromptTemplate(input: SocialPromptInput): Promise<SocialPromptTemplate> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    INSERT INTO admin_social_prompt_templates (name, description, system_prompt, user_prompt, is_active, updated_at)
    VALUES (${input.name}, ${input.description ?? null}, ${input.systemPrompt}, ${input.userPrompt}, ${input.isActive ?? true}, NOW())
    RETURNING id, name, description, system_prompt, user_prompt, is_active, updated_at
  `;
  const row = result.rows[0];
  if (!row) throw new Error('No social prompt template returned');
  return mapRow(row);
}

export async function updateSocialPromptTemplate(id: string, input: SocialPromptInput): Promise<SocialPromptTemplate> {
  await ensureEmailPlatformSchema();
  const result = await sql`
    UPDATE admin_social_prompt_templates
    SET name = ${input.name},
      description = ${input.description ?? null},
      system_prompt = ${input.systemPrompt},
      user_prompt = ${input.userPrompt},
      is_active = ${input.isActive ?? true},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, name, description, system_prompt, user_prompt, is_active, updated_at
  `;
  const row = result.rows[0];
  if (!row) throw new Error('Social prompt template not found');
  return mapRow(row);
}

export async function deleteSocialPromptTemplate(id: string): Promise<void> {
  await ensureEmailPlatformSchema();
  await sql`DELETE FROM admin_social_prompt_templates WHERE id = ${id}`;
}
