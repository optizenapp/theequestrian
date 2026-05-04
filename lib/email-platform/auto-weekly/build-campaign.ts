import { getAutoCampaignSlots } from '@/lib/email-platform/auto-campaigns/config';
import {
  buildAutoCampaignsForTomorrowAllTypes,
} from '@/lib/email-platform/auto-campaigns/build-one';
import type { AutoCampaignSelections } from '@/lib/email-platform/auto-campaigns/types';

export type { BatchBuildResult, BuildResult } from '@/lib/email-platform/auto-campaigns/build-one';

function getTomorrowInSydney(): Date {
  const utc = new Date();
  const sydneyDate = new Date(utc.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const tomorrow = new Date(sydneyDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

/**
 * Next automated send slot (tomorrow in Sydney) for preview / tooling.
 */
export async function getNextSendSlotInUTC(): Promise<{ scheduledAt: Date; label: string } | null> {
  const tomorrow = getTomorrowInSydney();
  const slots = await getAutoCampaignSlots();
  const slotDef = slots.find((s) => s.weekday === tomorrow.getDay());
  if (!slotDef) return null;

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const date = String(tomorrow.getDate()).padStart(2, '0');
  const hourStr = String(slotDef.hour).padStart(2, '0');
  const minute = slotDef.minute === 30 ? 30 : 0;
  const minuteStr = String(minute).padStart(2, '0');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const label = `${dayNames[tomorrow.getDay()]} ${tomorrow.getDate()} ${tomorrow.toLocaleString('en-AU', { month: 'short' })} ${year} at ${slotDef.hour}:${minuteStr} AEST`;
  const isoAEST = `${year}-${month}-${date}T${hourStr}:${minuteStr}:00+10:00`;
  return { scheduledAt: new Date(isoAEST), label };
}

export async function buildAutoWeeklyCampaign(options: { scheduledAtOverride?: Date; selectionOverride?: AutoCampaignSelections } = {}) {
  return buildAutoCampaignsForTomorrowAllTypes(options);
}
