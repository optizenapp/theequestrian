#!/usr/bin/env tsx

import { config } from 'dotenv';
import { resolve } from 'path';
import { sql } from '@vercel/postgres';
import { sendSesHtmlEmail } from '@/lib/email-platform/ses-mailer';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.production') });

function getArg(flag: string): string | undefined {
  const match = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  if (!match) return undefined;
  return match.split('=').slice(1).join('=');
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function toNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(4)}`;
}

function parseSince(): { since: Date; label: string } {
  const sinceArg = getArg('--since');
  const daysArg = getArg('--days');
  if (sinceArg) {
    const parsed = new Date(sinceArg);
    if (!Number.isFinite(parsed.getTime())) {
      throw new Error(`Invalid --since value: ${sinceArg}`);
    }
    return { since: parsed, label: `since ${parsed.toISOString()}` };
  }

  const days = daysArg ? Number(daysArg) : 1;
  const safeDays = Number.isFinite(days) && days > 0 ? days : 1;
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
  return { since, label: `last ${safeDays} day(s)` };
}

function formatReport(input: {
  label: string;
  totals: {
    total: number;
    applied: number;
    shadow: number;
    avgKoray: number;
    totalCost: number;
  };
  byType: Array<{ page_type: string; total: number; applied: number }>;
  latest: Array<{
    page_type: string;
    page_identifier: string;
    applied: boolean;
    koray_score: number;
    total_cost_usd: number;
    created_at: string;
  }>;
  failed: Array<{ page_type: string; page_identifier: string; error_message: string; updated_at: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`SEO Enrichment Report (${input.label})`);
  lines.push(`Total runs: ${formatNumber(input.totals.total)}`);
  lines.push(`Applied: ${formatNumber(input.totals.applied)} | Shadow: ${formatNumber(input.totals.shadow)}`);
  lines.push(`Avg Koray score: ${formatNumber(input.totals.avgKoray, 1)} | Total cost: ${formatCurrency(input.totals.totalCost)}`);
  lines.push('');
  lines.push('By Page Type:');
  for (const row of input.byType) {
    lines.push(`- ${row.page_type}: ${formatNumber(row.total)} total (${formatNumber(row.applied)} applied)`);
  }
  lines.push('');
  lines.push('Latest Updates:');
  for (const item of input.latest) {
    const applied = item.applied ? 'applied' : 'shadow';
    const score = Number.isFinite(item.koray_score) ? formatNumber(item.koray_score, 0) : 'n/a';
    lines.push(
      `- [${applied}] ${item.page_type} ${item.page_identifier} | Koray ${score} | ${formatCurrency(item.total_cost_usd)} | ${item.created_at}`
    );
  }
  if (input.failed.length > 0) {
    lines.push('');
    lines.push('Recent Failures:');
    for (const item of input.failed) {
      const preview = item.error_message ? item.error_message.slice(0, 120) : 'unknown error';
      lines.push(`- ${item.page_type} ${item.page_identifier} | ${preview} | ${item.updated_at}`);
    }
  }
  return lines.join('\n');
}

async function sendEmail(input: {
  subject: string;
  text: string;
  html: string;
  recipients: string[];
}) {
  const fromEmail = process.env.AWS_SES_FROM_EMAIL || 'noreply@theequestrian.com.au';
  await sendSesHtmlEmail({
    fromEmailAddress: `The Equestrian <${fromEmail}>`,
    toAddresses: input.recipients,
    subject: input.subject,
    htmlBody: input.html,
    textBody: input.text,
  });
}

async function main() {
  const { since, label } = parseSince();
  const sinceIso = since.toISOString();

  const totalsResult = await sql.query(
    `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE applied = TRUE) AS applied,
        COUNT(*) FILTER (WHERE applied = FALSE) AS shadow,
        AVG(NULLIF((after_scores->'korayCompliance'->>'score')::numeric, 0)) AS avg_koray,
        COALESCE(SUM(total_cost_usd), 0) AS total_cost
      FROM enrichment_log
      WHERE created_at >= $1::timestamptz
    `,
    [sinceIso]
  );

  const byTypeResult = await sql.query(
    `
      SELECT
        page_type,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE applied = TRUE) AS applied
      FROM enrichment_log
      WHERE created_at >= $1::timestamptz
      GROUP BY page_type
      ORDER BY total DESC
    `,
    [sinceIso]
  );

  const latestResult = await sql.query(
    `
      SELECT
        page_type,
        page_identifier,
        applied,
        COALESCE((after_scores->'korayCompliance'->>'score')::numeric, 0) AS koray_score,
        COALESCE(total_cost_usd, 0) AS total_cost_usd,
        created_at::text AS created_at
      FROM enrichment_log
      WHERE created_at >= $1::timestamptz
      ORDER BY created_at DESC
      LIMIT 20
    `,
    [sinceIso]
  );

  const failedResult = await sql.query(
    `
      SELECT
        page_type,
        page_identifier,
        error_message,
        updated_at::text AS updated_at
      FROM enrichment_queue
      WHERE status = 'failed'
        AND updated_at >= $1::timestamptz
      ORDER BY updated_at DESC
      LIMIT 10
    `,
    [sinceIso]
  );

  const totalsRow = totalsResult.rows[0] || {};
  const report = formatReport({
    label,
    totals: {
      total: toNumber(totalsRow.total),
      applied: toNumber(totalsRow.applied),
      shadow: toNumber(totalsRow.shadow),
      avgKoray: toNumber(totalsRow.avg_koray),
      totalCost: toNumber(totalsRow.total_cost),
    },
    byType: byTypeResult.rows.map((row) => ({
      page_type: String(row.page_type),
      total: toNumber(row.total),
      applied: toNumber(row.applied),
    })),
    latest: latestResult.rows.map((row) => ({
      page_type: String(row.page_type),
      page_identifier: String(row.page_identifier),
      applied: Boolean(row.applied),
      koray_score: toNumber(row.koray_score),
      total_cost_usd: toNumber(row.total_cost_usd),
      created_at: String(row.created_at),
    })),
    failed: failedResult.rows.map((row) => ({
      page_type: String(row.page_type),
      page_identifier: String(row.page_identifier),
      error_message: String(row.error_message || ''),
      updated_at: String(row.updated_at),
    })),
  });

  console.log(report);

  const shouldEmail = hasFlag('--email') || process.env.SEO_ENRICHMENT_REPORT_AUTOSEND === 'true';
  const recipients = (process.env.SEO_ENRICHMENT_REPORT_EMAIL || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  if (shouldEmail && recipients.length > 0) {
    const subject = `SEO Enrichment Report (${label})`;
    const html = `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${report}</pre>`;
    await sendEmail({ subject, text: report, html, recipients });
  }
}

main().catch((error) => {
  console.error('[seo-enrichment-report] fatal error:', error);
  process.exit(1);
});
