/**
 * Collective / marketplace vendor name aliases for shipping rate lookup.
 * Groups come from the warehouse registry (same keys cart/PDP use for origin).
 */

import { listWarehouses } from '@/lib/warehouses/registry';

export function normalizeVendorKey(vendor: string): string {
  return vendor.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Extra spelling variants not always listed on a warehouse row. */
const EXTRA_ALIASES: string[][] = [
  ['JNK Collective', 'JnK Collective', 'JNK'],
  [
    'Living Horse Tales Jewellery By Monika',
    'Living Horse Tails Jewellery By Monika',
    'Living Horse Tails Jewellery by Monika',
    'Living Horse Tales Jewellery by Monika',
  ],
  ['Little Equine Co', 'Little Equine Co.', 'Little Equine'],
  ['Trailrace', 'Trailrace Equestrian Outfitters'],
  ['Toptac International', 'Toptac'],
  ['Dapple EQ', 'Dapple Eq'],
  ['QJ Riding Wear', 'QJ Ridingwear'],
];

let aliasGroups: string[][] | null = null;
let aliasToGroup: Map<string, string[]> | null = null;

function buildAliasIndex(): void {
  const groups: string[][] = [];
  for (const warehouse of listWarehouses()) {
    if (warehouse.vendorNames.length > 0) {
      groups.push([...warehouse.vendorNames]);
    }
  }
  groups.push(...EXTRA_ALIASES.map((group) => [...group]));

  // Merge overlapping groups so Trailrace registry + EXTRA share one set.
  const parent = new Map<string, string>();
  const members = new Map<string, Set<string>>();

  function find(key: string): string {
    const p = parent.get(key);
    if (!p || p === key) return key;
    const root = find(p);
    parent.set(key, root);
    return root;
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    parent.set(rb, ra);
    const setA = members.get(ra) ?? new Set([ra]);
    const setB = members.get(rb) ?? new Set([rb]);
    for (const item of setB) setA.add(item);
    members.set(ra, setA);
    members.delete(rb);
  }

  for (const group of groups) {
    const keys = group.map(normalizeVendorKey).filter(Boolean);
    if (keys.length === 0) continue;
    for (const key of keys) {
      if (!parent.has(key)) {
        parent.set(key, key);
        members.set(key, new Set([key]));
      }
    }
    for (let i = 1; i < keys.length; i += 1) {
      union(keys[0], keys[i]);
    }
    // Keep display spellings for reverse lookup of rate row names.
    const root = find(keys[0]);
    const set = members.get(root) ?? new Set();
    for (const name of group) {
      set.add(normalizeVendorKey(name));
    }
    members.set(root, set);
  }

  const merged: string[][] = [];
  const index = new Map<string, string[]>();
  for (const [root, set] of members) {
    if (find(root) !== root) continue;
    const group = [...set];
    merged.push(group);
    for (const key of group) {
      index.set(key, group);
    }
  }

  aliasGroups = merged;
  aliasToGroup = index;
}

/** All normalized vendor keys that should share the same shipping rate row. */
export function getVendorAliasKeys(vendor: string): string[] {
  if (!vendor.trim()) return [];
  if (!aliasToGroup) buildAliasIndex();
  const key = normalizeVendorKey(vendor);
  const group = aliasToGroup!.get(key);
  return group ? [...group] : [key];
}
