import { JWT } from 'google-auth-library';

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

type ServiceAccount = {
  client_email?: string;
  private_key?: string;
};

type SearchAnalyticsRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type SearchAnalyticsResponse = {
  rows?: SearchAnalyticsRow[];
};

const parseServiceAccount = (): ServiceAccount | null => {
  const raw =
    process.env.GSC_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) return null;

  const trimmed = raw.trim();
  try {
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed) as ServiceAccount;
    }
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    return JSON.parse(decoded) as ServiceAccount;
  } catch (error) {
    console.error('[GSC] Failed to parse service account JSON:', error);
    return null;
  }
};

const getAccessToken = async (): Promise<string | null> => {
  const account = parseServiceAccount();
  if (!account?.client_email || !account?.private_key) return null;
  const auth = new JWT({
    email: account.client_email,
    key: account.private_key.replace(/\\n/g, '\n'),
    scopes: [GSC_SCOPE],
  });
  const tokenResponse = await auth.getAccessToken();
  const token =
    typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
  return token ?? null;
};

const fetchSearchAnalytics = async (params: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
}) => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('GSC service account credentials are missing.');
  }
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    params.siteUrl
  )}/searchAnalytics/query`;
  const body = {
    startDate: params.startDate,
    endDate: params.endDate,
    searchType: 'web',
    dimensions: params.dimensions,
    rowLimit: params.rowLimit,
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`[GSC] Query failed: ${response.status} ${text}`);
  }
  return (await response.json()) as SearchAnalyticsResponse;
};

const normalizeRow = (row?: SearchAnalyticsRow) => ({
  clicks: Number(row?.clicks ?? 0),
  impressions: Number(row?.impressions ?? 0),
  ctr: Number(row?.ctr ?? 0),
  position: Number(row?.position ?? 0),
});

export async function getGscOverview(params: {
  siteUrl: string;
  startDate: string;
  endDate: string;
  rowLimit?: number;
}) {
  const [totalsRes, dateRes, pageRes, queryRes] = await Promise.all([
    fetchSearchAnalytics({
      siteUrl: params.siteUrl,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
    fetchSearchAnalytics({
      siteUrl: params.siteUrl,
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: ['date'],
      rowLimit: params.rowLimit ?? 28,
    }),
    fetchSearchAnalytics({
      siteUrl: params.siteUrl,
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: ['page'],
      rowLimit: params.rowLimit ?? 10,
    }),
    fetchSearchAnalytics({
      siteUrl: params.siteUrl,
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: ['query'],
      rowLimit: params.rowLimit ?? 10,
    }),
  ]);

  const totalsRow = totalsRes.rows?.[0];
  const totals = normalizeRow(totalsRow);
  const byDate =
    dateRes.rows?.map((row) => ({
      date: row.keys?.[0] ?? '',
      ...normalizeRow(row),
    })) ?? [];
  const topPages =
    pageRes.rows?.map((row) => ({
      page: row.keys?.[0] ?? '',
      ...normalizeRow(row),
    })) ?? [];
  const topQueries =
    queryRes.rows?.map((row) => ({
      query: row.keys?.[0] ?? '',
      ...normalizeRow(row),
    })) ?? [];

  return { totals, byDate, topPages, topQueries };
}

export async function getGscTotals(params: {
  siteUrl: string;
  startDate: string;
  endDate: string;
}) {
  const totalsRes = await fetchSearchAnalytics({
    siteUrl: params.siteUrl,
    startDate: params.startDate,
    endDate: params.endDate,
  });
  return normalizeRow(totalsRes.rows?.[0]);
}
