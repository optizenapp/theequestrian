/**
 * Neon usage: org list + hourly/daily transfer (Consumption API v2), or project totals only
 * if NEON_API_KEY is project-scoped (Project settings → API keys).
 * Reads NEON_API_KEY, NEON_PROJECT_ID, NEON_ORG_ID from .env.local (line-based; does not source the file).
 */
import fs from "fs";
import path from "path";

const BASE = "https://console.neon.tech/api/v2";

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

function readNeonApiKeyFromEnvLocal() {
  return readEnvLocalValue("NEON_API_KEY");
}

const API_KEY = process.env.NEON_API_KEY || readNeonApiKeyFromEnvLocal();
const PROJECT_ID = process.env.NEON_PROJECT_ID || readEnvLocalValue("NEON_PROJECT_ID");
const ORG_ID_ENV = process.env.NEON_ORG_ID || readEnvLocalValue("NEON_ORG_ID");

function fmtBytes(n) {
  if (n == null || Number.isNaN(n)) return "?";
  const gb = n / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = n / (1024 ** 2);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${n} B`;
}

/** Neon consumption metric: compute unit-seconds → CU-hrs for readability */
function fmtCuHrs(cuSeconds) {
  if (cuSeconds == null || Number.isNaN(cuSeconds)) return "?";
  return `${(cuSeconds / 3600).toFixed(2)} CU-hrs`;
}

async function api(pathAndQuery) {
  const res = await fetch(`${BASE}${pathAndQuery}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const msg = json.message || json.error || text || res.statusText;
    const err = new Error(`${res.status} ${msg}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

function toIso(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Neon hourly consumption requires `from`/`to` aligned to hour boundaries (max 168h window). */
function floorToHourUtc(d) {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  x.setUTCMilliseconds(0);
  return x;
}

async function projectScopedFallback() {
  if (!PROJECT_ID) {
    console.error(
      "This API key is project-scoped. Add NEON_PROJECT_ID to .env.local (Project settings → General in Neon).\n",
    );
    process.exit(1);
  }
  console.log("— Project totals (project-scoped API key) —\n");
  const { project } = await api(`/projects/${PROJECT_ID}`);
  const cuSec = project.cpu_used_sec ?? project.compute_time_seconds ?? 0;
  console.log(`  Name:              ${project.name}`);
  console.log(`  Project ID:        ${project.id}`);
  console.log(`  Org ID:            ${project.org_id || "n/a"}`);
  console.log(`  Network transfer:  ${fmtBytes(project.data_transfer_bytes)} (period; matches billing)`);
  console.log(
    `  Compute:           ${fmtCuHrs(cuSec)}  (Neon stores compute-unit-seconds; ÷3600 ≈ CU-hrs on your invoice)`,
  );
  console.log(`  Storage (synth):   ${fmtBytes(project.synthetic_storage_size)}`);
  if (project.consumption_period_start && project.consumption_period_end) {
    console.log(
      `  Usage window:      ${project.consumption_period_start} → ${project.consumption_period_end}`,
    );
  }

  console.log("\n— Branches (where cost piles up: transfer + compute) —\n");
  const { branches } = await api(`/projects/${PROJECT_ID}/branches`);
  const rows = (branches || [])
    .map((b) => ({
      name: b.name || b.id,
      primary: b.primary,
      transfer: Number(b.data_transfer_bytes) || 0,
      cuSec: Number(b.cpu_used_sec ?? b.compute_time_seconds) || 0,
      activeSec: Number(b.active_time_seconds) || 0,
      logical: Number(b.logical_size) || 0,
    }))
    .sort((a, b) => b.transfer - a.transfer);

  const totT = rows.reduce((s, r) => s + r.transfer, 0);
  const totCu = rows.reduce((s, r) => s + r.cuSec, 0);

  console.log(
    `${"Branch".padEnd(14)} ${"Egress".padStart(14)} ${"%".padStart(6)} ${"CU-hrs".padStart(10)} ${"%CU".padStart(6)} ${"Active (s)".padStart(12)} ${"DB size".padStart(12)}`,
  );
  for (const r of rows) {
    const pT = totT ? ((100 * r.transfer) / totT).toFixed(1) : "0";
    const pC = totCu ? ((100 * r.cuSec) / totCu).toFixed(1) : "0";
    console.log(
      `${r.name.slice(0, 13).padEnd(14)} ${fmtBytes(r.transfer).padStart(14)} ${pT.padStart(5)}% ${fmtCuHrs(r.cuSec).padStart(10)} ${pC.padStart(5)}% ${String(r.activeSec).padStart(12)} ${fmtBytes(r.logical).padStart(12)}`,
    );
  }
  console.log(
    `\n  Egress is almost always the $ driver past free allowance; CPU shows which branch keeps compute busy.\n` +
      `  If one branch dominates egress, point app/scripts at prod only and avoid heavy jobs on preview/dev.\n`,
  );

  console.log(
    "\n— Hourly time series —\n" +
      "  Project-scoped keys cannot call the Consumption API. Use a personal API key (Account → API keys)\n" +
      "  plus NEON_ORG_ID to run this script for top hours by transfer + compute.\n",
  );
}

async function main() {
  if (!API_KEY) {
    console.error(
      "Missing NEON_API_KEY. Create one in Neon Console → Account → API keys, then either:\n" +
        "  export NEON_API_KEY=neon_api_...\n" +
        "  or add NEON_API_KEY=neon_api_... to .env.local\n",
    );
    process.exit(1);
  }

  let orgIdFinal = ORG_ID_ENV;

  console.log("— Organizations —\n");
  let orgsRes;
  try {
    orgsRes = await api("/users/me/organizations");
  } catch (e) {
    const msg = String(e.message || "");
    if (
      e.status === 404 &&
      (msg.includes("organization API keys") || msg.includes("not allowed for organization"))
    ) {
      console.log(
        "  (Personal/org API key required to list organizations — using project-scoped fallback.)\n",
      );
      await projectScopedFallback();
      return;
    }
    throw e;
  }

  const orgs = orgsRes.organizations || [];
  if (!orgs.length) {
    console.log("No organizations returned.");
    process.exit(0);
  }

  for (const o of orgs) {
    console.log(`${o.name}\n  org_id: ${o.id}\n  plan: ${o.plan || "n/a"}\n`);
  }

  const orgId = orgs[0].id;
  if (orgs.length > 1 && !ORG_ID_ENV) {
    console.log(`(Using first org for consumption: ${orgId}. Set NEON_ORG_ID to override.)\n`);
  }

  orgIdFinal = ORG_ID_ENV || orgId;

  const now = new Date();
  const toHour = floorToHourUtc(now);
  /** Hourly API only has buckets from ~billing period / retention start; requesting older `from` returns 406. */
  let hourFrom = new Date(toHour.getTime() - 168 * 3600 * 1000);
  if (PROJECT_ID) {
    try {
      const { project: p } = await api(`/projects/${PROJECT_ID}`);
      if (p.consumption_period_start) {
        const ps = floorToHourUtc(new Date(p.consumption_period_start));
        if (hourFrom < ps) hourFrom = ps;
      }
    } catch {
      /* ignore */
    }
  }
  const march1 = new Date("2026-03-01T00:00:00Z");
  const dailyTo = now;

  const metrics =
    "public_network_transfer_bytes,private_network_transfer_bytes,compute_unit_seconds";

  const filterNote = PROJECT_ID ? `project_ids=${PROJECT_ID}` : "all projects in org";
  console.log(`— Hourly usage (last 7 days, ${filterNote}) —\n`);

  let hourlyData;
  try {
    const tryWindows = [0, 120, 96, 72, 48, 24].map((h) =>
      h === 0 ? hourFrom : new Date(toHour.getTime() - h * 3600 * 1000),
    );
    let lastErr;
    for (const fromCandidate of tryWindows) {
      if (fromCandidate >= toHour) continue;
      try {
        const q = new URLSearchParams({
          org_id: orgIdFinal,
          from: toIso(fromCandidate),
          to: toIso(toHour),
          granularity: "hourly",
          metrics,
        });
        if (PROJECT_ID) {
          q.set("project_ids", PROJECT_ID);
        }
        hourlyData = await api(`/consumption_history/v2/projects?${q}`);
        if (fromCandidate !== hourFrom) {
          console.log(
            `  (Hourly window clipped to ${toIso(fromCandidate)} → ${toIso(toHour)}; full 168h unavailable yet.)\n`,
          );
        }
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (e.status !== 406) throw e;
      }
    }
    if (!hourlyData && lastErr) throw lastErr;
  } catch (e) {
    if (e.status === 403) {
      console.error(
        "Consumption API returned 403. It requires a usage-based plan (Launch / Scale / etc.).\n" +
          "Use the Neon Console project dashboard and branch `data_transfer_bytes` via API instead.\n",
        e.message,
      );
      process.exit(1);
    }
    throw e;
  }

  /** Merge buckets: API may split metrics across rows for the same hour */
  const hourlyMap = new Map();
  for (const proj of hourlyData.projects || []) {
    const pid = proj.project_id;
    for (const period of proj.periods || []) {
      for (const row of period.consumption || []) {
        const key = `${pid}|${row.timeframe_start}`;
        const pub = row.metrics?.find((m) => m.metric_name === "public_network_transfer_bytes");
        const cu = row.metrics?.find((m) => m.metric_name === "compute_unit_seconds");
        const prev = hourlyMap.get(key) || { project_id: pid, start: row.timeframe_start, bytes: 0, cuSec: 0 };
        prev.bytes += pub?.value ?? 0;
        prev.cuSec += cu?.value ?? 0;
        hourlyMap.set(key, prev);
      }
    }
  }
  const hourlyRows = [...hourlyMap.values()].filter((r) => r.bytes || r.cuSec);

  const byTransfer = [...hourlyRows].sort((a, b) => b.bytes - a.bytes);
  const byCompute = [...hourlyRows].sort((a, b) => b.cuSec - a.cuSec);

  console.log("Top 15 hours by egress (public_network_transfer_bytes):\n");
  for (const row of byTransfer.slice(0, 15)) {
    console.log(
      `  ${row.start}  ${fmtBytes(row.bytes).padStart(12)}  ${fmtCuHrs(row.cuSec).padStart(12)}  ${row.project_id}`,
    );
  }
  if (!byTransfer.length) {
    console.log("  (no hourly rows — check project_ids / org_id)\n");
  } else {
    const sumBytes = hourlyRows.reduce((s, r) => s + r.bytes, 0);
    const sumCu = hourlyRows.reduce((s, r) => s + r.cuSec, 0);
    console.log(
      `\n  7d sum: ${fmtBytes(sumBytes)} egress, ${fmtCuHrs(sumCu)} compute (in window)\n`,
    );
  }

  console.log("Top 15 hours by compute (compute_unit_seconds → CU-hrs):\n");
  for (const row of byCompute.slice(0, 15)) {
    console.log(
      `  ${row.start}  ${fmtCuHrs(row.cuSec).padStart(12)}  ${fmtBytes(row.bytes).padStart(12)}  ${row.project_id}`,
    );
  }
  console.log("");

  console.log(`— Daily usage (2026-03-01 → now, ${filterNote}) —\n`);

  const dailyQ = new URLSearchParams({
    org_id: orgIdFinal,
    from: toIso(march1),
    to: toIso(dailyTo),
    granularity: "daily",
    metrics,
  });
  if (PROJECT_ID) {
    dailyQ.set("project_ids", PROJECT_ID);
  }
  const dailyData = await api(`/consumption_history/v2/projects?${dailyQ}`);

  const dailyByDay = new Map();
  const dailyCuByDay = new Map();
  for (const proj of dailyData.projects || []) {
    for (const period of proj.periods || []) {
      for (const row of period.consumption || []) {
        const pub = row.metrics?.find((m) => m.metric_name === "public_network_transfer_bytes");
        const cu = row.metrics?.find((m) => m.metric_name === "compute_unit_seconds");
        const bytes = pub?.value ?? 0;
        const cuSec = cu?.value ?? 0;
        const day = row.timeframe_start?.slice(0, 10) || "?";
        dailyByDay.set(day, (dailyByDay.get(day) || 0) + bytes);
        dailyCuByDay.set(day, (dailyCuByDay.get(day) || 0) + cuSec);
      }
    }
  }

  const allDays = new Set([...dailyByDay.keys(), ...dailyCuByDay.keys()]);
  const days = [...allDays].sort((a, b) => a.localeCompare(b));
  let monthSum = 0;
  let monthCu = 0;
  for (const day of days) {
    const bytes = dailyByDay.get(day) || 0;
    const cuSec = dailyCuByDay.get(day) || 0;
    monthSum += bytes;
    monthCu += cuSec;
    console.log(
      `  ${day}  egress ${fmtBytes(bytes).padStart(14)}   compute ${fmtCuHrs(cuSec).padStart(12)}`,
    );
  }
  console.log(
    `\n  Period total: ${fmtBytes(monthSum)} egress, ${fmtCuHrs(monthCu)} compute\n`,
  );

  console.log("— Project IDs (for Console / branch APIs) —\n");
  const projectList = await api(
    `/projects?limit=100&org_id=${encodeURIComponent(orgIdFinal)}`,
  );
  for (const p of projectList.projects || []) {
    console.log(`  ${p.name || "(unnamed)"}  id=${p.id}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
