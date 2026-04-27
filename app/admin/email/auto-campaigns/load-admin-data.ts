type ListRow = { id: string; name: string };

export async function parseAdminJson(res: Response): Promise<Record<string, unknown>> {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : `HTTP ${res.status}`;
    const detail = typeof data.detail === 'string' ? `: ${data.detail}` : '';
    throw new Error(`${msg}${detail}`);
  }
  return data;
}

export async function fetchAutoCampaignAdminSnapshot(): Promise<{
  settings: Record<string, unknown>;
  lists: ListRow[];
}> {
  const [settingsRes, listsRes] = await Promise.all([
    fetch('/api/admin/email/auto-campaigns/settings'),
    fetch('/api/admin/email/lists'),
  ]);
  const settings = await parseAdminJson(settingsRes);
  const listsData = await parseAdminJson(listsRes);
  return {
    settings,
    lists: Array.isArray(listsData.lists) ? (listsData.lists as ListRow[]) : [],
  };
}
