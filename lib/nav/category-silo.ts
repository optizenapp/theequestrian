import { getPublishedCollectionNav } from '@/lib/content/collections';

export const TOP_LEVEL_HANDLES = ['horse', 'rider', 'clothing', 'pet', 'accessories'] as const;

const TOP_LABELS: Record<string, string> = {
  horse: 'Horse',
  rider: 'Rider',
  clothing: 'Clothing',
  pet: 'Pet',
  accessories: 'Accessories',
};

export type SiloLink = {
  path: string;
  label: string;
  children: SiloLink[];
};

export type CategorySiloNav = {
  currentPath: string;
  currentTopHandle: string | null;
  tops: SiloLink[];
  branches: SiloLink[];
};

function normalizePath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith('/')
    ? withSlash.slice(0, -1)
    : withSlash;
}

function depth(path: string): number {
  return normalizePath(path).split('/').filter(Boolean).length;
}

function parentOf(path: string): string {
  const parts = normalizePath(path).split('/').filter(Boolean);
  if (parts.length <= 1) return '';
  return '/' + parts.slice(0, -1).join('/');
}

export async function getCategorySiloNav(currentPath: string): Promise<CategorySiloNav> {
  const current = normalizePath(currentPath);
  const currentTopHandle = current.split('/').filter(Boolean)[0] || null;
  const inSilo =
    currentTopHandle &&
    (TOP_LEVEL_HANDLES as readonly string[]).includes(currentTopHandle);

  const rows = await getPublishedCollectionNav();
  const byPath = new Map(rows.map((row) => [normalizePath(row.path), row]));

  const tops: SiloLink[] = TOP_LEVEL_HANDLES.map((handle) => {
    const path = `/${handle}`;
    const row = byPath.get(path);
    return { path, label: row?.label || TOP_LABELS[handle], children: [] };
  });

  if (!inSilo || !currentTopHandle) {
    return { currentPath: current, currentTopHandle: null, tops, branches: [] };
  }

  const prefix = `/${currentTopHandle}`;
  const l2 = rows
    .filter((row) => {
      const path = normalizePath(row.path);
      return depth(path) === 2 && path.startsWith(`${prefix}/`);
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const l2Paths = new Set(l2.map((row) => normalizePath(row.path)));

  const branches: SiloLink[] = l2.map((row) => {
    const path = normalizePath(row.path);
    const children = rows
      .filter((child) => {
        const childPath = normalizePath(child.path);
        return depth(childPath) === 3 && parentOf(childPath) === path;
      })
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((child) => ({
        path: normalizePath(child.path),
        label: child.label,
        children: [],
      }));
    return { path, label: row.label, children };
  });

  // Published L3 whose parent was drafted: show as extra L2 so they stay linked.
  const orphans = rows.filter((row) => {
    const path = normalizePath(row.path);
    return (
      depth(path) === 3 &&
      path.startsWith(`${prefix}/`) &&
      !l2Paths.has(parentOf(path))
    );
  });
  for (const row of orphans) {
    branches.push({
      path: normalizePath(row.path),
      label: row.label,
      children: [],
    });
  }
  branches.sort((a, b) => a.label.localeCompare(b.label));

  return { currentPath: current, currentTopHandle, tops, branches };
}
