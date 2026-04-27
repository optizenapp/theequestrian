import type { AutoCampaignType } from '@/lib/email-platform/auto-campaigns/types';
import {
  SLOTS_BACKUP_KEY,
  buildPatchBodyFromSnapshot,
  singleSlotForTomorrow,
} from './auto-flow-test-helpers';

async function readError(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return res.statusText || 'Request failed';
  }
}

export function triggerJsonDownload(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function fetchSettingsExport(): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const res = await fetch('/api/admin/email/auto-campaigns/settings', { cache: 'no-store' });
  if (!res.ok) return { ok: false, error: await readError(res) };
  return { ok: true, data: await res.json() };
}

export async function patchSettings(body: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch('/api/admin/email/auto-campaigns/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, error: await readError(res) };
  return { ok: true };
}

export async function restoreSettingsFromFileText(text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: 'Invalid JSON' };
  }
  return patchSettings(buildPatchBodyFromSnapshot(parsed));
}

export async function restoreSlotsFromSessionBackup(): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = sessionStorage.getItem(SLOTS_BACKUP_KEY);
  if (!raw) {
    return {
      ok: false,
      error: 'No slot backup in this tab. Run “Set tomorrow slot & build” first, or restore from JSON file.',
    };
  }
  let slots: unknown;
  try {
    slots = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: 'Invalid backup' };
  }
  if (!Array.isArray(slots)) return { ok: false, error: 'Invalid backup' };
  const result = await patchSettings({ slots });
  if (result.ok) sessionStorage.removeItem(SLOTS_BACKUP_KEY);
  return result;
}

export async function backupSlotsPatchTomorrowAndBuild(
  flowType: AutoCampaignType,
  slotHour: number,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const get = await fetchSettingsExport();
  if (!get.ok) return get;
  const settings = get.data as { slots?: unknown };
  if (!Array.isArray(settings.slots)) return { ok: false, error: 'Could not read current slots' };
  sessionStorage.setItem(SLOTS_BACKUP_KEY, JSON.stringify(settings.slots));

  const newSlots = singleSlotForTomorrow(flowType, slotHour);
  const patched = await patchSettings({ slots: newSlots });
  if (!patched.ok) return patched;

  const buildRes = await fetch('/api/admin/email/auto-campaigns/run-build', { method: 'POST' });
  if (!buildRes.ok) return { ok: false, error: await readError(buildRes) };
  const buildJson = (await buildRes.json()) as { campaignId?: string; message?: string };
  const message = buildJson.campaignId
    ? `Build OK. campaignId=${buildJson.campaignId}. Check jono@theequestrian.com.au for approval email. Restore slots when done.`
    : (buildJson.message ?? JSON.stringify(buildJson));
  return { ok: true, message };
}
