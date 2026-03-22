/**
 * Top queries by total time and rows (pg_stat_statements). Uses the same DB as DATABASE_URL / POSTGRES_URL.
 * Run: npm run neon:top-queries
 */
import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

function readEnvLocalValue(key) {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return null;
  const text = fs.readFileSync(p, "utf8");
  const re = new RegExp(`^\\s*${key}\\s*=`, "m");
  const line = text.split("\n").find((l) => re.test(l));
  if (!line) return null;
  const raw = line.replace(new RegExp(`^\\s*${key}\\s*=\\s*`), "").trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  return raw.replace(/^export\s+/, "") || null;
}

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  readEnvLocalValue("DATABASE_URL") ||
  readEnvLocalValue("POSTGRES_URL");

if (!url) {
  console.error("Set DATABASE_URL or POSTGRES_URL (e.g. in .env.local).");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  try {
    await sql`SELECT 1 FROM pg_stat_statements LIMIT 1`;
  } catch (e) {
    console.error(
      "pg_stat_statements not available. Run once in Neon SQL Editor:\n  CREATE EXTENSION IF NOT EXISTS pg_stat_statements;\n",
      e.message,
    );
    process.exit(1);
  }

  console.log(
    "Database:",
    url.replace(/:[^:@]+@/, ":****@"),
    "\n(Use production branch URL to see prod traffic; dev is often quiet.)\n",
  );

  console.log("— Top by total execution time (excludes common Neon monitor queries) —\n");
  const a = await sql`
SELECT
  round(total_exec_time::numeric, 0) AS total_ms,
  calls,
  round((total_exec_time / NULLIF(calls, 0))::numeric, 1) AS avg_ms,
  rows AS total_rows,
  left(query, 120) AS query_preview
FROM pg_stat_statements
WHERE userid IS NOT NULL
  AND query NOT ILIKE '%neon.%'
  AND query NOT ILIKE '%pg_stat_activity%'
  AND query NOT ILIKE '%pg_stat_replication%'
  AND query NOT ILIKE '%pg_stat_subscription%'
  AND query NOT ILIKE '%neon_perf_counters%'
  AND query NOT ILIKE '%neon_lfc_stats%'
  AND query NOT ILIKE '%pg_database_size(%'
  AND query NOT ILIKE '%CREATE EXTENSION%'
ORDER BY total_exec_time DESC
LIMIT 15
`;
  console.table(a);

  console.log("\n— Top by total rows returned (egress-ish) —\n");
  const b = await sql`
SELECT
  rows AS total_rows,
  calls,
  round((rows::numeric / NULLIF(calls, 0)), 0) AS avg_rows_per_call,
  round(total_exec_time::numeric, 0) AS total_ms,
  left(query, 120) AS query_preview
FROM pg_stat_statements
WHERE calls > 0
  AND query NOT ILIKE '%neon.%'
  AND query NOT ILIKE '%pg_stat_activity%'
  AND query NOT ILIKE '%pg_stat_replication%'
  AND query NOT ILIKE '%pg_stat_subscription%'
  AND query NOT ILIKE '%neon_perf_counters%'
  AND query NOT ILIKE '%neon_lfc_stats%'
  AND query NOT ILIKE '%pg_database_size(%'
  AND query NOT ILIKE '%CREATE EXTENSION%'
ORDER BY rows DESC
LIMIT 15
`;
  console.table(b);

  console.log("\n— Top by call count —\n");
  const c = await sql`
SELECT
  calls,
  rows AS total_rows,
  round(total_exec_time::numeric, 0) AS total_ms,
  left(query, 120) AS query_preview
FROM pg_stat_statements
WHERE calls > 0
  AND query NOT ILIKE '%neon.%'
  AND query NOT ILIKE '%pg_stat_activity%'
  AND query NOT ILIKE '%pg_stat_replication%'
  AND query NOT ILIKE '%pg_stat_subscription%'
  AND query NOT ILIKE '%neon_perf_counters%'
  AND query NOT ILIKE '%neon_lfc_stats%'
  AND query NOT ILIKE '%pg_database_size(%'
  AND query NOT ILIKE '%CREATE EXTENSION%'
ORDER BY calls DESC
LIMIT 15
`;
  console.table(c);

  console.log(
    "\nStats reset when compute scales to zero. For prod diagnosis, run against main branch after load.\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
