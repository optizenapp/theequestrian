/**
 * Shared Collective retail inference from synced unit cost + margin %.
 */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function inferCollectiveRetail(cost: number, marginPct: number): number {
  if (!(cost > 0) || !(marginPct > 0) || marginPct >= 100) return round2(cost);
  const raw = cost / (1 - marginPct / 100);
  const floor = Math.floor(raw + 1e-9);
  const candidates = [
    round2(floor + 0.95),
    round2(floor + 0.9),
    round2(floor + 1.0),
    round2(Math.round(raw * 20) / 20),
    round2(raw),
    Math.round(raw),
  ];
  let best = candidates[0]!;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    if (c < cost - 0.001) continue;
    const diff = Math.abs(c - raw);
    const ending = Math.round((c % 1) * 100);
    const prefer = ending === 95 ? 0 : ending === 90 ? 1 : ending === 0 ? 2 : 3;
    const score = diff * 1000 + prefer;
    if (score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return round2(best);
}

/** Known retailer margins from Collective dashboards (override auto-detect). */
export const KNOWN_COLLECTIVE_MARGINS: Record<string, number> = {
  'toptac international': 10,
};
