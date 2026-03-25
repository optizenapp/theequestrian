/**
 * Last 24 hours: public egress + compute (Neon Consumption API v2, hourly buckets).
 * Uses NEON_API_KEY, NEON_ORG_ID (optional), NEON_PROJECT_ID (optional) from env or .env.local.
 *
 * Run: npm run neon:usage:24h
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

function fmtBytes(n) {
  if (n == null || Number.isNaN(n)) return "?";
  const gb = n / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(3)} GB`;
  const mb = n / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${n} B`;
}

function fmtCuHrs(cuSeconds) {
  if (cuSeconds == null || Number.isNaN(cuSeconds)) return "?";
  return `${(cuSeconds / 3600).toFixed(3)} CU-hrs`;
}

function toIso(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function floorToHourUtc(d) {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  x.setUTCMilliseconds(0);
  return x;
}

const API_KEY = process.env.NEON_API_KEY || readEnvLocalValue("NEON_API_KEY");
const PROJECT_ID = process.env.NEON_PROJECT_ID || readEnvLocalValue("NEON_PROJECT_ID");
let ORG_ID = process.env.NEON_ORG_ID || readEnvLocalValue("NEON_ORG_ID");

async function api(pathAndQuery) {
  const res = await fetch(`${BASE}${pathAndQuery}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${API_KEY}` },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const err = new Error(`${res.status} ${json.message || json.error || text}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function main() {
  if (!API_KEY) {
    console.error(
      "Missing NEON_API_KEY. Add to .env.local or export it (Neon → Account → API keys).\n",
    );
    process.exit(1);
  }

  if (!ORG_ID) {
    try {
      const { organizations } = await api("/users/me/organizations");
      const orgs = organizations || [];
      if (!orgs.length) {
        console.error("No organizations; set NEON_ORG_ID in .env.local.\n");
        process.exit(1);
      }
      ORG_ID = orgs[0].id;
      if (orgs.length > 1) {
        console.log(`(Using first org; set NEON_ORG_ID to override)\n`);
      }
    } catch (e) {
      const msg = String(e.message || "");
      if (
        e.status === 404 &&
        (msg.includes("organization API keys") || msg.includes("not allowed for organization"))
      ) {
        console.error(
          "This API key cannot call the Consumption API. Use a personal/org API key from Neon → Account → API keys,\n" +
            "and set NEON_ORG_ID if you have multiple orgs.\n",
        );
        process.exit(1);
      }
      throw e;
    }
  }

  const now = new Date();
  const toHour = floorToHourUtc(now);
  const fromHour = new Date(toHour.getTime() - 24 * 3600 * 1000);

  const metrics =
    "public_network_transfer_bytes,private_network_transfer_bytes,compute_unit_seconds";
  const q = new URLSearchParams({
    org_id: ORG_ID,
    from: toIso(fromHour),
    to: toIso(toHour),
    granularity: "hourly",
    metrics,
  });
  if (PROJECT_ID) q.set("project_ids", PROJECT_ID);

  let hourlyData;
  try {
    hourlyData = await api(`/consumption_history/v2/projects?${q}`);
  } catch (e) {
    if (e.status === 406) {
      console.error(
        "406: requested window not available (billing period / retention). Try again later or shorten the range.\n",
      );
    }
    throw e;
  }

  const rows = [];
  for (const proj of hourlyData.projects || []) {
    const pid = proj.project_id;
    for (const period of proj.periods || []) {
      for (const row of period.consumption || []) {
        const pub = row.metrics?.find((m) => m.metric_name === "public_network_transfer_bytes");
        const priv = row.metrics?.find((m) => m.metric_name === "private_network_transfer_bytes");
        const cu = row.metrics?.find((m) => m.metric_name === "compute_unit_seconds");
        rows.push({
          start: row.timeframe_start,
          project_id: pid,
          publicBytes: pub?.value ?? 0,
          privateBytes: priv?.value ?? 0,
          cuSec: cu?.value ?? 0,
        });
      }
    }
  }

  let sumPub = 0;
  let sumPriv = 0;
  let sumCu = 0;
  for (const r of rows) {
    sumPub += r.publicBytes;
    sumPriv += r.privateBytes;
    sumCu += r.cuSec;
  }

  console.log("Neon — last 24 hours (UTC, hour buckets; matches billing egress/compute)\n");
  console.log(`  window:     ${toIso(fromHour)} → ${toIso(toHour)}`);
  console.log(`  scope:      ${PROJECT_ID ? `project ${PROJECT_ID}` : "all projects in org"}`);
  console.log(`  public:     ${fmtBytes(sumPub)}`);
  console.log(`  private:    ${fmtBytes(sumPriv)}`);
  console.log(`  compute:    ${fmtCuHrs(sumCu)}\n`);

  const byTime = [...rows].sort((a, b) => a.start.localeCompare(b.start));
  const withData = byTime.filter((r) => r.publicBytes || r.cuSec);
  if (withData.length) {
    console.log("  hourly breakdown:\n");
    for (const r of withData) {
      console.log(
        `    ${r.start}  ${fmtBytes(r.publicBytes).padStart(12)}  ${fmtCuHrs(r.cuSec).padStart(14)}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
