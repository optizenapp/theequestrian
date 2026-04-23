import crypto from 'crypto';

type EmailContactSheetRow = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  shopifyCustomerId?: string | null;
  countryCode: 'AU';
  postcode?: string | null;
  acceptsMarketing: boolean;
  customerType: 'purchaser' | 'non_purchaser';
  source: string;
  createdAtIso: string;
  metadata?: Record<string, unknown>;
};

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function readSheetConfig() {
  const sheetId = process.env.GOOGLE_SHEETS_CUSTOMER_SHEET_ID?.trim() || '';
  const sheetTab = process.env.GOOGLE_SHEETS_CUSTOMER_TAB?.trim() || '';
  const serviceEmail = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL?.trim() || '';
  const privateKey = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';
  return { sheetId, sheetTab, serviceEmail, privateKey };
}

export function isCustomerSheetSyncEnabled(): boolean {
  const config = readSheetConfig();
  return !!(config.sheetId && config.sheetTab && config.serviceEmail && config.privateKey);
}

async function getGoogleSheetsAccessToken(): Promise<string> {
  const { serviceEmail, privateKey } = readSheetConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: serviceEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsignedToken).sign(privateKey, 'base64url');
  const assertion = `${unsignedToken}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Google Sheets access token: ${errorText || response.statusText}`);
  }

  const payload = (await response.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== 'string' || payload.access_token.length === 0) {
    throw new Error('Google OAuth response missing access_token');
  }

  return payload.access_token;
}

export async function appendCustomerToSheet(row: EmailContactSheetRow): Promise<void> {
  if (!isCustomerSheetSyncEnabled()) {
    return;
  }

  const { sheetId, sheetTab } = readSheetConfig();
  const accessToken = await getGoogleSheetsAccessToken();
  const range = encodeURIComponent(`${sheetTab}!A:K`);
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const values = [
    row.createdAtIso,
    row.email,
    row.firstName || '',
    row.lastName || '',
    row.shopifyCustomerId || '',
    row.countryCode,
    row.postcode || '',
    row.acceptsMarketing ? 'subscribed' : 'unsubscribed',
    row.customerType,
    row.source,
    JSON.stringify(row.metadata || {}),
  ];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append customer row to Google Sheet: ${errorText || response.statusText}`);
  }
}

export async function replaceCustomerSheetRows(rows: EmailContactSheetRow[]): Promise<void> {
  if (!isCustomerSheetSyncEnabled()) {
    return;
  }

  const { sheetId, sheetTab } = readSheetConfig();
  const accessToken = await getGoogleSheetsAccessToken();
  const clearRange = encodeURIComponent(`${sheetTab}!A:K`);
  const clearEndpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${clearRange}:clear`;
  const clearResponse = await fetch(clearEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
    cache: 'no-store',
  });
  if (!clearResponse.ok) {
    const errorText = await clearResponse.text();
    throw new Error(`Failed to clear customer sheet rows: ${errorText || clearResponse.statusText}`);
  }

  const header = [
    'created_at',
    'email',
    'first_name',
    'last_name',
    'shopify_customer_id',
    'country_code',
    'postcode',
    'subscription_status',
    'customer_type',
    'source',
    'metadata',
  ];
  await appendRows(accessToken, sheetId, sheetTab, [header]);
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).map((row) => [
      row.createdAtIso,
      row.email,
      row.firstName || '',
      row.lastName || '',
      row.shopifyCustomerId || '',
      row.countryCode,
      row.postcode || '',
      row.acceptsMarketing ? 'subscribed' : 'unsubscribed',
      row.customerType,
      row.source,
      JSON.stringify(row.metadata || {}),
    ]);
    await appendRows(accessToken, sheetId, sheetTab, chunk);
  }
}

async function appendRows(
  accessToken: string,
  sheetId: string,
  sheetTab: string,
  values: string[][]
): Promise<void> {
  const range = encodeURIComponent(`${sheetTab}!A:K`);
  const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
    cache: 'no-store',
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to append customer sheet rows: ${errorText || response.statusText}`);
  }
}
