import { sql } from '@vercel/postgres';

export async function logEmailAudit(input: {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await sql`
    INSERT INTO email_audit_logs (actor, action, entity_type, entity_id, payload)
    VALUES (
      ${input.actor},
      ${input.action},
      ${input.entityType},
      ${input.entityId || null},
      ${JSON.stringify(input.payload || {})}
    )
  `;
}
