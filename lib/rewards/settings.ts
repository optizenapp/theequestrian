import { ensureRewardsColumns } from '@/lib/db/ensure-rewards-columns';
import { sql } from '@/lib/db/vercel-postgres';

export type RewardsSettings = {
  recordingEnabled: boolean;
  estimateEnabled: boolean;
  issuanceEnabled: boolean;
  redemptionEnabled: boolean;
  rateBps: number;
  launchAt: Date | null;
};

export type RewardsSettingsUpdate = {
  recordingEnabled?: boolean;
  estimateEnabled?: boolean;
  rateBps?: number;
};

const DISABLED: RewardsSettings = {
  recordingEnabled: false,
  estimateEnabled: false,
  issuanceEnabled: false,
  redemptionEnabled: false,
  rateBps: 200,
  launchAt: null,
};

type SettingsRow = {
  recording_enabled: boolean;
  estimate_enabled: boolean;
  issuance_enabled: boolean;
  redemption_enabled: boolean;
  rate_bps: number;
  launch_at: string | Date | null;
};

/** Fails closed: a missing table or row means the program is off. */
export async function getRewardsSettings(): Promise<RewardsSettings> {
  try {
    await ensureRewardsColumns();
    const result = await sql<SettingsRow>`
      SELECT recording_enabled, estimate_enabled, issuance_enabled, redemption_enabled, rate_bps, launch_at
      FROM rewards_settings WHERE id = 1
    `;
    const row = result.rows[0];
    if (!row) return DISABLED;
    return {
      recordingEnabled: row.recording_enabled,
      estimateEnabled: row.estimate_enabled,
      issuanceEnabled: row.issuance_enabled,
      redemptionEnabled: row.redemption_enabled,
      rateBps: row.rate_bps,
      launchAt: row.launch_at ? new Date(row.launch_at) : null,
    };
  } catch (error) {
    console.error('[rewards] Failed to load settings; treating program as disabled:', error);
    return DISABLED;
  }
}

/**
 * Issuance and redemption are deliberately not writable here; they stay off until built and tested.
 * The launch timestamp is set once, the first time recording is enabled, and never moved.
 */
export async function updateRewardsSettings(update: RewardsSettingsUpdate): Promise<RewardsSettings> {
  if (update.rateBps !== undefined && (!Number.isInteger(update.rateBps) || update.rateBps < 0 || update.rateBps > 1000)) {
    throw new RangeError('rateBps must be an integer between 0 and 1000');
  }
  await ensureRewardsColumns();
  await sql`
    UPDATE rewards_settings SET
      recording_enabled = COALESCE(${update.recordingEnabled ?? null}::boolean, recording_enabled),
      estimate_enabled = COALESCE(${update.estimateEnabled ?? null}::boolean, estimate_enabled),
      rate_bps = COALESCE(${update.rateBps ?? null}::integer, rate_bps),
      launch_at = CASE
        WHEN launch_at IS NULL AND COALESCE(${update.recordingEnabled ?? null}::boolean, FALSE) THEN NOW()
        ELSE launch_at
      END,
      updated_at = NOW()
    WHERE id = 1
  `;
  return getRewardsSettings();
}
