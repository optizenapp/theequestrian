#!/usr/bin/env tsx
/**
 * Cancel duplicate scheduled review emails, keeping one per customer.
 *
 * Usage:
 *   tsx scripts/cancel-duplicate-scheduled-review-emails.ts
 *   tsx scripts/cancel-duplicate-scheduled-review-emails.ts --apply
 *   tsx scripts/cancel-duplicate-scheduled-review-emails.ts --apply --email=bentricia@bigpond.com
 *
 * Notes:
 * - Default mode is dry-run (no cancellation writes).
 * - Keeps the oldest scheduled row per normalized customer email.
 * - With SES, scheduled sends are stored in DB until due; cancellation is DB-only.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

type ScheduledDuplicateRow = {
  id: string;
  order_id: string;
  customer_email: string;
  resend_email_id: string | null;
  created_at: string;
  scheduled_at: string | null;
  rn: number;
  normalized_email: string;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getArgValue(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.slice(flag.length + 1);
}

async function loadScheduledRowsForEmail(email?: string): Promise<ScheduledDuplicateRow[]> {
  if (email) {
    const result = await sql`
      SELECT
        id,
        order_id,
        customer_email,
        resend_email_id,
        created_at,
        scheduled_at,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(customer_email))
          ORDER BY created_at ASC, id ASC
        ) AS rn,
        LOWER(TRIM(customer_email)) AS normalized_email
      FROM review_email_sends
      WHERE status = 'scheduled'
        AND LOWER(TRIM(customer_email)) = LOWER(TRIM(${email}))
      ORDER BY normalized_email, created_at ASC, id ASC
    `;
    return result.rows as ScheduledDuplicateRow[];
  }

  const result = await sql`
    SELECT
      id,
      order_id,
      customer_email,
      resend_email_id,
      created_at,
      scheduled_at,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(customer_email))
        ORDER BY created_at ASC, id ASC
      ) AS rn,
      LOWER(TRIM(customer_email)) AS normalized_email
    FROM review_email_sends
    WHERE status = 'scheduled'
    ORDER BY normalized_email, created_at ASC, id ASC
  `;
  return result.rows as ScheduledDuplicateRow[];
}

async function markCancelled(id: string, reason: string, errorMessage: string | null): Promise<void> {
  await sql`
    UPDATE review_email_sends
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancel_reason = ${reason},
        error_message = ${errorMessage}
    WHERE id = ${id}
      AND status = 'scheduled'
  `;
}

async function main() {
  const apply = hasFlag('--apply');
  const email = getArgValue('--email')?.trim();

  console.log('🚀 Review email duplicate cancellation');
  console.log(`   Mode: ${apply ? 'APPLY (cancel duplicates)' : 'DRY RUN'}`);
  console.log(`   Scope: ${email ? email : 'all customers'}`);

  const rows = await loadScheduledRowsForEmail(email);
  const keep = rows.filter((row) => Number(row.rn) === 1);
  const duplicates = rows.filter((row) => Number(row.rn) > 1);

  const uniqueCustomers = new Set(rows.map((row) => row.normalized_email)).size;
  const duplicateCustomers = new Set(duplicates.map((row) => row.normalized_email)).size;

  console.log('\n📊 Scheduled review-email snapshot');
  console.log(`   Scheduled rows scanned: ${rows.length}`);
  console.log(`   Unique customers: ${uniqueCustomers}`);
  console.log(`   Rows kept (one per customer): ${keep.length}`);
  console.log(`   Duplicate rows to cancel: ${duplicates.length}`);
  console.log(`   Customers with duplicates: ${duplicateCustomers}`);

  if (duplicates.length === 0) {
    console.log('\n✅ No duplicate scheduled review emails found.');
    return;
  }

  if (!apply) {
    console.log('\n🔎 Dry-run sample (first 20 duplicates):');
    for (const row of duplicates.slice(0, 20)) {
      console.log(
        `   - ${row.customer_email} | order=${row.order_id} | sendId=${row.id} | providerId=${row.resend_email_id || 'none'}`
      );
    }
    console.log('\nRun again with --apply to cancel these duplicates.');
    return;
  }

  let cancelled = 0;

  for (const row of duplicates) {
    await markCancelled(
      row.id,
      'Auto-cancelled duplicate scheduled review email (keep one per customer)',
      null
    );
    cancelled += 1;
  }

  console.log('\n✅ Cancellation run complete');
  console.log(`   Cancelled in DB: ${cancelled}`);
}

main().catch((error) => {
  console.error('\n❌ Script failed:', error);
  process.exit(1);
});
