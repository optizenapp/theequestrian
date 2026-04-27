import type { AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';

export const SLOTS_BACKUP_KEY = 'autoCampaignFlowTest_slotsBackup';

/** Tomorrow’s weekday (0–6) in Australia/Sydney, matching build-one.ts. */
export function getTomorrowWeekdaySydney(): number {
  const utc = new Date();
  const sydneyDate = new Date(utc.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const tomorrow = new Date(sydneyDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getDay();
}

export function buildPatchBodyFromSnapshot(parsed: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (typeof parsed.enabled === 'boolean') body.enabled = parsed.enabled;
  if (parsed.audience && typeof parsed.audience === 'object' && !Array.isArray(parsed.audience)) {
    body.audience = parsed.audience;
  }
  if (parsed.enabledTypes && typeof parsed.enabledTypes === 'object' && !Array.isArray(parsed.enabledTypes)) {
    body.enabledTypes = parsed.enabledTypes;
  }
  if (Array.isArray(parsed.slots)) body.slots = parsed.slots;
  if (Array.isArray(parsed.categoryPool)) body.categoryPool = parsed.categoryPool;
  if (parsed.resend && typeof parsed.resend === 'object' && !Array.isArray(parsed.resend)) {
    body.resend = parsed.resend;
  }
  if (parsed.templatesByType && typeof parsed.templatesByType === 'object' && !Array.isArray(parsed.templatesByType)) {
    body.templatesByType = parsed.templatesByType;
  }
  if (typeof parsed.introPrompt === 'string') body.introPrompt = parsed.introPrompt;
  if (typeof parsed.subjectPrompt === 'string') body.subjectPrompt = parsed.subjectPrompt;
  if (parsed.templateVersionId !== undefined) {
    body.templateVersionId =
      parsed.templateVersionId === null || parsed.templateVersionId === ''
        ? null
        : String(parsed.templateVersionId);
  }
  return body;
}

export function singleSlotForTomorrow(type: AutoCampaignType, hour: number): Array<{ type: AutoCampaignType; weekday: number; hour: number }> {
  const h = Math.min(23, Math.max(0, Math.floor(hour)));
  return [{ type, weekday: getTomorrowWeekdaySydney(), hour: h }];
}
